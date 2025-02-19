import { useState, useCallback, useEffect } from 'react';
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

  const menuActions = usePopover();
  const confirmDialog = useBoolean();

  // Get the current column name based on task's column_id
  const getCurrentColumnName = useCallback(() => {
    const column = board.columns?.find(col => col.id === task?.column_id);
    return column?.name || 'No Status';
  }, [board.columns, task?.column_id]);

  const [status, setStatus] = useState(getCurrentColumnName());

  // Update status when task or columns change
  useEffect(() => {
    setStatus(getCurrentColumnName());
  }, [getCurrentColumnName, task]);

  const handleChangeStatus = useCallback(
    async (newValue, targetColumnId) => {
      try {
        if (task.column_id !== targetColumnId) {
          // Move task to new column
          await moveTaskBetweenColumns(task, task.column_id, targetColumnId);
        }

        menuActions.onClose();
        setStatus(newValue);
        onUpdateStatus?.(newValue);
      } catch (error) {
        console.error('Error moving task:', error);
      }
    },
    [menuActions, onUpdateStatus, task]
  );

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'top-right' } }}
    >
      <MenuList>
        {board.columns?.map((column) => (
          <MenuItem
            key={column.id}
            selected={status === column.name}
            onClick={() => handleChangeStatus(column.name, column.id)}
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
      title="Delete"
      content={
        <>
          Are you sure want to delete <strong> {taskName} </strong>?
        </>
      }
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
          {
            display: 'flex',
            alignItems: 'center',
            p: theme.spacing(2.5, 1, 2.5, 2.5),
            borderBottom: `solid 1px ${theme.vars.palette.divider}`,
          },
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
          endIcon={<Iconify icon="eva:arrow-ios-downward-fill" width={16} sx={{ ml: 0.5 }} />}
          onClick={menuActions.onOpen}
          sx={{ 
            minWidth: 120,
            justifyContent: 'space-between',
            typography: 'body2',
            textTransform: 'capitalize',
            px: 1.5,
            '& .MuiButton-endIcon': {
              ml: 0.5,
            }
          }}
        >
          {status}
        </Button>

        <Box component="span" sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex' }}>
          <Tooltip title="Delete task">
            <IconButton onClick={confirmDialog.onTrue}>
              <Iconify icon="solar:trash-bin-trash-bold" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {renderMenuActions()}
      {renderConfirmDialog()}
    </>
  );
}
