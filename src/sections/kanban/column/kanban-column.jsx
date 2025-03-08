import { CSS } from '@dnd-kit/utilities';
import { useBoolean } from 'minimal-shared/hooks';
import React, { useCallback, useState } from 'react';
import { useSortable, defaultAnimateLayoutChanges } from '@dnd-kit/sortable';

import { createTask, clearColumn, deleteColumn, updateColumn } from 'src/actions/kanban';

import { toast } from 'src/components/snackbar';

import { useAuthContext } from 'src/auth/hooks';

import ColumnBase from './column-base';
import { KanbanTaskItem } from '../item/kanban-task-item';
import { KanbanTaskAdd } from '../components/kanban-task-add';
import { KanbanColumnToolBar } from './kanban-column-toolbar';

// ----------------------------------------------------------------------

const animateLayoutChanges = (args) => defaultAnimateLayoutChanges({ ...args, wasDragging: true });

export function KanbanColumn({ children, column, tasks, disabled, sx }) {
  const openAddTask = useBoolean();
  const [showAllTasks, setShowAllTasks] = useState(false);
  const { user } = useAuthContext();

  const { attributes, isDragging, listeners, setNodeRef, transition, active, over, transform } =
    useSortable({
      id: column.id,
      data: { type: 'container', children: tasks },
      animateLayoutChanges,
    });

  // Filter tasks based on user and showAllTasks state
  const filteredTasks = tasks.filter((task) => {
    if (showAllTasks) return true;
    
    const isAssignedToUser = task.assignee?.some((assignee) => assignee.id === user?.id);
    const isCreatedByUser = task.reporter?.id === user?.id;
    
    return isAssignedToUser || isCreatedByUser;
  });

  const tasksIds = filteredTasks.map((task) => task.id);

  const isOverContainer = over
    ? (column.id === over.id && active?.data.current?.type !== 'container') ||
      tasksIds.includes(over.id)
    : false;

  const handleUpdateColumn = useCallback(
    async (columnName) => {
      try {
        if (column.name !== columnName) {
          updateColumn(column.id, columnName);
          toast.success('Update success!', { position: 'top-center' });
        }
      } catch (error) {
        console.error(error);
      }
    },
    [column.id, column.name]
  );

  const handleClearColumn = useCallback(async () => {
    try {
      clearColumn(column.id);
    } catch (error) {
      console.error(error);
    }
  }, [column.id]);

  const handleDeleteColumn = useCallback(async () => {
    try {
      deleteColumn(column.id);
      toast.success('Delete success!', { position: 'top-center' });
    } catch (error) {
      console.error(error);
    }
  }, [column.id]);

  const handleAddTask = useCallback(
    async (taskData) => {
      try {
        createTask(column.id, taskData);
        openAddTask.onFalse();
      } catch (error) {
        console.error(error);
      }
    },
    [column.id, openAddTask]
  );

  return (
    <ColumnBase
      ref={disabled ? undefined : setNodeRef}
      style={{
        transition,
        transform: CSS.Translate.toString(transform),
      }}
      sx={sx}
      stateProps={{
        dragging: isDragging,
        overContainer: isOverContainer,
        handleProps: { ...attributes, ...listeners },
      }}
      slots={{
        header: (
          <KanbanColumnToolBar
            handleProps={{ ...attributes, ...listeners }}
            totalTasks={filteredTasks.length}
            columnName={column.name}
            onUpdateColumn={handleUpdateColumn}
            onClearColumn={handleClearColumn}
            onDeleteColumn={handleDeleteColumn}
            onToggleAddTask={openAddTask.onToggle}
            showAllTasks={showAllTasks}
            onToggleShowAll={() => setShowAllTasks(!showAllTasks)}
          />
        ),
        main: React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            // Pass filtered tasks to SortableContext
            if (child.type.name === 'SortableContext') {
              return React.cloneElement(child, {
                items: filteredTasks,
                children: filteredTasks.map(task => (
                  <KanbanTaskItem
                    key={task.id}
                    task={task}
                    columnId={column.id}
                    disabled={disabled}
                  />
                ))
              });
            }
          }
          return child;
        }),
        action: (
          <KanbanTaskAdd
            status={column.name}
            openAddTask={openAddTask.value}
            onAddTask={handleAddTask}
            onCloseAddTask={openAddTask.onFalse}
          />
        ),
      }}
    />
  );
}
