import { useCallback, useState } from 'react';
import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import useMediaQuery from '@mui/material/useMediaQuery';
import AvatarGroup, { avatarGroupClasses } from '@mui/material/AvatarGroup';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fToNow } from 'src/utils/format-time';

import { deleteConversation } from 'src/actions/chat';

import { Iconify } from 'src/components/iconify';
import { CustomPopover } from 'src/components/custom-popover';

import { ChatHeaderSkeleton } from './chat-skeleton';

// ----------------------------------------------------------------------

export function ChatHeaderDetail({ collapseNav, participants, loading, user, conversationid }) {
  const theme = useTheme();
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));
  const router = useRouter();
  const menuActions = usePopover();

  const isGroup = participants.length > 1;

  const singleParticipant = participants[0];
  const { collapseDesktop, onCollapseDesktop, onOpenMobile } = collapseNav;
  
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  const handleToggleNav = useCallback(() => {
    if (lgUp) {
      onCollapseDesktop();
    } else {
      onOpenMobile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lgUp]);

  const renderGroup = () => (
    <AvatarGroup max={3} sx={{ [`& .${avatarGroupClasses.avatar}`]: { width: 32, height: 32 } }}>
      {participants.map((participant) => (
        <Avatar key={participant.id} alt={participant.name} src={participant.avatarUrl} />
      ))}
    </AvatarGroup>
  );

  const renderSingle = () => (
    <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
      <Badge variant={singleParticipant?.status} badgeContent="">
        <Avatar src={singleParticipant?.avatarUrl} alt={singleParticipant?.name} />
      </Badge>

      <ListItemText
        primary={singleParticipant?.name}
        secondary={
          singleParticipant?.status === 'offline'
            ? `${fToNow(singleParticipant?.last_activity)} ago`
            : singleParticipant?.status
        }
      />
    </Box>
  );

  if (loading) {
    return <ChatHeaderSkeleton />;
  }

  const handleDelete = async () => {
    try {
      await deleteConversation(selectedConversationId, user.id);
      router.push(`${paths.dashboard.chat}`);
    } catch (err) {
      console.error(err);
    } finally {
      setOpenDialog(false);
    }
  };

  const confirmDelete = (conversationId) => {
    setSelectedConversationId(conversationId);
    setOpenDialog(true);
  };

  const renderDeleteDialog = () => (
    <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
      <DialogTitle>Delete Conversation</DialogTitle>
      <DialogContent>
        Are you sure you want to delete this conversation? This action cannot be undone.
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenDialog(false)} color="primary">
          Cancel
        </Button>
        <Button onClick={handleDelete} color="error">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );

  

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
    >
      <MenuList>
        {/* <MenuItem onClick={() => menuActions.onClose()}>
          <Iconify icon="solar:bell-off-bold" />
          Hide notifications
        </MenuItem>

        <MenuItem onClick={() => menuActions.onClose()}>
          <Iconify icon="solar:forbidden-circle-bold" />
          Block
        </MenuItem>

        <MenuItem onClick={() => menuActions.onClose()}>
          <Iconify icon="solar:danger-triangle-bold" />
          Report
        </MenuItem>

        <Divider sx={{ borderStyle: 'dashed' }} /> */}

        <MenuItem onClick={() => confirmDelete(conversationid)} sx={{ color: 'error.main' }}>
          <Iconify icon="solar:trash-bin-trash-bold" />
          Delete
        </MenuItem>
      </MenuList>
    </CustomPopover>
  );

  return (
    <>
      {isGroup ? renderGroup() : renderSingle()}

      <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end' }}>
        {/* <IconButton>
          <Iconify icon="solar:phone-bold" />
        </IconButton>

        <IconButton>
          <Iconify icon="solar:videocamera-record-bold" />
        </IconButton> */}

        <IconButton onClick={handleToggleNav}>
          <Iconify icon={!collapseDesktop ? 'ri:sidebar-unfold-fill' : 'ri:sidebar-fold-fill'} />
        </IconButton>

        <IconButton onClick={menuActions.onOpen}>
          <Iconify icon="eva:more-vertical-fill" />
        </IconButton>
      </Box>

      {renderMenuActions()}
      {renderDeleteDialog()}

    </>
  );
}
