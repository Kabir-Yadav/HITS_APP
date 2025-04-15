import { useState, useCallback } from 'react';
import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';
import { svgIconClasses } from '@mui/material/SvgIcon';
import Badge, { badgeClasses } from '@mui/material/Badge';
import InputBase, { inputBaseClasses } from '@mui/material/InputBase';

import { supabase } from 'src/lib/supabase';

import { Iconify } from 'src/components/iconify';
import { CustomPopover } from 'src/components/custom-popover';

import { useMockedUser } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export function ChatNavAccount() {
  const { user } = useMockedUser();
  const updateUserStatus = useCallback(async (userId, status) => {
      try {
        console.log('Updating user status:', { userId, status });
  
        const { data, error } = await supabase
        .from('user_info') // Ensure this table exists
        .update({ status }) // Update the status field
        .eq('id', userId); // Match the user by ID
  
  
        if (error) {
          console.error('Error updating user status:', error);
        } else {
          console.log('User status updated successfully:', data);
        }
      } catch (err) {
        console.error('Error in updateUserStatus:', err);
      }
      
    }, []);

  const menuActions = usePopover();

  const [status, setStatus] = useState('online');

  const handleChangeStatus = useCallback(
    async (event) => {
      const newStatus = event.target.value;
      setStatus(newStatus);

      try {
        // Call updateUserStatus with the user's ID and the new status
        await updateUserStatus(user.id, newStatus);
        console.log('Status updated successfully:', newStatus);
      } catch (error) {
        console.error('Error updating status:', error);
      }
    },
    [user.id, updateUserStatus]
  );

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{
        paper: { sx: { p: 0, ml: 0, mt: 0.5 } },
        arrow: { placement: 'top-left' },
      }}
    >
      <Box
        sx={{
          py: 2,
          pr: 1,
          pl: 2,
          gap: 2,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <ListItemText
          primary={`${user.user_metadata?.first_name} ${user.user_metadata?.last_name}`}
          secondary={user.user_metadata?.email} />

        <Tooltip title="Log out">
          <IconButton color="error">
            <Iconify icon="ic:round-power-settings-new" />
          </IconButton>
        </Tooltip>
      </Box>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <MenuList sx={{ my: 0.5, px: 0.5 }}>
        <MenuItem>
          <Badge
            variant={status}
            badgeContent=""
            sx={{
              width: 24,
              height: 24,
              alignItems: 'center',
              justifyContent: 'center',
              [`& .${badgeClasses.badge}`]: {
                width: 12,
                height: 12,
                transform: 'unset',
                position: 'static',
              },
            }}
          />

          <FormControl fullWidth>
            <Select
              native
              fullWidth
              value={status}
              onChange={handleChangeStatus}
              input={<InputBase />}
              inputProps={{ id: 'chat-status-select' }}
              sx={{
                [`& .${svgIconClasses.root}`]: { right: 0 },
                [`& .${inputBaseClasses.input}`]: {
                  typography: 'body2',
                  textTransform: 'capitalize',
                },
              }}
            >
              {['online', 'always', 'busy', 'offline'].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </FormControl>
        </MenuItem>

        <MenuItem>
          <Iconify width={24} icon="solar:user-id-bold" />
          Profile
        </MenuItem>

        <MenuItem>
          <Iconify width={24} icon="eva:settings-2-fill" />
          Settings
        </MenuItem>
      </MenuList>
    </CustomPopover>
  );

  return (
    <>
      <Badge
        variant={status}
        badgeContent=""
        overlap="circular"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Avatar
          src={user.user_metadata?.avatar_url}
          alt={`${user.user_metadata?.first_name} ${user.user_metadata?.last_name}`}
          onClick={menuActions.onOpen}
          sx={{ cursor: 'pointer', width: 48, height: 48 }}
        >
          {`${user.user_metadata?.first_name} ${user.user_metadata?.last_name}`.charAt(0).toUpperCase()}
        </Avatar>
      </Badge>

      {renderMenuActions()}
    </>
  );
}
