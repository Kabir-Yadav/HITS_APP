import dayjs from 'dayjs';
import { useSortable } from '@dnd-kit/sortable';
import { useBoolean } from 'minimal-shared/hooks';
import { useState, useEffect, useCallback } from 'react';

import { deleteTask, updateTask, updateTaskPriority } from 'src/actions/kanban';

import { toast } from 'src/components/snackbar';

import ItemBase from './item-base';
import { KanbanDetails } from '../details/kanban-details';

// ----------------------------------------------------------------------

export function KanbanTaskItem({ task, disabled, columnId, sx }) {
  const taskDetailsDialog = useBoolean();

  const { setNodeRef, listeners, isDragging, isSorting, transform, transition } = useSortable({
    id: task?.id,
  });

  const mounted = useMountStatus();
  const mountedWhileDragging = isDragging && !mounted;

  const isTaskOverdue = task.due?.[1] && dayjs(task.due[1]).isBefore(dayjs(), 'day');

  const handleDeleteTask = useCallback(async () => {
    try {
      deleteTask(columnId, task.id);
      toast.success('Delete success!', { position: 'top-center' });
    } catch (error) {
      console.error(error);
    }
  }, [columnId, task.id]);

  const handleUpdateTask = useCallback(
    async (updatedTask) => {
      try {
        if (updatedTask.priority !== task.priority) {
          await updateTaskPriority(task.id, updatedTask.priority);
        }
        // Handle other updates...
      } catch (error) {
        console.error('Error updating task:', error);
      }
    },
    [task]
  );

  const renderTaskDetailsDialog = () => (
    <KanbanDetails
      task={task}
      open={taskDetailsDialog.value}
      onClose={taskDetailsDialog.onFalse}
      onUpdateTask={handleUpdateTask}
      onDeleteTask={handleDeleteTask}
    />
  );

  return (
    <>
      <ItemBase
        ref={disabled ? undefined : setNodeRef}
        task={task}
        open={taskDetailsDialog.value}
        onClick={taskDetailsDialog.onTrue}
        stateProps={{
          transform,
          listeners,
          transition,
          sorting: isSorting,
          dragging: isDragging,
          fadeIn: mountedWhileDragging,
        }}
        sx={{
          ...(isTaskOverdue && {
            '& .MuiTypography-root': {
              color: 'error.main',
            },
          }),
          '& .MuiBox-root img': {
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'scale(1.02)',
            },
          },
          ...sx,
        }}
      />

      {renderTaskDetailsDialog()}
    </>
  );
}

// ----------------------------------------------------------------------

function useMountStatus() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 500);

    return () => clearTimeout(timeout);
  }, []);

  return isMounted;
}
