import dayjs from 'dayjs';
import { useState } from 'react';
import { usePopover, useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import CardHeader from '@mui/material/CardHeader';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useGetBoard, deleteTask } from 'src/actions/kanban';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomPopover } from 'src/components/custom-popover';

import { KanbanDetails } from 'src/sections/kanban/details/kanban-details';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export function AnalyticsTasks({ title = "Today's Tasks", subheader, sx, ...other }) {
  const { user } = useAuthContext();
  const { board } = useGetBoard();
  const [selected, setSelected] = useState([]);
  const [completingTasks, setCompletingTasks] = useState({});

  // Get all tasks from all columns and filter for current user's tasks
  const allTasks = Object.values(board.tasks || {}).flat();
  
  const userTasks = allTasks.filter(task => {
    // Check if user is assignee or reporter
    const isAssignee = task.assignee?.some(assignee => assignee.id === user?.id);
    const isReporter = task.reporter?.id === user?.id;

    // Check if task is due today or overdue
    const dueDate = task.due?.[1] ? dayjs(task.due[1]) : null;
    const isOverdueOrToday = dueDate && (
      dueDate.isSame(dayjs(), 'day') || // Due today
      dueDate.isBefore(dayjs(), 'day')   // Overdue
    );

    return (isAssignee || isReporter) && isOverdueOrToday;
  });

  // Sort tasks: overdue first, then by priority
  const sortedTasks = userTasks.sort((a, b) => {
    const aDate = dayjs(a.due?.[1]);
    const bDate = dayjs(b.due?.[1]);
    
    // If one is overdue and other isn't
    const aOverdue = aDate.isBefore(dayjs(), 'day');
    const bOverdue = bDate.isBefore(dayjs(), 'day');
    if (aOverdue !== bOverdue) return bOverdue ? 1 : -1;
    
    // If both overdue/due today, sort by priority
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const handleClickComplete = async (taskId) => {
    try {
      // If already completing this task, return
      if (completingTasks[taskId]) return;

      // Find the task
      const task = sortedTasks.find(t => t.id === taskId);
      if (!task) return;

      // If unchecking, just update selected state
      if (selected.includes(taskId)) {
        setSelected(selected.filter((value) => value !== taskId));
        return;
      }

      // Start completing process
      setCompletingTasks(prev => ({ ...prev, [taskId]: true }));

      // Check if all subtasks are complete
      const hasIncompleteSubtasks = task.subtasks?.some(subtask => !subtask.completed);
      
      if (hasIncompleteSubtasks) {
        toast.error('Please complete all subtasks before marking the task as complete', {
          position: 'top-center',
        });
        return;
      }

      // Find the column ID for this task
      const column = board.columns.find(col => 
        col.name === task.status
      );

      if (!column) {
        throw new Error('Column not found');
      }

      // Add to selected before deletion to show checkbox as checked
      setSelected([...selected, taskId]);

      // Delete the task
      await deleteTask(column.id, task.id);
      
      toast.success('Task marked as complete!', {
        position: 'top-center',
      });

    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task', {
        position: 'top-center',
      });
      // Remove from selected if error occurs
      setSelected(selected.filter(id => id !== taskId));
    } finally {
      setCompletingTasks(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    }
  };

  return (
    <Card sx={sx} {...other}>
      <CardHeader 
        title={title} 
        subheader={subheader || `${sortedTasks.length} tasks pending`}
        sx={{ mb: 1 }} 
      />

      <Scrollbar sx={{ minHeight: 304 }}>
        <Stack divider={<Divider sx={{ borderStyle: 'dashed' }} />} sx={{ minWidth: 560 }}>
          {sortedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              selected={selected.includes(task.id)}
              completing={!!completingTasks[task.id]}
              onChange={() => handleClickComplete(task.id)}
            />
          ))}
        </Stack>
      </Scrollbar>
    </Card>
  );
}

// ----------------------------------------------------------------------

function TaskItem({ task, selected, completing, onChange, sx, ...other }) {
  const menuActions = usePopover();
  const taskDetails = useBoolean();
  const [isCompleting, setIsCompleting] = useState(false);
  const { board } = useGetBoard();

  const isOverdue = task.due?.[1] && dayjs(task.due[1]).isBefore(dayjs(), 'day');

  const handleMarkComplete = async () => {
    try {
      setIsCompleting(true);
      menuActions.onClose();
      
      // Check if all subtasks are complete
      const hasIncompleteSubtasks = task.subtasks?.some(subtask => !subtask.completed);
      
      if (hasIncompleteSubtasks) {
        toast.error('Please complete all subtasks before marking the task as complete', {
          position: 'top-center',
        });
        return;
      }

      // Find the column ID for this task
      const column = board.columns.find(col => 
        col.name === task.status
      );

      if (!column) {
        throw new Error('Column not found');
      }

      // Delete the task
      await deleteTask(column.id, task.id);
      
      toast.success('Task marked as complete!', {
        position: 'top-center',
      });

      onChange?.(); // Call the original onChange to update UI
    } catch (error) {
      console.error('Error completing task:', error);
      toast.error('Failed to complete task', {
        position: 'top-center',
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleEdit = () => {
    menuActions.onClose();
    taskDetails.onTrue();
  };

  const handleDelete = () => {
    menuActions.onClose();
    console.info('DELETE', task.id);
  };

  const handleUpdateTask = (updatedTask) => {
    console.info('Task updated:', updatedTask);
  };

  return (
    <>
      <Box
        sx={[
          () => ({
            pl: 2,
            pr: 1,
            py: 1.5,
            display: 'flex',
            ...(selected && {
              color: 'text.disabled',
              textDecoration: 'line-through',
            }),
          }),
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        <FormControlLabel
          label={
            <Box sx={{ typography: 'body2' }}>
              {task.name}
              {isOverdue && (
                <Box
                  component="span"
                  sx={{ 
                    ml: 1,
                    color: 'error.main',
                    typography: 'caption',
                  }}
                >
                  (Overdue)
                </Box>
              )}
            </Box>
          }
          control={
            <Checkbox
              disableRipple
              checked={selected}
              onChange={onChange}
              disabled={completing || isCompleting}
              inputProps={{ 'aria-label': `${task.name}-checkbox` }}
            />
          }
          sx={{ flexGrow: 1, m: 0 }}
        />

        <IconButton color={menuActions.open ? 'inherit' : 'default'} onClick={menuActions.onOpen}>
          <Iconify icon="eva:more-vertical-fill" />
        </IconButton>
      </Box>

      <CustomPopover
        open={menuActions.open}
        anchorEl={menuActions.anchorEl}
        onClose={menuActions.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem 
            onClick={handleMarkComplete}
            disabled={isCompleting}
          >
            <Iconify icon="eva:checkmark-circle-2-fill" />
            Mark complete
          </MenuItem>

          <MenuItem onClick={handleEdit}>
            <Iconify icon="solar:pen-bold" />
            Edit
          </MenuItem>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <Iconify icon="solar:trash-bin-trash-bold" />
            Delete
          </MenuItem>
        </MenuList>
      </CustomPopover>

      <KanbanDetails
        task={task}
        open={taskDetails.value}
        onClose={taskDetails.onFalse}
        onUpdateTask={handleUpdateTask}
      />
    </>
  );
}
