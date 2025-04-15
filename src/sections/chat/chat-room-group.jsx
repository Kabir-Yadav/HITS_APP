import { useForm, FormProvider } from 'react-hook-form';
import { useState, useCallback, useEffect } from 'react';
import { useBoolean, usePopover } from 'minimal-shared/hooks';

import Badge from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';
import Collapse from '@mui/material/Collapse';
import LoadingButton from '@mui/lab/LoadingButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import {
  Box,
  IconButton,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Autocomplete,
  TextField,
} from '@mui/material';

import { fData } from 'src/utils/format-number';

import { supabase } from 'src/lib/supabase';
import { useGetAllUsers } from 'src/actions/users';
import { addUsersToGroup } from 'src/actions/chat';

import { Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { useMockedUser } from 'src/auth/hooks';

import { CollapseButton } from './styles';
import { ChatRoomParticipantDialog } from './chat-room-participant-dialog';

// ----------------------------------------------------------------------

export function ChatRoomGroup({ participants, groupId }) {
  const collapse = useBoolean(true);

  const [selected, setSelected] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  // Group info from database
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const { data: allUsers = [] } = useGetAllUsers();
  const { user } = useMockedUser();
  const [invitedUsers, setInvitedUsers] = useState([]);

  // State for the "selected user" from the autocomplete
  const [selectedUser, setSelectedUser] = useState(null);

  const filteredUsers = allUsers.filter(
    (u) =>
      u.id !== user.id &&
      !participants.some((p) => p.id === u.id) &&
      !invitedUsers.some((inv) => inv.id === u.id)
  );

  const defaultValues = {
    groupName: '',
    avatarUrl: null, // Will store the File object (if user uploads) or string URL
  };

  const methods = useForm({
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    setValue,
  } = methods;

  // Fetch group details on mount or when groupId changes
  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('groups')
          .select('group_name, group_icon')
          .eq('conversation_id', groupId)
          .single();

        if (error) {
          console.error('Error fetching group details:', error);
          return;
        }

        // Save in local state
        setGroupName(data.group_name || '');
        setGroupImage(data.group_icon || '');

        // Also pre-fill form fields
        setValue('groupName', data.group_name || '');
        setValue('avatarUrl', data.group_icon || '');
      } catch (err) {
        console.error('Error fetching group details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (groupId) {
      fetchGroupDetails();
    }
  }, [groupId, setValue]);

  // Participant list selection / closing
  const handleOpen = useCallback((participant) => {
    setSelected(participant);
  }, []);

  const handleClose = useCallback(() => {
    setSelected(null);
  }, []);

  // Edit dialog open / close
  const handleEditDialogOpen = () => {
    setIsEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
  };

  const handleInviteDialogOpen = () => {
    setIsInviteDialogOpen(true);
  };

  const handleInviteDialogClose = () => {
    setIsInviteDialogOpen(false);
    setInvitedUsers([]);
  };

  const handleUserSelect = (event, newValue) => {
    if (newValue) {
      setInvitedUsers((prev) => [...prev, newValue]);
    }
    setSelectedUser(null);
  };

  // Invite handler: You can call your invite action with invitedUsers here.
  const handleInvite = async () => {
    if (invitedUsers.length === 0) return;
    try {
      const result = await addUsersToGroup(groupId, invitedUsers);
      if (!result) {
        throw new Error("Unable to add users to group; no data returned.");
      }
    } catch (error) {
      console.error(error);
    }
    setInvitedUsers([]);
    handleInviteDialogClose();
  };
  
  // Submit updated group name + avatar
  const onSubmit = handleSubmit(async (data) => {
    try {
      // 1) If user uploaded a new avatar (File object), upload it
      let newAvatarUrl = groupImage;

      if (data.avatarUrl && typeof data.avatarUrl !== 'string') {
        const file = data.avatarUrl;
        const fileExt = file.name.split('.').pop();
        const filePath = `group-avatars/${Date.now()}.${fileExt}`;

        // Upload new file
        const { error: uploadError } = await supabase.storage
          .from('group-avatar')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        // Fetch public URL of the newly uploaded avatar
        const { data: fileData } = supabase.storage.from('group-avatar').getPublicUrl(filePath);

        if (fileData?.publicUrl) {
          newAvatarUrl = fileData.publicUrl;
        }
      }

      // 2) Update group details in DB
      const { error: updateError } = await supabase
        .from('groups')
        .update({
          group_name: data.groupName,
          group_icon: newAvatarUrl,
        })
        .eq('conversation_id', groupId);

      if (updateError) {
        throw updateError;
      }

      // Locally update display (so the info panel updates to new values)
      setGroupName(data.groupName);
      setGroupImage(newAvatarUrl);

      // Close dialog
      setIsEditDialogOpen(false);
      console.log('Group details updated successfully');
    } catch (err) {
      console.error('Error saving group details:', err);
    }
  });

  // Count participants
  const totalParticipants = participants.length;
  const menuActions = usePopover();

  // Render the group info up top
  const renderInfo = () => (
    <Box sx={{ position: 'relative', pb: 3, pt: 5 }}>
      <IconButton
        color={menuActions.open ? 'inherit' : 'default'}
        onClick={handleEditDialogOpen}
        sx={{ position: 'absolute', top: '10%', right: 8 }}
      >
        <Iconify icon="solar:pen-new-square-bold" />
      </IconButton>

      <Stack alignItems="center">
        {groupImage ? (
          <Avatar alt={groupName} src={groupImage} sx={{ width: 96, height: 96, mb: 2 }} />
        ) : (
          <Box
            sx={{
              width: 96,
              height: 96,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
            }}
          >
            <Iconify icon="solar:users-group-two-rounded-bold-duotone" width={96} height={96} />
          </Box>
        )}
        <Typography variant="subtitle1">{groupName}</Typography>
      </Stack>
    </Box>
  );
  // Render the participant list
  const renderList = () => (
    <>
      {participants.map((participant) => (
        <ListItemButton key={participant.id} onClick={() => handleOpen(participant)}>
          <Badge variant={participant.status} badgeContent="">
            <Avatar alt={participant.name} src={participant.avatarUrl} />
          </Badge>

          <ListItemText
            primary={participant.name}
            secondary={participant.role}
            slotProps={{
              primary: { noWrap: true },
              secondary: { noWrap: true, sx: { typography: 'caption' } },
            }}
            sx={{ ml: 2 }}
          />
        </ListItemButton>
      ))}
    </>
  );

  return (
    <>
      {renderInfo()}
      <CollapseButton
        selected={collapse.value}
        disabled={!totalParticipants}
        onClick={collapse.onToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {`In room (${totalParticipants})`}
        <Box sx={{ ml: 'auto', mr: 1 }}>
          <IconButton onClick={handleInviteDialogOpen}>
            <Iconify icon="solar:user-plus-rounded-bold" />
          </IconButton>
        </Box>
      </CollapseButton>

      <Collapse in={collapse.value}>{renderList()}</Collapse>

      {selected && (
        <ChatRoomParticipantDialog participant={selected} open={!!selected} onClose={handleClose} />
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onClose={handleEditDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>Edit Group</DialogTitle>

        {/* Use FormProvider so Field components work */}
        <FormProvider {...methods}>
          <form onSubmit={onSubmit}>
            <DialogContent>
              <Stack spacing={3}>
                <Field.UploadAvatar
                  name="avatarUrl"
                  label="Group Avatar"
                  maxSize={3145728}
                  helperText={
                    <Typography
                      variant="caption"
                      sx={{
                        mt: 3,
                        mx: 'auto',
                        display: 'block',
                        textAlign: 'center',
                        color: 'text.disabled',
                      }}
                    >
                      Allowed *.jpeg, *.jpg, *.png, *.gif
                      <br /> max size of {fData(3145728)}
                    </Typography>
                  }
                />

                <Field.Text name="groupName" label="Group Name" placeholder="Enter group name..." />
              </Stack>
            </DialogContent>

            <DialogActions>
              <Button onClick={handleEditDialogClose} color="inherit">
                Cancel
              </Button>

              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                Save Changes
              </LoadingButton>
            </DialogActions>
          </form>
        </FormProvider>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onClose={handleInviteDialogClose} fullWidth maxWidth="xs">
        <DialogTitle>Invite Users</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={filteredUsers}
            getOptionLabel={(option) => option.email || 'Unnamed'}
            value={selectedUser}
            onChange={handleUserSelect}
            renderOption={(props, option) => {
              const { key, ...optionProps } = props;
              return (
                <Box
                  key={key}
                  component="li"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1,
                    width: '100%',
                  }}
                  {...optionProps}
                >
                  {/* Avatar */}
                  <Avatar
                    src={option.avatar_url}
                    alt={option.full_name}
                    sx={{ width: 40, height: 40 }}
                  />

                  {/* Name & Email */}
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ fontWeight: 'bold', fontSize: '1rem' }}>{option.full_name}</Box>
                    <Box sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>{option.email}</Box>
                  </Box>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search user by name"
                placeholder="Select user"
                fullWidth
                sx={{ mb: 2 }}
              />
            )}
          />
          {invitedUsers.length > 0 && (
            <Scrollbar sx={{ maxHeight: 200, mb: 2 }}>
              <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                {invitedUsers.map((person) => (
                  <Box component="li" sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                    <Avatar alt={person.full_name} src={person.avatar_url} sx={{ mr: 2 }} />

                    <ListItemText
                      primary={person.full_name}
                      sx={{ flexGrow: 1, pr: 1 }}
                      slotProps={{
                        primary: { noWrap: true },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Scrollbar>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <Button variant="outlined" onClick={handleInviteDialogClose} color="inherit">
            Close
          </Button>
          <Button variant="contained" disabled={invitedUsers.length === 0} onClick={handleInvite}>
            Invite
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
