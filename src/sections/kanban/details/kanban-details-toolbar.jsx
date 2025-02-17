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

  const [status, setStatus] = useState(taskStatus);

  useEffect(() => {
    setStatus(taskStatus);
  }, [taskStatus]);

  const handleChangeStatus = useCallback(
    async (newValue, targetColumnId) => {
      try {
        // Find current column ID
        const sourceColumnId = Object.keys(board.tasks).find(columnId =>
          board.tasks[columnId].some(t => t.id === task.id)
        );

        if (sourceColumnId && sourceColumnId !== targetColumnId) {
          // Move task to new column
          await moveTaskBetweenColumns(task, sourceColumnId, targetColumnId);
        }

        menuActions.onClose();
        setStatus(newValue);
        onUpdateStatus?.(newValue);
      } catch (error) {
        console.error('Error moving task:', error);
      }
    },
    [menuActions, onUpdateStatus, task, board.tasks]
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
          endIcon={<Iconify icon="eva:arrow-ios-downward-fill" width={16} sx={{ ml: -0.5 }} />}
          onClick={menuActions.onOpen}
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
