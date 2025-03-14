import { varAlpha } from 'minimal-shared/utils';
import { useCallback, useEffect, useState } from 'react';
import { useBoolean, usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import useMediaQuery from '@mui/material/useMediaQuery';

import { useGetBoard, moveTaskBetweenColumns } from 'src/actions/kanban';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

export function KanbanDetailsToolbar({
  sx,
  task,
  liked,
  taskName,
  onDelete,
  taskStatus,
  onLikeToggle,
  onCloseDetails,
  onUpdateStatus,
  ...other
}) {
  const theme = useTheme();
  const smUp = useMediaQuery(theme.breakpoints.up('sm'));
  const { board } = useGetBoard();

  const [status, setStatus] = useState(taskStatus);
  const [isCompleting, setIsCompleting] = useState(false);

  const menuActions = usePopover();
  const confirmDialog = useBoolean();

  useEffect(() => {
    setStatus(taskStatus);
  }, [taskStatus]);

  const handleUpdateStatus = useCallback(
    async (newStatus) => {
      try {
        const targetColumn = board.columns.find((column) => column.name === newStatus);
        const sourceColumn = board.columns.find((column) => column.name === status);

        if (targetColumn && sourceColumn) {
          await moveTaskBetweenColumns(task, sourceColumn.id, targetColumn.id);
          setStatus(newStatus);
          if (onUpdateStatus) {
            onUpdateStatus(newStatus);
          }
        }
        menuActions.onClose();
      } catch (error) {
        console.error('Error updating task status:', error);
      }
    },
    [board.columns, status, task, onUpdateStatus, menuActions]
  );

  const handleMarkComplete = useCallback(async () => {
    try {
      setIsCompleting(true);
      
      // Check if all subtasks are complete
      const hasIncompleteSubtasks = task.subtasks?.some(subtask => !subtask.completed);
      
      if (hasIncompleteSubtasks) {
        toast.error('Please complete all subtasks before marking the task as complete', {
          position: 'top-center',
        });
        return;
      }

      // Find the Archive column
      const archiveColumn = board.columns.find(col => col.name === 'Archive');
      if (!archiveColumn) {
        toast.error('Archive column not found', {
          position: 'top-center',
        });
        return;
      }

      // Find the current column
      const currentColumn = board.columns.find(col => col.name === status);
      if (!currentColumn) {
        toast.error('Current column not found', {
          position: 'top-center',
        });
        return;
      }

      // Move the task to Archive column
      await moveTaskBetweenColumns(task, currentColumn.id, archiveColumn.id);
      
      toast.success('Task marked as complete and moved to Archive!', {
        position: 'top-center',
      });

      // Close the details panel
      onCloseDetails();
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task', {
        position: 'top-center',
      });
    } finally {
      setIsCompleting(false);
    }
  }, [task, board.columns, status, onCloseDetails]);

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      onClose={menuActions.onClose}
      anchorEl={menuActions.anchorEl}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: { width: 180, mt: 0.5 },
        },
      }}
    >
      <MenuList>
        {board.columns.map((column) => (
          <MenuItem
            key={column.id}
            selected={column.name === status}
            onClick={() => handleUpdateStatus(column.name)}
          >
            {column.name}
          </MenuItem>
        ))}
      </MenuList>
    </CustomPopover>
  );

  const renderConfirmDialog = () => (
    <ConfirmDialog
      open={confirmDialog.value}
      onClose={confirmDialog.onFalse}
      title="Delete Task"
      content="Are you sure want to delete this task?"
      action={
        <Button variant="contained" color="error" onClick={onDelete}>
          Delete
        </Button>
      }
    />
  );

  return (
    <>
      <Box
        sx={[
          () => ({
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderBottom: `solid 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.08)}`,
          }),
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        {!smUp && (
          <Tooltip title="Back">
            <IconButton onClick={onCloseDetails} sx={{ mr: 1 }}>
              <Iconify icon="eva:arrow-ios-back-fill" />
            </IconButton>
          </Tooltip>
        )}

        <Button
          size="small"
          variant="soft"
          endIcon={<Iconify icon="eva:arrow-ios-downward-fill" width={16} sx={{ ml: -0.5 }} />}
          onClick={menuActions.onOpen}
        >
          {status}
        </Button>

        <Box component="span" sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', gap: 1 }}>
          {status !== 'Archive' && (
            <Button
              variant="soft"
              color="success"
              disabled={isCompleting}
              onClick={handleMarkComplete}
              startIcon={<Iconify icon="eva:checkmark-circle-2-fill" />}
            >
              Mark Complete
            </Button>
          )}

          {status !== 'Archive' && (
            <Tooltip title="Delete task">
              <IconButton onClick={confirmDialog.onTrue}>
                <Iconify icon="solar:trash-bin-trash-bold" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {renderMenuActions()}
      {renderConfirmDialog()}
    </>
  );
}
