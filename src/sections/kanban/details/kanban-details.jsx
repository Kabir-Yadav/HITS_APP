import dayjs from 'dayjs';
import { toast } from 'react-hot-toast';
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
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

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

export function KanbanDetails({ task, openDetails, onCloseDetails, onUpdateTask, onDeleteTask }) {
  const [name, setName] = useState(task?.name || '');
  const [status, setStatus] = useState(task?.status || '');
  const [priority, setPriority] = useState(task?.priority || 'medium');
  const [description, setDescription] = useState(task?.description || '');
  const [isDescriptionChanged, setIsDescriptionChanged] = useState(false);
  const [assignee, setAssignee] = useState(task?.assignees?.map(a => a.user) || []);
  const [due, setDue] = useState(task?.due_date ? [new Date(task?.due_date)] : []);
  const [attachments, setAttachments] = useState(task?.attachments || []);
  const [saving, setSaving] = useState(false);

  const [liked, setLiked] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [openDateRange, setOpenDateRange] = useState(false);
  const [openContacts, setOpenContacts] = useState(false);
  const [newSubtaskDialog, setNewSubtaskDialog] = useState(false);
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [subtasks, setSubtasks] = useState([]);

  const dateRange = useDateRangePicker(due);
  const tabs = useTabs('overview');

  useEffect(() => {
    if (task) {
      setName(task.name || '');
      setStatus(task.status || '');
      setPriority(task.priority || 'medium');
      setDescription(task.description || '');
      setIsDescriptionChanged(false);
      setAssignee(task.assignees?.map(a => a.user) || []);
      setDue(task.due_date ? [new Date(task.due_date)] : []);
      setAttachments(task.attachments || []);
    }
  }, [task]);

  const likeToggle = useBoolean();
  const contactsDialog = useBoolean();

  const handleChangeTaskName = useCallback((event) => {
    setName(event.target.value);
  }, []);

  const handleUpdateTask = useCallback(
    (event) => {
      try {
        if (event.key === 'Enter') {
          if (name) {
            onUpdateTask({ ...task, name: name });
          }
        }
      } catch (error) {
        console.error(error);
      }
    },
    [onUpdateTask, task, name]
  );

  const handleDescriptionChange = (e) => {
    const newDescription = e.target.value;
    setDescription(newDescription);
    setIsDescriptionChanged(newDescription !== task?.description);
  };

  const handleSaveDescription = async () => {
    try {
      setSaving(true);
      await onUpdateTask({
        ...task,
        description,
      });
      setIsDescriptionChanged(false);
      toast.success('Description updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update description');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeTaskDescription = useCallback((event) => {
    setDescription(event.target.value);
  }, []);

  const handleChangePriority = useCallback((newValue) => {
    setPriority(newValue);
    onUpdateTask({
      ...task,
      priority: newValue,
    });
  }, [onUpdateTask, task]);

  const handleClickSubtaskComplete = (taskId) => {
    const selected = completed.includes(taskId)
      ? completed.filter((value) => value !== taskId)
      : [...completed, taskId];

    setCompleted(selected);
  };

  const handleAddSubtask = () => {
    if (newSubtaskName.trim()) {
      setSubtasks([...subtasks, newSubtaskName.trim()]);
      setNewSubtaskName('');
      setNewSubtaskDialog(false);
    }
  };

  const handleDeleteSubtask = (taskToDelete) => {
    setSubtasks(subtasks.filter((subtask) => subtask !== taskToDelete));
    setCompleted(completed.filter((subtask) => subtask !== taskToDelete));
  };

  const handleEditSubtask = (taskToEdit) => {
    setEditingSubtask(taskToEdit);
    setNewSubtaskName(taskToEdit);
    setNewSubtaskDialog(true);
  };

  const handleUpdateSubtask = () => {
    if (newSubtaskName.trim()) {
      setSubtasks(
        subtasks.map((subtask) => (subtask === editingSubtask ? newSubtaskName.trim() : subtask))
      );
      setNewSubtaskName('');
      setEditingSubtask(null);
      setNewSubtaskDialog(false);
    }
  };

  const handleAssignee = useCallback((newAssignee) => {
    // Update the task with new assignees
    onUpdateTask({
      ...task,
      assignee: newAssignee,
    });
  }, [onUpdateTask, task]);

  const handleUpdateStatus = useCallback((newStatus) => {
    onUpdateTask({
      ...task,
      status: newStatus,
    });
  }, [onUpdateTask, task]);

  const handleSaveDueDate = async (newDate) => {
    try {
      setSaving(true);
      await onUpdateTask({
        ...task,
        due_date: newDate,
      });
      setDue([newDate]);
      toast.success('Due date updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update due date');
    } finally {
      setSaving(false);
    }
  };

  const renderToolbar = () => (
    <KanbanDetailsToolbar
      task={task}
      taskName={name}
      taskStatus={status}
      onDelete={onDeleteTask}
      liked={likeToggle.value}
      onCloseDetails={onCloseDetails}
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
    <Stack spacing={3}>
      <Stack spacing={1.5}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2">Description</Typography>
          {isDescriptionChanged && (
            <LoadingButton
              size="small"
              loading={saving}
              variant="contained"
              onClick={handleSaveDescription}
              startIcon={<Iconify icon="eva:save-fill" />}
              sx={{ px: 2, py: 0.5 }}
            >
              Save
            </LoadingButton>
          )}
        </Box>
        <TextField
          fullWidth
          multiline
          rows={3}
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Add a description..."
          sx={{
            '& .MuiInputBase-root': {
              bgcolor: 'background.neutral',
            },
          }}
        />
      </Stack>

      <Stack spacing={1.5}>
        <Typography variant="subtitle2">Due Date</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <CustomDateRangePicker
            open={openDateRange}
            startDate={due[0]}
            onChangeStartDate={(newValue) => {
              handleSaveDueDate(newValue);
            }}
            onClose={() => setOpenDateRange(false)}
          />
          <Button 
            variant="outlined"
            onClick={() => setOpenDateRange(true)}
            startIcon={<Iconify icon="solar:calendar-bold-duotone" />}
          >
            {due[0] ? dayjs(due[0]).format('dd MMM yyyy') : 'Set Due Date'}
          </Button>
        </Box>
      </Stack>

      <Stack spacing={1.5}>
        <Typography variant="subtitle2">Priority</Typography>
        <KanbanDetailsPriority priority={priority} onChangePriority={setPriority} />
      </Stack>

      <Stack spacing={1.5}>
        <Typography variant="subtitle2">Assignee</Typography>
        <Stack direction="row" flexWrap="wrap" alignItems="center" spacing={1}>
          {assignee.map((person) => (
            <Avatar key={person.id} alt={person.name} src={person.avatar_url} />
          ))}
          <Tooltip title="Add assignee">
            <IconButton
              onClick={() => setOpenContacts(true)}
              sx={{
                bgcolor: (theme) => varAlpha(theme.vars.palette.grey['500Channel'], 0.08),
                border: (theme) => `dashed 1px ${theme.vars.palette.grey['500Channel']}`,
              }}
            >
              <Iconify icon="mingcute:add-line" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack spacing={1.5}>
        <Typography variant="subtitle2">Attachments</Typography>
        <KanbanDetailsAttachments taskId={task?.id} attachments={attachments} />
      </Stack>
    </Stack>
  );

  const renderTabSubtasks = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      <div>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {completed.length} of {subtasks.length}
        </Typography>

        <LinearProgress
          variant="determinate"
          value={(completed.length / subtasks.length) * 100}
        />
      </div>

      <FormGroup>
        {subtasks.map((taskItem) => (
          <Box key={taskItem} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Checkbox
                  disableRipple
                  name={taskItem}
                  checked={completed.includes(taskItem)}
                />
              }
              label={taskItem}
              onChange={() => handleClickSubtaskComplete(taskItem)}
              sx={{ flexGrow: 1 }}
            />
            <IconButton size="small" onClick={() => handleEditSubtask(taskItem)}>
              <Iconify icon="eva:edit-fill" />
            </IconButton>
            <IconButton size="small" onClick={() => handleDeleteSubtask(taskItem)}>
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
      open={openDetails}
      onClose={onCloseDetails}
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
