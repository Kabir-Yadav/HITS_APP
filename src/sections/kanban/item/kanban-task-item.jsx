import { useSortable } from '@dnd-kit/sortable';
import { useBoolean } from 'minimal-shared/hooks';
import { useState, useEffect, useCallback } from 'react';

import { deleteTask, updateTask } from 'src/actions/kanban';

import { toast } from 'src/components/snackbar';

import ItemBase from './item-base';
import { KanbanDetails } from '../details/kanban-details';

// ----------------------------------------------------------------------

export function KanbanTaskItem({ task, disabled, columnId, sx }) {
  const [openDetails, setOpenDetails] = useState(false);

  const { setNodeRef, listeners, isDragging, isSorting, transform, transition } = useSortable({
    id: task?.id,
  });

  const mounted = useMountStatus();
  const mountedWhileDragging = isDragging && !mounted;

  const handleOpenDetails = () => {
    setOpenDetails(true);
  };

  const handleCloseDetails = () => {
    setOpenDetails(false);
  };

  const handleDeleteTask = useCallback(async () => {
    try {
      await deleteTask(columnId, task.id);
      handleCloseDetails();
      toast.success('Delete success!');
    } catch (error) {
      console.error(error);
      toast.error('Delete failed!');
    }
  }, [columnId, task.id]);

  const handleUpdateTask = useCallback(
    async (updateData) => {
      try {
        await updateTask(columnId, {
          ...task,
          ...updateData,
        });
        toast.success('Update success!');
      } catch (error) {
        console.error(error);
        toast.error('Update failed!');
      }
    },
    [columnId, task]
  );

  const renderTaskDetailsDialog = () => {
    if (!task) return null;

    return (
      <KanbanDetails
        task={task}
        openDetails={openDetails}
        onCloseDetails={handleCloseDetails}
        onDeleteTask={handleDeleteTask}
        onUpdateTask={handleUpdateTask}
      />
    );
  };

  return (
    <>
      <ItemBase
        ref={disabled ? undefined : setNodeRef}
        task={task}
        open={openDetails}
        onClick={handleOpenDetails}
        stateProps={{
          transform,
          listeners,
          transition,
          sorting: isSorting,
          dragging: isDragging,
          fadeIn: mountedWhileDragging,
        }}
        sx={sx}
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
