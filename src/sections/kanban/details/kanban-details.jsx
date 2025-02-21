import dayjs from 'dayjs';
import { varAlpha } from 'minimal-shared/utils';
import { useState, useCallback, useEffect } from 'react';
import { useTabs, useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import FormGroup from '@mui/material/FormGroup';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { updateTaskPriority, updateTaskDescription, updateTaskDueDate, createSubtask, updateSubtask, deleteSubtask, updateTaskAssignees } from 'src/actions/kanban';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomTabs } from 'src/components/custom-tabs';
import { useDateRangePicker, CustomDateRangePicker } from 'src/components/custom-date-range-picker';

import { KanbanDetailsToolbar } from './kanban-details-toolbar';
import { KanbanInputName } from '../components/kanban-input-name';
import { KanbanDetailsPriority } from './kanban-details-priority';
import { KanbanDetailsAttachments } from './kanban-details-attachments';
import { KanbanContactsDialog } from '../components/kanban-contacts-dialog';

// ----------------------------------------------------------------------

// const SUBTASKS = [
//   'Complete project proposal',
//   'Conduct market research',
//   'Design user interface mockups',
//   'Develop backend api',
//   'Implement authentication system',
// ];

const BlockLabel = styled('span')(({ theme }) => ({
  ...theme.typography.caption,
  width: 100,
  flexShrink: 0,
  color: theme.vars.palette.text.secondary,
  fontWeight: theme.typography.fontWeightSemiBold,
}));

// ----------------------------------------------------------------------

const formatNameFromEmail = (email) => {
  if (!email) return '';
  
  try {
    // Extract the name part before @f13.tech
    const namePart = email.split('@')[0];
    // Split by dot and capitalize each part
    return namePart
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch (error) {
    console.error('Error formatting email:', error);
    return email || '';
  }
};

export function KanbanDetails({ task, open, onUpdateTask, onDeleteTask, onClose }) {
  const tabs = useTabs('overview');

  const likeToggle = useBoolean();
  const contactsDialog = useBoolean();

  const [taskName, setTaskName] = useState(task.name);
  const [priority, setPriority] = useState(task.priority);
  const [description, setDescription] = useState(task.description);
  const [isDescriptionChanged, setIsDescriptionChanged] = useState(false);
  const [subtaskCompleted, setSubtaskCompleted] = useState([]);
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [newSubtaskDialog, setNewSubtaskDialog] = useState(false);
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [editingSubtask, setEditingSubtask] = useState(null);

  const rangePicker = useDateRangePicker(
    task.due[0] ? dayjs(task.due[0]) : null,
    task.due[1] ? dayjs(task.due[1]) : null
  );

  const handleChangeTaskName = useCallback((event) => {
    setTaskName(event.target.value);
  }, []);

  const handleUpdateTask = useCallback(
    (event) => {
      try {
        if (event.key === 'Enter') {
          if (taskName) {
            onUpdateTask({ ...task, name: taskName });
          }
        }
      } catch (error) {
        console.error(error);
      }
    },
    [onUpdateTask, task, taskName]
  );

  const handleChangeTaskDescription = useCallback((event) => {
    setDescription(event.target.value);
    setIsDescriptionChanged(true);
  }, []);

  const handleSaveDescription = useCallback(async () => {
    try {
      await updateTaskDescription(task.id, description);
      setIsDescriptionChanged(false);
    } catch (error) {
      console.error('Error saving description:', error);
    }
  }, [task.id, description]);

  const handleChangePriority = useCallback(
    async (newPriority) => {
      try {
        await updateTaskPriority(task.id, newPriority);
      } catch (error) {
        console.error('Error updating priority:', error);
      }
    },
    [task.id]
  );

  const handleClickSubtaskComplete = async (subtask) => {
    try {
      await updateSubtask(subtask.id, {
        completed: !subtask.completed
      });
    } catch (error) {
      console.error('Error updating subtask completion:', error);
    }
  };

  const handleAddSubtask = async () => {
    if (newSubtaskName.trim()) {
      try {
        await createSubtask(task.id, newSubtaskName.trim());
        setNewSubtaskName('');
        setNewSubtaskDialog(false);
      } catch (error) {
        console.error('Error adding subtask:', error);
      }
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      await deleteSubtask(subtaskId);
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };

  const handleEditSubtask = (subtask) => {
    setEditingSubtask(subtask);
    setNewSubtaskName(subtask.name);
    setNewSubtaskDialog(true);
  };

  const handleUpdateSubtask = async () => {
    if (newSubtaskName.trim()) {
      try {
        await updateSubtask(editingSubtask.id, {
          name: newSubtaskName.trim()
        });
        setNewSubtaskName('');
        setEditingSubtask(null);
        setNewSubtaskDialog(false);
      } catch (error) {
        console.error('Error updating subtask:', error);
      }
    }
  };

  const handleAssignee = useCallback(async (newAssignee) => {
    try {
      await updateTaskAssignees(task.id, newAssignee);
      
      // Update the task with new assignees
      onUpdateTask({
        ...task,
        assignee: newAssignee,
      });
    } catch (error) {
      console.error('Error updating assignees:', error);
    }
  }, [onUpdateTask, task]);

  const handleUpdateStatus = useCallback((newStatus) => {
    onUpdateTask({
      ...task,
      status: newStatus,
    });
  }, [onUpdateTask, task]);

  const handleUpdateDueDate = useCallback(async () => {
    try {
      await updateTaskDueDate(
        task.id,
        rangePicker.startDate,
        rangePicker.endDate
      );
    } catch (error) {
      console.error('Error updating due date:', error);
    }
  }, [task.id, rangePicker.startDate, rangePicker.endDate]);

  // Add effect to update due date when picker closes
  useEffect(() => {
    if (!rangePicker.open && rangePicker.selected) {
      handleUpdateDueDate();
    }
  }, [rangePicker.open, rangePicker.selected, handleUpdateDueDate]);

  // Update useEffect to sync subtasks when task changes
  useEffect(() => {
    setSubtasks(task.subtasks || []);
  }, [task.subtasks]);

  const renderToolbar = () => (
    <KanbanDetailsToolbar
      task={task}
      taskName={task.name}
      taskStatus={task.status}
      onDelete={onDeleteTask}
      liked={likeToggle.value}
      onCloseDetails={onClose}
      onLikeToggle={likeToggle.onToggle}
      onUpdateStatus={handleUpdateStatus}
    />
  );

  const renderTabs = () => (
    <CustomTabs
      value={tabs.value}
      onChange={tabs.onChange}
      variant="fullWidth"
      slotProps={{ tab: { px: 0 } }}
    >
      {[
        { value: 'overview', label: 'Overview' },
        { value: 'subTasks', label: 'Subtasks' },
      ].map((tab) => (
        <Tab key={tab.value} value={tab.value} label={tab.label} />
      ))}
    </CustomTabs>
  );

  const renderTabOverview = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      {/* Task name */}
      <KanbanInputName
        placeholder="Task name"
        value={taskName}
        onChange={handleChangeTaskName}
        onKeyUp={handleUpdateTask}
        inputProps={{ id: `${taskName}-task-input` }}
      />

      {/* Reporter */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <BlockLabel>Assigned By:</BlockLabel>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2">{task.reporter.name}</Typography>
        </Box>
      </Box>

      {/* Assignee */}
      <Box sx={{ display: 'flex' }}>
        <BlockLabel sx={{ height: 32, lineHeight: '32px' }}>Assigned to:</BlockLabel>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {task.assignee.map((user, index) => {
            const formattedName = formatNameFromEmail(user.email);
            
            return (
              <Box
                key={user.id}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  typography: 'body2',
                }}
              >
                <Avatar
                  alt={formattedName}
                  src={user.avatarUrl}
                  sx={{ width: 24, height: 24 }}
                >
                  {formattedName.charAt(0)}
                </Avatar>
                <Typography variant="body2">
                  {formattedName}
                  {index < task.assignee.length - 1 && ','}
                </Typography>
              </Box>
            );
          })}

          <Tooltip title="Add assignee">
            <IconButton
              onClick={contactsDialog.onTrue}
              sx={[
                (theme) => ({
                  width: 32,
                  height: 32,
                  padding: 0,
                  minWidth: 32,
                  borderRadius: 1,
                  marginLeft: 0.5,
                  border: `dashed 1px ${theme.vars.palette.divider}`,
                  bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
                }),
              ]}
            >
              <Iconify icon="mingcute:add-line" width={16} />
            </IconButton>
          </Tooltip>

          <KanbanContactsDialog
            assignee={task.assignee}
            open={contactsDialog.value}
            onClose={contactsDialog.onFalse}
            onAssignee={handleAssignee}
          />
        </Box>
      </Box>

      {/* Due date */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <BlockLabel>Due date</BlockLabel>

        {rangePicker.selected ? (
          <Button size="small" onClick={rangePicker.onOpen}>
            {rangePicker.shortLabel}
          </Button>
        ) : (
          <Tooltip title="Add due date">
            <IconButton
              onClick={rangePicker.onOpen}
              sx={[
                (theme) => ({
                  border: `dashed 1px ${theme.vars.palette.divider}`,
                  bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
                }),
              ]}
            >
              <Iconify icon="mingcute:add-line" />
            </IconButton>
          </Tooltip>
        )}

        <CustomDateRangePicker
          variant="calendar"
          title="Choose due date"
          startDate={rangePicker.startDate}
          endDate={rangePicker.endDate}
          onChangeStartDate={rangePicker.onChangeStartDate}
          onChangeEndDate={rangePicker.onChangeEndDate}
          open={rangePicker.open}
          onClose={rangePicker.onClose}
          selected={rangePicker.selected}
          error={rangePicker.error}
        />
      </Box>

      {/* Priority */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <BlockLabel>Priority</BlockLabel>
        <KanbanDetailsPriority priority={priority} onChangePriority={handleChangePriority} />
      </Box>

      {/* Description */}
      <Stack spacing={3} sx={{ pt: 3 }}>
        <Stack spacing={1}>
          <BlockLabel>Description</BlockLabel>

          <TextField
            fullWidth
            multiline
            size="small"
            value={description}
            onChange={handleChangeTaskDescription}
            placeholder="Add description..."
          />

          {isDescriptionChanged && (
            <Box sx={{ textAlign: 'right', mt: 1 }}>
              <Button
                size="small"
                variant="contained"
                onClick={handleSaveDescription}
              >
                Save Changes
              </Button>
            </Box>
          )}
        </Stack>

        {/* Attachments */}
        <Box sx={{ display: 'flex' }}>
          <BlockLabel>Attachments</BlockLabel>
          <KanbanDetailsAttachments attachments={task.attachments} />
        </Box>
      </Stack>
    </Box>
  );

  const renderTabSubtasks = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      <div>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {subtasks.filter(subtask => subtask.completed).length} of {subtasks.length}
        </Typography>

        <LinearProgress
          variant="determinate"
          value={(subtasks.filter(subtask => subtask.completed).length / subtasks.length) * 100}
        />
      </div>

      <FormGroup>
        {subtasks.map((subtask) => (
          <Box key={subtask.id} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox
                  disableRipple
                  checked={subtask.completed}
                />
              }
              label={subtask.name}
              onChange={() => handleClickSubtaskComplete(subtask)}
              sx={{ flexGrow: 1 }}
            />
            <IconButton size="small" onClick={() => handleEditSubtask(subtask)}>
              <Iconify icon="eva:edit-fill" />
            </IconButton>
            <IconButton size="small" onClick={() => handleDeleteSubtask(subtask.id)}>
              <Iconify icon="eva:trash-2-fill" />
            </IconButton>
          </Box>
        ))}
      </FormGroup>

      <Button
        variant="outlined"
        startIcon={<Iconify icon="mingcute:add-line" />}
        sx={{ alignSelf: 'flex-start' }}
        onClick={() => {
          setEditingSubtask(null);
          setNewSubtaskName('');
          setNewSubtaskDialog(true);
        }}
      >
        Add Subtask
      </Button>

      <Dialog open={newSubtaskDialog} onClose={() => setNewSubtaskDialog(false)}>
        <DialogTitle>{editingSubtask ? 'Edit Subtask' : 'Add New Subtask'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={newSubtaskName}
            onChange={(e) => setNewSubtaskName(e.target.value)}
            placeholder="Enter subtask name"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewSubtaskDialog(false)}>Cancel</Button>
          <Button onClick={editingSubtask ? handleUpdateSubtask : handleAddSubtask}>
            {editingSubtask ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      anchor="right"
      slotProps={{ backdrop: { invisible: true } }}
      PaperProps={{ sx: { width: { xs: 1, sm: 480 } } }}
    >
      {renderToolbar()}
      {renderTabs()}

      <Scrollbar fillContent sx={{ py: 3, px: 2.5 }}>
        {tabs.value === 'overview' && renderTabOverview()}
        {tabs.value === 'subTasks' && renderTabSubtasks()}
      </Scrollbar>
    </Drawer>
  );
}
