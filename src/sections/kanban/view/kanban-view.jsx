import { compareDesc } from 'date-fns';
import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSensor,
  DndContext,
  useSensors,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  closestCorners,
  KeyboardSensor,
  getFirstCollision,
  MeasuringStrategy,
} from '@dnd-kit/core';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { DashboardContent } from 'src/layouts/dashboard';
import { moveTask, moveColumn, useGetBoard, testKanbanQueries, testColumnQuery, testSupabaseConnection, moveTaskBetweenColumns } from 'src/actions/kanban';

import { EmptyContent } from 'src/components/empty-content';

import { kanbanClasses } from '../classes';
import { coordinateGetter } from '../utils';
import { KanbanColumn } from '../column/kanban-column';
import { KanbanTaskItem } from '../item/kanban-task-item';
import { KanbanColumnAdd } from '../column/kanban-column-add';
import { KanbanColumnSkeleton } from '../components/kanban-skeleton';
import { KanbanDragOverlay } from '../components/kanban-drag-overlay';

// ----------------------------------------------------------------------

const PLACEHOLDER_ID = 'placeholder';

const cssVars = {
  '--item-gap': '16px',
  '--item-radius': '12px',
  '--column-gap': '24px',
  '--column-width': '336px',
  '--column-radius': '16px',
  '--column-padding': '20px 16px 16px 16px',
};

// ----------------------------------------------------------------------

const priorityOrder = {
  high: 1,
  medium: 2,
  low: 3,
};

const sortTasks = (tasks) => [...tasks].sort((a, b) => {
  const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
  if (priorityDiff !== 0) return priorityDiff;
  return compareDesc(new Date(a.due[0]), new Date(b.due[0]));
});

export function KanbanView() {
  const { board, boardLoading, boardEmpty } = useGetBoard();

  const recentlyMovedToNewContainer = useRef(false);
  const lastOverId = useRef(null);

  const [columnFixed, setColumnFixed] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const sortedBoard = useMemo(() => {
    if (!board.tasks) return { tasks: {}, columns: [] };

    const sortedTasks = {};
    Object.keys(board.tasks).forEach((columnId) => {
      sortedTasks[columnId] = sortTasks(board.tasks[columnId]);
    });

    return {
      ...board,
      tasks: sortedTasks,
    };
  }, [board]);

  const columnIds = sortedBoard.columns.map((column) => column.id);

  const isSortingContainer = activeId != null ? columnIds.includes(activeId) : false;

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 3 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter })
  );

  const findColumn = (id) => {
    // First check if the id is a column id
    if (sortedBoard.columns.some(col => col.id === id)) {
      return id;
    }

    // Then check which column contains the task
    return Object.keys(sortedBoard.tasks).find((columnId) =>
      sortedBoard.tasks[columnId].some(task => task.id === id)
    );
  };

  const collisionDetectionStrategy = useCallback(
    (args) => {
      // If dragging a column
      if (activeId && sortedBoard.columns.some(col => col.id === activeId)) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(container => 
            sortedBoard.columns.some(col => col.id === container.id)
          ),
        });
      }

      // If dragging a task
      if (activeId) {
        const activeColumn = findColumn(activeId);
        if (activeColumn) {
          const intersections = pointerWithin(args);
          const overId = getFirstCollision(intersections, 'id');

          if (overId) {
            // If hovering over a column directly
            if (sortedBoard.columns.some(col => col.id === overId)) {
              return [{ id: overId }];
            }

            // If hovering over another task, find its column
            const overColumn = findColumn(overId);
            if (overColumn) {
              return [{ id: overId }];
            }
          }
        }
      }

      // Default collision detection
      const pointerIntersections = pointerWithin(args);
      const centerCollisions = closestCenter(args);
      
      return pointerIntersections.length > 0 ? pointerIntersections : centerCollisions;
    },
    [activeId, sortedBoard.columns, sortedBoard.tasks]
  );

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, []);

  useEffect(() => {
    testKanbanQueries();
  }, []);

  useEffect(() => {
    testColumnQuery();
  }, []);

  useEffect(() => {
    testSupabaseConnection().then(isConnected => {
      if (!isConnected) {
        console.error('Failed to connect to Supabase');
      }
    });
  }, []);

  /**
   * onDragStart
   */
  const onDragStart = ({ active }) => {
    setActiveId(active.id);
  };

  /**
   * onDragOver
   */
  const onDragOver = ({ active, over }) => {
    if (!over) return;

    const draggedItemId = active.id;
    const overId = over.id;

    // Return if dragging a column
    if (sortedBoard.columns.some(col => col.id === draggedItemId)) {
      return;
    }

    const activeColumn = findColumn(draggedItemId);
    const overColumn = findColumn(overId);

    if (!activeColumn || !overColumn) {
      return;
    }

    if (activeColumn !== overColumn) {
      const activeItems = sortedBoard.tasks[activeColumn];
      const overItems = sortedBoard.tasks[overColumn];
      
      const activeIndex = activeItems.findIndex(task => task.id === draggedItemId);
      const overIndex = overItems.findIndex(task => task.id === overId);

      let newIndex;

      if (sortedBoard.columns.some(col => col.id === overId)) {
        // If dropping directly onto a column, add to the end
        newIndex = overItems.length;
      } else {
        // If dropping onto another task, insert at that position
        newIndex = overIndex >= 0 ? overIndex : overItems.length;
      }

      const updatedTasks = {
        ...sortedBoard.tasks,
        [activeColumn]: activeItems.filter(task => task.id !== draggedItemId),
        [overColumn]: [
          ...overItems.slice(0, newIndex),
          activeItems[activeIndex],
          ...overItems.slice(newIndex),
        ],
      };

      // Sort tasks in the target column
      updatedTasks[overColumn] = sortTasks(updatedTasks[overColumn]);

      moveTask(updatedTasks);
    }
  };

  /**
   * onDragEnd
   */
  const onDragEnd = async ({ active, over }) => {
    if (!over) {
      setActiveId(null);
      return;
    }

    if (active.id in sortedBoard.tasks && over?.id) {
      const activeIndex = columnIds.indexOf(active.id);
      const overIndex = columnIds.indexOf(over.id);
      const updateColumns = arrayMove(sortedBoard.columns, activeIndex, overIndex);

      moveColumn(updateColumns);
      setActiveId(null);
      return;
    }

    const activeColumn = findColumn(active.id);
    const overColumn = findColumn(over.id);

    if (!activeColumn || !overColumn) {
      setActiveId(null);
      return;
    }

    // If dropping in a different column
    if (activeColumn !== overColumn) {
      const activeTask = sortedBoard.tasks[activeColumn].find(task => task.id === active.id);
      if (activeTask) {
        try {
          // Move the task to the new column
          await moveTaskBetweenColumns(activeTask, activeColumn, overColumn);
        } catch (error) {
          console.error('Error moving task between columns:', error);
        }
      }
    } else {
      // If dropping in the same column, just reorder
      const activeContainerTaskIds = sortedBoard.tasks[activeColumn].map((task) => task.id);
      const overContainerTaskIds = sortedBoard.tasks[overColumn].map((task) => task.id);

      const activeIndex = activeContainerTaskIds.indexOf(active.id);
      const overIndex = overContainerTaskIds.indexOf(over.id);

      if (activeIndex !== overIndex) {
        const updateTasks = {
          ...sortedBoard.tasks,
          [overColumn]: arrayMove(sortedBoard.tasks[overColumn], activeIndex, overIndex),
        };

        updateTasks[overColumn] = sortTasks(updateTasks[overColumn]);
        moveTask(updateTasks);
      }
    }

    setActiveId(null);
  };

  const renderLoading = () => (
    <Box sx={{ gap: 'var(--column-gap)', display: 'flex', alignItems: 'flex-start' }}>
      <KanbanColumnSkeleton />
    </Box>
  );

  const renderEmpty = () => <EmptyContent filled sx={{ py: 10, maxHeight: { md: 480 } }} />;

  const renderList = () => (
    <DndContext
      id="dnd-kanban"
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <Stack sx={{ flex: '1 1 auto', overflowX: 'auto' }}>
        <Stack
          sx={{
            pb: 3,
            display: 'unset',
            ...(columnFixed && { minHeight: 0, display: 'flex', flex: '1 1 auto' }),
          }}
        >
          <Box
            sx={[
              (theme) => ({
                display: 'flex',
                gap: 'var(--column-gap)',
                ...(columnFixed && {
                  minHeight: 0,
                  flex: '1 1 auto',
                  [`& .${kanbanClasses.columnList}`]: {
                    ...theme.mixins.hideScrollY,
                    flex: '1 1 auto',
                  },
                }),
              }),
            ]}
          >
            <SortableContext
              items={[...columnIds, PLACEHOLDER_ID]}
              strategy={horizontalListSortingStrategy}
            >
              {sortedBoard.columns.map((column) => (
                <KanbanColumn key={column.id} column={column} tasks={sortedBoard.tasks[column.id]}>
                  <SortableContext
                    items={sortedBoard.tasks[column.id]}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedBoard.tasks[column.id].map((task) => (
                      <KanbanTaskItem
                        key={task.id}
                        task={task}
                        columnId={column.id}
                        disabled={isSortingContainer}
                      />
                    ))}
                  </SortableContext>
                </KanbanColumn>
              ))}

              <KanbanColumnAdd id={PLACEHOLDER_ID} />
            </SortableContext>
          </Box>
        </Stack>
      </Stack>

      <KanbanDragOverlay
        columns={sortedBoard.columns}
        tasks={sortedBoard.tasks}
        activeId={activeId}
        sx={cssVars}
      />
    </DndContext>
  );

  return (
    <DashboardContent
      maxWidth={false}
      sx={{
        ...cssVars,
        pb: 0,
        pl: { sm: 3 },
        pr: { sm: 0 },
        flex: '1 1 0',
        display: 'flex',
        overflow: 'hidden',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          pr: { sm: 3 },
          mb: { xs: 3, md: 5 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h4">Kanban</Typography>

        <FormControlLabel
          label="Fixed column"
          labelPlacement="start"
          control={
            <Switch
              checked={columnFixed}
              onChange={(event) => {
                setColumnFixed(event.target.checked);
              }}
              inputProps={{ id: 'fixed-column-switch' }}
            />
          }
        />
      </Box>

      {boardLoading ? renderLoading() : <>{boardEmpty ? renderEmpty() : renderList()}</>}
    </DashboardContent>
  );
}
