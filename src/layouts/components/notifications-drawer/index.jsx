import { m } from 'framer-motion';
import { useBoolean } from 'minimal-shared/hooks';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Menu from '@mui/material/Menu';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import SvgIcon from '@mui/material/SvgIcon';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { useChatNotifications } from 'src/actions/chat';
import { useKanbanNotifications } from 'src/actions/kanban';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomTabs } from 'src/components/custom-tabs';
import { varTap, varHover, transitionTap } from 'src/components/animate';

import { useAuthContext } from 'src/auth/hooks';

import { NotificationItem, ChatNotificationItem } from './notification-item';

// ----------------------------------------------------------------------

const TABS = [{ value: 'unread', label: 'Unread', count: 12 }];

const DROPDOWN_OPTIONS = [
  { value: 'kanban', label: 'Kanban' },
  { value: 'chat', label: 'Chat' },
  { value: 'file-manager', label: 'File Manager' },
];

// ----------------------------------------------------------------------

export function NotificationsDrawer({ sx, ...other }) {
  const { user } = useAuthContext();
  const { notifications, deleteNotification } = useKanbanNotifications(user?.id);
  const { notifications: chatNotifications, deleteNotification: deleteChatNotification } =
    useChatNotifications(user?.id);
  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedOption, setSelectedOption] = useState('kanban');
  const [currentTab, setCurrentTab] = useState('unread');

  const handleChangeTab = useCallback((event, newValue) => {
    setCurrentTab(newValue);
  }, []);

  const handleDropdownClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleDropdownClose = () => {
    setAnchorEl(null);
  };

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    handleDropdownClose();
  };

  // Calculate the total unread notifications across all categories
  const totalUnreadNotifications = notifications.length + chatNotifications.length;

  // [NEW for combined logic] Decide which notifications array to show
  const selectedNotifications =
    selectedOption === 'chat'
      ? chatNotifications
      : selectedOption === 'file-manager'
        ? [] // For now, empty
        : notifications; // default is Kanban

  // [NEW for combined logic] Decide which delete function to use
  const selectedDeleteNotification =
    selectedOption === 'chat'
      ? deleteChatNotification
      : selectedOption === 'file-manager'
        ? () => {} // no-op for now
        : deleteNotification;

  // [MODIFIED for combined logic] totalUnRead uses the selected array
  const totalUnRead = selectedNotifications.length;
  // [MODIFIED for combined logic] Mark all as read => delete all in selected array
  const handleMarkAllAsRead = async () => {
    try {
      await Promise.all(selectedNotifications.map((notif) => selectedDeleteNotification(notif.id)));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const renderHead = () => (
    <Box
      sx={{
        py: 2,
        pr: 1,
        pl: 2.5,
        minHeight: 68,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        Notifications
      </Typography>

      {/* {!!totalUnRead && (
        <Tooltip title="Mark all as read">
          <IconButton color="primary" onClick={handleMarkAllAsRead}>
            <Iconify icon="eva:done-all-fill" />
          </IconButton>
        </Tooltip>
      )} */}

      <IconButton onClick={onClose} sx={{ display: { xs: 'inline-flex', sm: 'none' } }}>
        <Iconify icon="mingcute:close-line" />
      </IconButton>
    </Box>
  );

  const renderTabs = () => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider',
        '& > *': {
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 48,
        },
      }}
    >
      <Button
        onClick={handleDropdownClick}
        endIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
        sx={{
          borderRadius: 0,
          borderColor: 'divider',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        {DROPDOWN_OPTIONS.find((option) => option.value === selectedOption)?.label}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleDropdownClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 180,
            boxShadow: (theme) => theme.customShadows.z20,
          },
        }}
      >
        {DROPDOWN_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleOptionSelect(option.value)}
            selected={option.value === selectedOption}
            sx={{
              py: 1,
              px: 2.5,
            }}
          >
            <ListItemText
              primary={option.label}
              slotProps={{
                primary: {
                  sx: {
                    fontWeight: option.value === selectedOption ? 600 : 400,
                  },
                },
              }}
            />
          </MenuItem>
        ))}
      </Menu>

      <CustomTabs
        variant="fullWidth"
        value={currentTab}
        onChange={handleChangeTab}
        sx={{
          backgroundColor: 'transparent',
          '& .MuiTabs-flexContainer': {
            justifyContent: 'center',
          },
        }}
      >
        {TABS.map((tab) => (
          <Tab
            key={tab.value}
            iconPosition="end"
            value={tab.value}
            label={tab.label}
            icon={
              <Label variant={(tab.value === currentTab && 'filled') || 'soft'} color="info">
                {totalUnRead}
              </Label>
            }
          />
        ))}
      </CustomTabs>
    </Box>
  );

  const renderList = () => (
    <Scrollbar>
      <Box component="ul" sx={{ p: 0, m: 0 }}>
        {selectedOption === 'kanban' && (
          <>
            {notifications.map((notification) => (
              <Box component="li" key={notification.id} sx={{ listStyle: 'none' }}>
                <NotificationItem notification={notification} onDelete={deleteNotification} />
              </Box>
            ))}

            {notifications.length === 0 && (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="subtitle2">No notifications</Typography>
              </Box>
            )}
          </>
        )}

        {selectedOption === 'chat' && (
          <>
            {chatNotifications.map((notification) => (
              <Box component="li" key={notification.id} sx={{ listStyle: 'none' }}>
                <ChatNotificationItem
                  notification={notification}
                  onDelete={deleteChatNotification}
                />
              </Box>
            ))}

            {chatNotifications.length === 0 && (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="subtitle2">No chat notifications</Typography>
              </Box>
            )}
          </>
        )}

        {selectedOption === 'file-manager' && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="subtitle2">No file manager notifications</Typography>
          </Box>
        )}
      </Box>
    </Scrollbar>
  );

  return (
    <>
      <IconButton
        component={m.button}
        whileTap={varTap(0.96)}
        whileHover={varHover(1.04)}
        transition={transitionTap()}
        aria-label="Notifications button"
        onClick={onOpen}
        sx={sx}
        {...other}
      >
        <Badge badgeContent={totalUnreadNotifications} color="error">
          <SvgIcon>
            <path
              fill="currentColor"
              d="M18.75 9v.704c0 .845.24 1.671.692 2.374l1.108 1.723c1.011 1.574.239 3.713-1.52 4.21a25.794 25.794 0 0 1-14.06 0c-1.759-.497-2.531-2.636-1.52-4.21l1.108-1.723a4.393 4.393 0 0 0 .693-2.374V9c0-3.866 3.022-7 6.749-7s6.75 3.134 6.75 7"
              opacity="0.5"
            />
            <path
              fill="currentColor"
              d="M12.75 6a.75.75 0 0 0-1.5 0v4a.75.75 0 0 0 1.5 0zM7.243 18.545a5.002 5.002 0 0 0 9.513 0c-3.145.59-6.367.59-9.513 0"
            />
          </SvgIcon>
        </Badge>
      </IconButton>

      <Drawer
        open={open}
        onClose={onClose}
        anchor="right"
        slotProps={{ backdrop: { invisible: true } }}
        PaperProps={{ sx: { width: 1, maxWidth: 420 } }}
      >
        {renderHead()}
        {renderTabs()}
        {renderList()}
      </Drawer>
    </>
  );
}
