import { uuidv4 } from 'minimal-shared/utils';
import { useMemo, useState, useCallback } from 'react';

import Paper from '@mui/material/Paper';
import FormHelperText from '@mui/material/FormHelperText';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import InputBase, { inputBaseClasses } from '@mui/material/InputBase';

import { fAdd, today } from 'src/utils/format-time';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export function KanbanTaskAdd({ status, openAddTask, onAddTask, onCloseAddTask }) {
  const [taskName, setTaskName] = useState('');
  const { user } = useAuthContext();

  const defaultTask = useMemo(
    () => ({
      id: uuidv4(),
      name: taskName.trim() ? taskName : 'Untitled',
      priority: 'medium',
      attachments: [],
      assignee: [],
      due: [today(), fAdd({ days: 1 })],
      reporter: {
        id: user?.id,
        name: user?.displayName || user?.email,
        avatarUrl: user?.photoURL,
      },
    }),
    [taskName, user]
  );

  const handleChangeName = useCallback((event) => {
    setTaskName(event.target.value);
  }, []);

  const handleCreateTask = useCallback(async () => {
    try {
      if (onAddTask) {
        await onAddTask(defaultTask);
      }
      setTaskName('');
      onCloseAddTask();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  }, [defaultTask, onAddTask, onCloseAddTask]);

  const handleKeyUpAddTask = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        handleCreateTask();
      }
    },
    [handleCreateTask]
  );

  if (!openAddTask) {
    return null;
  }

  return (
    <ClickAwayListener onClickAway={onCloseAddTask}>
      <div>
        <Paper
          sx={[
            (theme) => ({
              borderRadius: 1.5,
              bgcolor: 'background.default',
              boxShadow: theme.vars.customShadows.z1,
            }),
          ]}
        >
          <InputBase
            autoFocus
            fullWidth
            placeholder="Untitled"
            value={taskName}
            onChange={handleChangeName}
            onKeyUp={handleKeyUpAddTask}
            sx={{
              px: 2,
              height: 56,
              [`& .${inputBaseClasses.input}`]: { p: 0, typography: 'subtitle2' },
            }}
          />
        </Paper>

        <FormHelperText sx={{ mx: 1 }}>Press Enter to create the task.</FormHelperText>
      </div>
    </ClickAwayListener>
  );
}
