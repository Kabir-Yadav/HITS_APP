import axios from 'axios';
import EmojiPicker from 'emoji-picker-react'; // ✅ New Emoji Picker
import { useRef, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import ListItem from '@mui/material/ListItem';
import IconButton from '@mui/material/IconButton';
import { Tooltip, useTheme } from '@mui/material';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ListItemAvatar from '@mui/material/ListItemAvatar';

import { fToNow } from 'src/utils/format-time';
import { fDateTime } from 'src/utils/format-time';

import { useDeleteMessage, handleAddReaction } from 'src/actions/chat';

import { Iconify } from 'src/components/iconify';
import { FileThumbnail, formatFileSize } from 'src/components/file-thumbnail';

import { useMockedUser } from 'src/auth/hooks';

import { getMessage } from './utils/get-message';

// ----------------------------------------------------------------------

export function ChatMessageItem({
  message,
  conversationId,
  participants,
  onOpenLightbox,
  onReply,
  allmessages,
}) {
  const { user } = useMockedUser();

  const { me, senderDetails, hasImage, hasFile } = getMessage({
    message,
    participants,
    currentUserId: `${user?.id}`,
  });
  const { firstName, avatarUrl } = senderDetails;
  const [openDialog, setOpenDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const openReactionsPopover = Boolean(anchorEl);
  const handleOpenPopover = (event) => setAnchorEl(event.currentTarget);
  const handleClosePopover = () => setAnchorEl(null);
  const MAX_VISIBLE_REACTIONS = 3;
  const { body, createdAt, attachments } = message;

  //-----------------------------------Info function-----------------------------------------

  const renderInfo = () => (
    <Typography
      noWrap
      variant="caption"
      sx={{ mb: 1, color: 'text.disabled', ...(!me && { mr: 'auto' }) }}
    >
      {!me && `${firstName}, `}
      {fToNow(createdAt)}
    </Typography>
  );
  //-----------------------------------Delete function-----------------------------------------

  const deleteMessage = useDeleteMessage();
  const handleDeleteMessage = async () => {
    await deleteMessage(message.id, conversationId, user.id);
    setOpenDialog(false);
  };
  //-----------------------------------Emoji function------------------------------------------

  const [openEmojiPicker, setOpenEmojiPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState('top');
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!openEmojiPicker) return () => {};

    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setOpenEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openEmojiPicker]);

  const handleReactionClick = (emoji) => {
    setOpenEmojiPicker(false);
    handleAddReaction(message.id, user?.id, emoji.emoji, conversationId);
  };

  const themes = useTheme();
  const pickerTheme = themes.palette.mode === 'dark' ? 'dark' : 'light';

  //-----------------------------------Attachement message-------------------------------------

  const renderAttachments = (isCurrentUser) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <Stack spacing={1} sx={{ mb: 1, alignItems: isCurrentUser ? 'end' : 'start' }}>
        {attachments.map((attachment, index) => {
          const fileType = attachment.type.toLowerCase();
          const isImage =
            attachment.type.startsWith('image/') ||
            ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileType);
          return isImage ? (
            <Box
              key={attachment.name + index}
              component="img"
              alt="Attachment"
              src={attachment.path}
              onClick={() => onOpenLightbox(attachment.path)}
              sx={{
                width: 220,
                height: 'auto',
                borderRadius: 1.5,
                cursor: 'pointer',
                objectFit: 'cover',
                aspectRatio: '16/11',
                '&:hover': { opacity: 0.9 },
              }}
            />
          ) : (
            // ✅ Display non-image files using `FileThumbnail`
            <Box
              key={attachment.name + index}
              sx={{ gap: 1.5, display: 'flex', alignItems: 'center', maxWidth: 200 }}
            >
              <FileThumbnail
                imageView
                file={attachment.path}
                onDownload={() => window.open(attachment.path, '_blank')}
                slotProps={{ icon: { sx: { width: 24, height: 24 } } }}
                sx={{ width: 40, height: 40, bgcolor: 'background.neutral' }}
              />

              <ListItemText
                primary={attachment.name}
                secondary={formatFileSize(attachment.size)}
                slotProps={{
                  primary: { noWrap: true, sx: { typography: 'body2' } },
                  secondary: {
                    noWrap: true,
                    sx: {
                      typography: 'caption',
                      color: 'text.disabled',
                    },
                  },
                }}
              />
            </Box>
          );
        })}
        {/* Display reactions with a limit */}
        {body==='' && message.reactions &&
          message.reactions.length > 0 &&
          (() => {
            // Group reactions by emoji
            const byEmoji = message.reactions.reduce((acc, r) => {
              acc[r.emoji] = acc[r.emoji] || [];
              acc[r.emoji].push(r.user_id);
              return acc;
            }, {});

            return (
              <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                justifyContent: isCurrentUser ? 'end' : 'start',
              }}
              >
              {/* Render up to MAX_VISIBLE_REACTIONS distinct emojis */}
              {Object.entries(byEmoji)
                .slice(0, MAX_VISIBLE_REACTIONS)
                .map(([emoji, userIds]) => {
                // Look up participant names
                const names = userIds
                  .map((id) => {
                  if (id === user.id) return 'You';
                  const p = participants.find((item) => String(item.id) === String(id));
                  return p?.name ?? 'Unknown';
                  })
                  .join(', ');
                return (
                  <Tooltip key={emoji} title={names}>
                  <Box
                    onClick={handleOpenPopover}
                    sx={{
                    borderRadius: '50%',
                    backgroundColor: 'background.paper',
                    p: 0.4,
                    cursor: 'pointer',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontSize: 14 }}>
                    {emoji} {userIds.length > 1 ? userIds.length : ''}
                    </Typography>
                  </Box>
                  </Tooltip>
                );
                })}

              {/* If there are more emojis beyond MAX_VISIBLE, show a “+N” */}
              {Object.keys(byEmoji).length > MAX_VISIBLE_REACTIONS && (
                <IconButton size="small" onClick={handleOpenPopover}>
                <Typography variant="caption" sx={{ fontSize: 14, color: 'text.secondary' }}>
                  +{Object.keys(byEmoji).length - MAX_VISIBLE_REACTIONS}
                </Typography>
                </IconButton>
              )}

              {/* Popover listing every single reaction with name and emoji */}
              <Popover
                open={openReactionsPopover}
                anchorEl={anchorEl}
                onClose={handleClosePopover}
                anchorOrigin={{
                vertical: 'center',
                horizontal: isCurrentUser?'left': 'right',
                }}
                transformOrigin={{
                vertical: 'top',
                horizontal: isCurrentUser?'right':'left',
                }}
              >
                <List sx={{ p: 1, minWidth: 200 }}>
                {message.reactions.map((r) => {
                  const isMe = r.user_id === user.id;
                  const p = participants.find((item) => String(item.id) === String(r.user_id));
                  return (
                  <ListItem key={`${r.user_id}-${r.emoji}`} sx={{ display: 'flex', gap: 1 }}>
                    <Typography
                    variant="body2"
                    noWrap
                    sx={{
                      maxWidth: 120,
                      flex:1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    >
                    {isMe ? 'You' : (p?.name ?? 'Unknown')}
                    </Typography>
                    <Typography variant="body2">{r.emoji}</Typography>
                  </ListItem>
                  );
                })}
                </List>
              </Popover>
              </Box>
            );
          })()}
      </Stack>
    );
  };

  //-----------------------------------Message Body-----------------------------------------

  const renderBody = (isCurrentUser) => {
    if (!body) return null;

    return (
      <Box>
        <Stack
          sx={{
            p: 1.5,
            maxWidth: 400,
            width: 'fit-content',
            borderRadius: 1,
            typography: 'body2',
            bgcolor: 'background.neutral',
            whiteSpace: 'pre-wrap', // ← Respect \n as line breaks
            wordBreak: 'break-word', // ← Wrap long lines
            ...(me && { color: 'grey.800', bgcolor: 'primary.lighter' }),
          }}
        >
          {body}
        </Stack>

        {/* Display reactions with a limit */}
        {message.reactions &&
          message.reactions.length > 0 &&
          (() => {
            // Group reactions by emoji
            const byEmoji = message.reactions.reduce((acc, r) => {
              acc[r.emoji] = acc[r.emoji] || [];
              acc[r.emoji].push(r.user_id);
              return acc;
            }, {});

            return (
              <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                justifyContent: isCurrentUser ? 'end' : 'start',
              }}
              >
              {/* Render up to MAX_VISIBLE_REACTIONS distinct emojis */}
              {Object.entries(byEmoji)
                .slice(0, MAX_VISIBLE_REACTIONS)
                .map(([emoji, userIds]) => {
                // Look up participant names
                const names = userIds
                  .map((id) => {
                  if (id === user.id) return 'You';
                  const p = participants.find((item) => String(item.id) === String(id));
                  return p?.name ?? 'Unknown';
                  })
                  .join(', ');
                return (
                  <Tooltip key={emoji} title={names}>
                  <Box
                    onClick={handleOpenPopover}
                    sx={{
                    borderRadius: '50%',
                    backgroundColor: 'background.paper',
                    p: 0.4,
                    cursor: 'pointer',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontSize: 14 }}>
                    {emoji} {userIds.length > 1 ? userIds.length : ''}
                    </Typography>
                  </Box>
                  </Tooltip>
                );
                })}

              {/* If there are more emojis beyond MAX_VISIBLE, show a “+N” */}
              {Object.keys(byEmoji).length > MAX_VISIBLE_REACTIONS && (
                <IconButton size="small" onClick={handleOpenPopover}>
                <Typography variant="caption" sx={{ fontSize: 14, color: 'text.secondary' }}>
                  +{Object.keys(byEmoji).length - MAX_VISIBLE_REACTIONS}
                </Typography>
                </IconButton>
              )}

              {/* Popover listing every single reaction with name and emoji */}
              <Popover
                open={openReactionsPopover}
                anchorEl={anchorEl}
                onClose={handleClosePopover}
                anchorOrigin={{
                vertical: 'center',
                horizontal: isCurrentUser?'left': 'right',
                }}
                transformOrigin={{
                vertical: 'top',
                horizontal: isCurrentUser?'right':'left',
                }}
              >
                <List sx={{ p: 1, minWidth: 200 }}>
                {message.reactions.map((r) => {
                  const isMe = r.user_id === user.id;
                  const p = participants.find((item) => String(item.id) === String(r.user_id));
                  return (
                  <ListItem key={`${r.user_id}-${r.emoji}`} sx={{ display: 'flex', gap: 1 }}>
                    <Typography
                    variant="body2"
                    noWrap
                    sx={{
                      maxWidth: 120,
                      flex:1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    >
                    {isMe ? 'You' : (p?.name ?? 'Unknown')}
                    </Typography>
                    <Typography variant="body2">{r.emoji}</Typography>
                  </ListItem>
                  );
                })}
                </List>
              </Popover>
              </Box>
            );
          })()}
      </Box>
    );
  };

  //-----------------------------------Action Buttons-----------------------------------------

  const renderActions = (isCurrentUser) => (
    <Box
      sx={(theme) => ({
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isCurrentUser ? 'end' : 'start',
      })}
    >
      <Box
        className="message-actions"
        sx={(theme) => ({
          pt: 0.5,
          left: 0,
          top: '100%',
          display: 'flex',
          transition: theme.transitions.create(['opacity'], {
            duration: theme.transitions.duration.shorter,
          }),
          opacity: openEmojiPicker ? 1 : 0, // ✅ Keep buttons visible when picker is open
          ...(me && { right: 0, left: 'unset' }),
        })}
      >
        <IconButton size="small" onClick={() => onReply(message)}>
          <Iconify icon="solar:reply-bold" width={16} />
        </IconButton>

        {/* ✅ Open Emoji Picker on Click */}
        <IconButton size="small" onClick={() => setOpenEmojiPicker(!openEmojiPicker)}>
          <Iconify icon="eva:smiling-face-fill" width={16} />
        </IconButton>

        {isCurrentUser && (
          <IconButton size="small" onClick={() => setOpenDialog(true)}>
            <Iconify icon="solar:trash-bin-trash-bold" width={16} />
          </IconButton>
        )}
      </Box>

      {/* ✅ Emoji Picker */}
      {openEmojiPicker && (
        <Box
          ref={pickerRef}
          sx={{
            zIndex: 10,
            overflow: 'hidden',
            top: '100%',
            ...(me ? { right: '50%' } : { left: '50%' }),
            transition: 'width 0.3s ease-in-out',
          }}
        >
          <EmojiPicker
            onEmojiClick={handleReactionClick}
            emojiStyle="native"
            previewConfig={{ showPreview: false }}
            reactionsDefaultOpen
            theme={pickerTheme}
          />
        </Box>
      )}

      {isCurrentUser && (
        <>
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogContent>
              Are you sure you want to delete this message? This action cannot be undone.
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)} color="primary">
                Cancel
              </Button>
              <Button onClick={handleDeleteMessage} color="error">
                Delete
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );

  //-----------------------------------Reply message-----------------------------------------

  const renderParentMessage = () => {
    if (!message.parentId) return null; // ✅ Only show if it's a reply

    // ✅ Find the parent message
    const parentMessage = allmessages.find((msg) => msg.id === message.parentId);
    if (!parentMessage) return null; // ✅ If no parent message is found, don't render anything

    // ✅ Get sender name
    const sender =
      parentMessage.senderId === user?.id
        ? 'You'
        : participants.find((part) => String(part.id) === String(parentMessage.senderId))?.name ||
          'Unknown';

    return (
      <Box
        sx={{
          p: 1,
          mb: 0.5,
          borderLeft: '3px solid',
          borderColor: 'primary.main',
          backgroundColor: 'action.hover',
          borderRadius: 1,
          maxWidth: 350,
          fontSize: '0.875rem',
          color: 'text.secondary',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Typography variant="caption" fontWeight="bold" marginBottom={1}>
          {sender}
        </Typography>

        {/* ✅ Show message body if available */}
        {parentMessage.body ? (
          <Typography variant="body2" noWrap>
            {parentMessage.body}
          </Typography>
        ) : parentMessage.attachments && parentMessage.attachments.length > 0 ? (
          <>
            {/* ✅ If first attachment is an image, show it */}
            {['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'svg+xml'].includes(
              parentMessage.attachments[0].type
            ) ? (
              <img
                src={parentMessage.attachments[0].path}
                alt="Attachment Preview"
                style={{ width: 100, height: 80, borderRadius: 5, objectFit: 'cover' }}
              />
            ) : (
              // ✅ Show file icon and name for non-image files
              <Stack direction="row" alignItems="center" spacing={1}>
                <FileThumbnail
                  imageView
                  file={parentMessage.attachments[0].path}
                  slotProps={{ icon: { sx: { width: 24, height: 24 } } }}
                  sx={{ width: 30, height: 30, bgcolor: 'background.neutral' }}
                />
                <ListItemText
                  secondary={formatFileSize(parentMessage.attachments[0].size)}
                  slotProps={{
                    primary: { noWrap: true, sx: { typography: 'body2' } },
                    secondary: {
                      noWrap: true,
                      sx: {
                        typography: 'caption',
                        color: 'text.disabled',
                      },
                    },
                  }}
                />
              </Stack>
            )}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            [No Content]
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ mb: 1, display: 'flex', justifyContent: me ? 'flex-end' : 'unset' }}>
      {!me && <Avatar alt={firstName} src={avatarUrl} sx={{ width: 32, height: 32, mr: 2 }} />}

      <Stack alignItems={me ? 'flex-end' : 'flex-start'}>
        {renderInfo()}
        <Box
          sx={{
            maxWidth: 'fit-content',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            '&:hover': { '& .message-actions': { opacity: 1 } },
          }}
        >
          <Stack spacing={1} alignItems={me ? 'flex-end' : 'flex-start'}>
            {renderParentMessage()}
            {renderAttachments(me)} {/* ✅ Attachments are displayed first */}
            {renderBody(me)} {/* ✅ Message text appears below attachments */}
          </Stack>
          {renderActions(me, onReply)}
        </Box>
      </Stack>
    </Box>
  );
}
