import { format } from 'date-fns';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';

import { useRouter } from 'src/routes/hooks';

import { Label } from 'src/components/label';
import { FileThumbnail } from 'src/components/file-thumbnail';

// ----------------------------------------------------------------------

const isValidDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

const formatDueDate = (startDate, endDate) => {
  try {
    if (!isValidDate(startDate) && !isValidDate(endDate)) return '';

    const start = isValidDate(startDate) ? format(new Date(startDate), 'MMM d, yyyy') : '';
    const end = isValidDate(endDate) ? format(new Date(endDate), 'MMM d, yyyy') : '';
    
    if (start && end) {
      return `Due: ${start} - ${end}`;
    }
    if (start) {
      return `Due: ${start}`;
    }
    return '';
  } catch (error) {
    console.error('Error formatting due date:', error);
    return '';
  }
};

const getTimeString = (dateString) => {
  try {
    if (!isValidDate(dateString)) {
      console.warn('Invalid date string:', dateString);
      return '';
    }
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy h:mm a');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

const readerContent = (data) => (
  <Box
    dangerouslySetInnerHTML={{ __html: data }}
    sx={{
      '& p': { m: 0, typography: 'body2' },
      '& a': { color: 'inherit', textDecoration: 'none' },
      '& strong': { typography: 'subtitle2' },
    }}
  />
);

export function NotificationItem({ notification, onDelete }) {
  const router = useRouter();

  const renderAvatar = (
    <Avatar 
      src={notification.task?.reporter?.avatar_url} 
      sx={{ width: 40, height: 40 }}
    >
      {notification.task?.reporter?.name?.charAt(0) || 'U'}
    </Avatar>
  );

  const handleClick = async () => {
    if (notification.task_id) {
      try {
        // Delete the notification first and wait for it to complete
        if (onDelete) {
          await onDelete(notification.id);
        }
        
        // Then navigate to kanban with the task ID
        router.push({
          pathname: '/dashboard/kanban',
          search: `?taskId=${notification.task_id}`,
        });
      } catch (error) {
        console.error('Error handling notification click:', error);
      }
    }
  };

  const renderText = () => {
    const assignerName = notification.task?.reporter?.name || 'Someone';
    const taskName = notification.task?.name || '';
    const dueDate = formatDueDate(notification.task?.due_start, notification.task?.due_end);
    const createdTime = getTimeString(notification.created_at);

    return (
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
              {`${assignerName} assigned you a task`}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {taskName}
            </Typography>
            {dueDate && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {dueDate}
              </Typography>
            )}
          </Box>
        }
        secondary={
          createdTime ? (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {createdTime}
              </Typography>
            </Stack>
          ) : null
        }
        slotProps={{
          primary: {
            sx: { mb: 0.5 },
          },
          secondary: {
            sx: {
              display: 'flex',
              alignItems: 'center',
            },
          },
        }}
      />
    );
  };

  const renderUnReadBadge = () =>
    notification.isUnRead && (
      <Box
        sx={{
          top: '50%',
          width: 8,
          height: 8,
          right: 8,
          position: 'absolute',
          transform: 'translateY(-50%)',
          borderRadius: '50%',
          bgcolor: 'info.main',
        }}
      />
    );

  const renderFriendAction = () => (
    <Box sx={{ gap: 1, mt: 1.5, display: 'flex' }}>
      <Button size="small" variant="contained">
        Accept
      </Button>
      <Button size="small" variant="outlined">
        Decline
      </Button>
    </Box>
  );

  const renderProjectAction = () => (
    <>
      <Box
        sx={{
          p: 1.5,
          my: 1.5,
          borderRadius: 1.5,
          color: 'text.secondary',
          bgcolor: 'background.neutral',
        }}
      >
        {readerContent(
          `<p><strong>@Jaydon Frankie</strong> feedback by asking questions or just leave a note of appreciation.</p>`
        )}
      </Box>

      <Button size="small" variant="contained" sx={{ alignSelf: 'flex-start' }}>
        Reply
      </Button>
    </>
  );

  const renderFileAction = () => (
    <Box
      sx={(theme) => ({
        p: theme.spacing(1.5, 1.5, 1.5, 1),
        gap: 1,
        mt: 1.5,
        display: 'flex',
        borderRadius: 1.5,
        bgcolor: 'background.neutral',
      })}
    >
      <FileThumbnail file="http://localhost:8080/httpsdesign-suriname-2015.mp3" />

      <ListItemText
        primary="design-suriname-2015.mp3 design-suriname-2015.mp3"
        secondary="2.3 Mb"
        slotProps={{
          primary: {
            noWrap: true,
            sx: (theme) => ({
              color: 'text.secondary',
              fontSize: theme.typography.pxToRem(13),
            }),
          },
          secondary: {
            sx: {
              mt: 0.25,
              typography: 'caption',
              color: 'text.disabled',
            },
          },
        }}
      />

      <Button size="small" variant="outlined" sx={{ flexShrink: 0 }}>
        Download
      </Button>
    </Box>
  );

  const renderTagsAction = () => (
    <Box
      sx={{
        mt: 1.5,
        gap: 0.75,
        display: 'flex',
        flexWrap: 'wrap',
      }}
    >
      <Label variant="outlined" color="info">
        Design
      </Label>
      <Label variant="outlined" color="warning">
        Dashboard
      </Label>
      <Label variant="outlined">Design system</Label>
    </Box>
  );

  const renderPaymentAction = () => (
    <Box sx={{ gap: 1, mt: 1.5, display: 'flex' }}>
      <Button size="small" variant="contained">
        Pay
      </Button>
      <Button size="small" variant="outlined">
        Decline
      </Button>
    </Box>
  );

  return (
    <ListItemButton
      onClick={handleClick}
      sx={{
        py: 1.5,
        px: 2.5,
        position: 'relative',
        borderBottom: (theme) => `dashed 1px ${theme.palette.divider}`,
        ...(notification.read && {
          bgcolor: 'action.selected',
        }),
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: 1 }}>
        {renderUnReadBadge()}
        {renderAvatar}

        <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
          {renderText()}
          {notification.type === 'friend' && renderFriendAction()}
          {notification.type === 'project' && renderProjectAction()}
          {notification.type === 'file' && renderFileAction()}
          {notification.type === 'tags' && renderTagsAction()}
          {notification.type === 'payment' && renderPaymentAction()}
        </Box>
      </Stack>
    </ListItemButton>
  );
}


// ==============================================================================
//                        NEW CHAT NOTIFICATION ITEM
// ==============================================================================
export function ChatNotificationItem({ notification, onDelete }) {
  const router = useRouter();

  // For chat, you might have columns like:
  // user_id, actor_id, notification_type (message/reply/reaction),
  // body, original_body, reaction_emoji, conversation_id, message_id, created_at, etc.
  // Suppose you joined with `actor:user_info(...)` to get actor name or avatar.

  // Example: notification.actor?.avatar_url
  const actorName = notification.actor?.full_name || 'User';
  const createdTime = getTimeString(notification.created_at);

  const renderUnReadBadge = () => {
    if (notification.is_read === false) {
      // or if you track is_unread
      return (
        <Box
          sx={{
            top: '50%',
            width: 8,
            height: 8,
            right: 8,
            position: 'absolute',
            transform: 'translateY(-50%)',
            borderRadius: '50%',
            bgcolor: 'info.main',
          }}
        />
      );
    }
    return null;
  };

  // A minimal avatar (assuming we have actor info):
  const renderAvatar = (
    <Avatar 
      src={notification.actor?.avatar_url} 
      sx={{ width: 40, height: 40 }}
    >
      {notification.actor?.full_name?.charAt(0) || 'U'}
    </Avatar>
  );

  // We might want to navigate to the conversation. 
  // e.g. /dashboard/chat?conversationId=xxxx
  const handleClick = async () => {
    if (onDelete) {
      await onDelete(notification.id);
    }
    router.push({
      pathname: '/dashboard/chat',
      query: { conversationId: notification.conversation_id },
    });
  };

  // Render different text based on `notification_type`
  const renderText = () => {
    // e.g. 'message' -> "ActorName sent you a message: body"
    // 'reply' -> "ActorName replied to your message: body / original_body"
    // 'reaction' -> "ActorName reacted with reaction_emoji to original_body"
    const { notification_type, body, original_body, reaction_emoji } = notification;

    let title = '';
    let subtitle = '';

    if (notification_type === 'message') {
      title = `${actorName} sent you a message`;
      subtitle = body;
    } else if (notification_type === 'reply') {
      title = `${actorName} replied`;
      subtitle = `Reply: ${body}\nOriginal: ${original_body}`;
    } else if (notification_type === 'reaction') {
      title = `${actorName} reacted with ${reaction_emoji}`;
      subtitle = `Your message: ${body}`;
    } else {
      title = 'New chat notification';
      subtitle = body || '';
    }

    return (
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-line' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        }
        secondary={
          createdTime ? (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {createdTime}
              </Typography>
            </Stack>
          ) : null
        }
        slotProps={{
          primary: {
            sx: { mb: 0.5 },
          },
          secondary: {
            sx: {
              display: 'flex',
              alignItems: 'center',
            },
          },
        }}
      />
    );
  };

  return (
    <ListItemButton
      onClick={handleClick}
      sx={{
        py: 1.5,
        px: 2.5,
        position: 'relative',
        borderBottom: (theme) => `dashed 1px ${theme.palette.divider}`,
        ...(notification.is_read && {
          bgcolor: 'action.selected',
        }),
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: 1 }}>
        {renderUnReadBadge()}
        {renderAvatar}

        <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
          {renderText()}
        </Box>
      </Stack>
    </ListItemButton>
  );
}