import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import { Autocomplete, Avatar, MenuItem } from '@mui/material';

import { useGetAllUsers } from 'src/actions/users';
import { shareFile } from 'src/actions/filemanager';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { FileManagerInvitedItem } from './file-manager-invited-item';

// ----------------------------------------------------------------------

export function FileManagerShareDialog({
  open,
  shared = [],
  onClose,
  onCopyLink,
  inviteEmail,
  onChangeInvite,
  fileId,
  ownerId,
  ...other
}) {
  const hasShared = shared && !!shared.length;
  const { data: allUsers = [] } = useGetAllUsers();
  // State for the "selected user" from the autocomplete
  const [selectedUser, setSelectedUser] = useState(null);

  // State for the chosen permission e.g. 'view' or 'edit'
  const [accessType, setAccessType] = useState('view');
  useEffect(() => {
    if (!open) {
      setSelectedUser(null);
      setAccessType('view');
    }
  }, [open]);

  const handleShare = async () => {
    if (!selectedUser) {
      toast.error('No user selected');
      return;
    }
    try {
      console.log(ownerId, fileId);
      const result = await shareFile(ownerId, fileId, selectedUser.id, accessType);
      if (!result.success) {
        toast.error('Failed to share file');
      } else {
        toast.success('File shared successfully!');
        // Optionally re-fetch the file list or data
        // mutate(['get_files', ownerId]);
        onClose();
      }
    } catch (error) {
      toast.error('Error sharing file');
      console.error(error);
    }
  };

  const handleChangeAccessType = (e) => {
    setAccessType(e.target.value);
  };
  return (
    <Dialog fullWidth maxWidth="xs" open={open} onClose={onClose} {...other}>
      <DialogTitle> Share File </DialogTitle>

      <Box sx={{ px: 3, py: 2 }}>
        <Autocomplete
          options={allUsers}
          getOptionLabel={(option) => option.email || 'Unnamed'}
          value={selectedUser}
          onChange={(event, newValue) => {
            setSelectedUser(newValue);
          }}
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

        <TextField
          select
          label="Permission"
          value={accessType}
          onChange={handleChangeAccessType}
          fullWidth
          sx={{ mb: 2 }}
        >
          <MenuItem value="view">View</MenuItem>
          <MenuItem value="edit">Edit</MenuItem>
        </TextField>
      </Box>

      {/* Currently Shared */}
      {shared.length > 0 && (
        <Scrollbar sx={{ height: 240, px: 3 }}>
          <Box component="ul">
            {shared.map((person) => (
              <FileManagerInvitedItem key={person.id} person={person} />
            ))}
          </Box>
        </Scrollbar>
      )}

      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* If you want to implement Copy Link */}
          <Button startIcon={<Iconify icon="eva:link-2-fill" />} onClick={onCopyLink}>
            Copy Link
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={onClose}>
            Close
          </Button>
          <Button variant="contained" disabled={!selectedUser} onClick={handleShare}>
            Share
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
