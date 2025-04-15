import { mutate } from 'swr';
import { useSnackbar } from 'notistack';
import { useBoolean } from 'minimal-shared/hooks';
import { useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import Checkbox from '@mui/material/Checkbox';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { darken, lighten, alpha as hexAlpha } from '@mui/material/styles';

import { fData } from 'src/utils/format-number';
import { fDateTime } from 'src/utils/format-time';
import { downloadAttachment, prepareReply, prepareForward, toggleStarred, toggleImportant, isCalendarEvent, parseCalendarEvent, respondToCalendarEvent, markAsRead, markAsUnread } from 'src/utils/gmail';

import { CONFIG } from 'src/global-config';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Markdown } from 'src/components/markdown';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { FileThumbnail } from 'src/components/file-thumbnail';
import { LoadingScreen } from 'src/components/loading-screen';


// ----------------------------------------------------------------------

// Calendar Event Component
function CalendarEventView({ eventDetails, mailId }) {
  const { type, title, date, time, location, attendees, organizer, status } = eventDetails;
  const [isResponding, setIsResponding] = useState(false);
  const [responseStatus, setResponseStatus] = useState(status);
  
  // Determine status color
  const getStatusColor = () => {
    switch (responseStatus) {
      case 'accepted': return 'success.main';
      case 'declined': return 'error.main';
      case 'tentative': return 'warning.main';
      default: return 'info.main';
    }
  };
  
  // Determine status text
  const getStatusText = () => {
    switch (responseStatus) {
      case 'accepted': return 'Accepted';
      case 'declined': return 'Declined';
      case 'tentative': return 'Maybe';
      default: return 'Pending';
    }
  };
  
  // Handle response to calendar event
  const handleRespond = useCallback(async (response) => {
    if (!mailId || isResponding) return;
    
    try {
      setIsResponding(true);
      await respondToCalendarEvent(mailId, response);
      setResponseStatus(response);
      
      // Show success message
      // You can implement a toast or notification system here
      console.log(`Successfully responded with: ${response}`);
    } catch (error) {
      console.error('Error responding to calendar event:', error);
      // Show error message
    } finally {
      setIsResponding(false);
    }
  }, [mailId, isResponding]);
  
  return (
    <Box
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 1,
        bgcolor: 'background.neutral',
        border: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <Stack spacing={2}>
        {/* Event Title */}
        <Typography variant="h6">{title}</Typography>
        
        {/* Event Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: getStatusColor(),
            }}
          />
          <Typography variant="body2" color={getStatusColor()}>
            {getStatusText()}
          </Typography>
        </Box>
        
        {/* Event Details */}
        <Stack spacing={1}>
          {/* Date & Time */}
          {(date || time) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon="mdi:calendar-clock" width={20} />
              <Typography variant="body2">
                {date} {time}
              </Typography>
            </Box>
          )}
          
          {/* Location */}
          {location && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon="mdi:map-marker" width={20} />
              <Typography variant="body2">{location}</Typography>
            </Box>
          )}
          
          {/* Organizer */}
          {organizer && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Iconify icon="mdi:account" width={20} />
              <Typography variant="body2">Organizer: {organizer}</Typography>
            </Box>
          )}
          
          {/* Attendees */}
          {attendees.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Iconify icon="mdi:account-group" width={20} sx={{ mt: 0.5 }} />
              <Box>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Attendees:
                </Typography>
                <Stack direction="row" flexWrap="wrap" spacing={1}>
                  {attendees.map((attendee, index) => (
                    <Chip
                      key={index}
                      label={attendee}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Box>
            </Box>
          )}
        </Stack>
        
        {/* Action Buttons for Invitations */}
        {type === 'invitation' && (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button
              variant={responseStatus === 'accepted' ? "contained" : "outlined"}
              color="success"
              startIcon={<Iconify icon="mdi:check" />}
              size="small"
              onClick={() => handleRespond('accepted')}
              disabled={isResponding || responseStatus === 'accepted'}
            >
              Yes
            </Button>
            <Button
              variant={responseStatus === 'declined' ? "contained" : "outlined"}
              color="error"
              startIcon={<Iconify icon="mdi:close" />}
              size="small"
              onClick={() => handleRespond('declined')}
              disabled={isResponding || responseStatus === 'declined'}
            >
              No
            </Button>
            <Button
              variant={responseStatus === 'tentative' ? "contained" : "outlined"}
              startIcon={<Iconify icon="mdi:clock-outline" />}
              size="small"
              onClick={() => handleRespond('tentative')}
              disabled={isResponding || responseStatus === 'tentative'}
            >
              Maybe
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

export function MailDetails({ mail, renderLabel, isEmpty, error, loading, onCompose }) {
  const { enqueueSnackbar } = useSnackbar();
  const showAttachments = useBoolean(true);
  const [isStarred, setIsStarred] = useState(mail?.labelIds?.includes('STARRED') || false);
  const [isImportant, setIsImportant] = useState(mail?.labelIds?.includes('IMPORTANT') || false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRead, setIsRead] = useState(mail?.isRead || false);

  // Update state when mail changes
  useEffect(() => {
    if (mail) {
      setIsStarred(mail.labelIds?.includes('STARRED') || false);
      setIsImportant(mail.labelIds?.includes('IMPORTANT') || false);
      setIsRead(mail.isRead || false);
    }
  }, [mail]);

  // Extract sender info
  const fromName = mail?.from ? mail.from.split('<')[0].trim() || mail.from.split('@')[0] : 'Unknown';
  const fromEmail = mail?.from ? (mail.from.match(/<(.+)>/) || [])[1] || mail.from : '';

  // State for tracking downloading attachments
  const [downloadingAttachments, setDownloadingAttachments] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if this is a calendar event
  const isEvent = isCalendarEvent(mail);
  const eventDetails = isEvent ? parseCalendarEvent(mail) : null;

  const handleRefresh = useCallback(async () => {
    if (!mail?.id) return;
    
    try {
      setIsRefreshing(true);
      
      // Get the current label from the mail's labelIds
      const currentLabel = mail.labelIds?.find(id => 
        ['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'IMPORTANT', 'STARRED'].includes(id)
      ) || 'INBOX';
      
      // Refresh the specific mail and its label list
      await Promise.all([
        // Refresh the current mail details
        mutate(`gmail-message-${mail.id}`),
        // Refresh the mail list for the current label
        mutate(['gmail-messages', currentLabel.toLowerCase()]),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [mail?.id, mail?.labelIds]);

  const handleReply = useCallback(() => {
    if (!mail) return;

    onCompose({
      to: mail.from.email,
      subject: `Re: ${mail.subject}`,
      // For replies, we don't include the original message or attachments
      threadId: mail.threadId // This will associate the reply with the original thread
    });
  }, [mail, onCompose]);

  const handleForward = useCallback(() => {
    if (!mail) return;

    onCompose({
      subject: `Fwd: ${mail.subject}`,
      body: `\n\n---------- Forwarded message ---------\nFrom: ${mail.from.name} <${mail.from.email}>\nDate: ${new Date(mail.date).toLocaleString()}\nSubject: ${mail.subject}\nTo: ${mail.to.map(t => t.email).join(', ')}\n\n${mail.body}`,
      attachments: mail.attachments // Include attachments for forwards
    });
  }, [mail, onCompose]);

  const handleToggleStarred = useCallback(async () => {
    if (!mail?.id || isUpdating) return;

    try {
      setIsUpdating(true);
      const newValue = !isStarred;
      await toggleStarred(mail.id, newValue);
      setIsStarred(newValue);
      
      // Refresh the mail data
      await mutate(`gmail-message-${mail.id}`);
      
      // Get the current label from the mail's labelIds
      const currentLabel = mail.labelIds?.find(id => 
        ['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'IMPORTANT', 'STARRED'].includes(id)
      ) || 'INBOX';
      
      // Refresh the mail list for the current label
      await mutate(['gmail-messages', currentLabel.toLowerCase()]);
    } catch (togglerror) {
      console.error('Error toggling star:', togglerror);
      // Revert the state if there was an error
      setIsStarred(!isStarred);
    } finally {
      setIsUpdating(false);
    }
  }, [mail?.id, isStarred, isUpdating]);

  const handleToggleImportant = useCallback(async () => {
    if (!mail?.id || isUpdating) return;

    try {
      setIsUpdating(true);
      const newValue = !isImportant;
      await toggleImportant(mail.id, newValue);
      setIsImportant(newValue);
      
      // Refresh the mail data
      await mutate(`gmail-message-${mail.id}`);
      
      // Get the current label from the mail's labelIds
      const currentLabel = mail.labelIds?.find(id => 
        ['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'IMPORTANT', 'STARRED'].includes(id)
      ) || 'INBOX';
      
      // Refresh the mail list for the current label
      await mutate(['gmail-messages', currentLabel.toLowerCase()]);
    } catch (togimperror) {
      console.error('Error toggling important:', togimperror);
      // Revert the state if there was an error
      setIsImportant(!isImportant);
    } finally {
      setIsUpdating(false);
    }
  }, [mail?.id, isImportant, isUpdating]);

  const handleToggleRead = useCallback(async () => {
    if (!mail?.id || isUpdating) return;

    try {
      setIsUpdating(true);
      const newValue = !isRead;
      
      if (newValue) {
        await markAsRead(mail.id);
        enqueueSnackbar('Marked as read', { variant: 'success' });
      } else {
        await markAsUnread(mail.id);
        enqueueSnackbar('Marked as unread', { variant: 'success' });
      }
      
      setIsRead(newValue);
      
      // Refresh the mail data
      await mutate(`gmail-message-${mail.id}`);
      
      // Get the current label from the mail's labelIds
      const currentLabel = mail.labelIds?.find(id => 
        ['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'IMPORTANT', 'STARRED'].includes(id)
      ) || 'INBOX';
      
      // Refresh the mail list for the current label
      await mutate(['gmail-messages', currentLabel.toLowerCase()]);
    } catch (readerror) {
      console.error('Error toggling read status:', readerror);
      enqueueSnackbar('Failed to update read status', { variant: 'error' });
      // Revert the state if there was an error
      setIsRead(!isRead);
    } finally {
      setIsUpdating(false);
    }
  }, [mail?.id, isRead, isUpdating, enqueueSnackbar]);

  const handleDownloadAttachment = useCallback(async (attachment) => {
    try {
      setDownloadingAttachments(prev => ({ ...prev, [attachment.id]: true }));
      
      const base64Data = await downloadAttachment(attachment.messageId, attachment.id);
      
      // Convert base64url to base64
      const base64Fixed = base64Data.replace(/-/g, '+').replace(/_/g, '/');
      const padding = '='.repeat((4 - base64Fixed.length % 4) % 4);
      const base64Complete = base64Fixed + padding;
      
      // Convert base64 to binary
      const binaryStr = atob(base64Complete);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      
      // Create a Blob from the binary data
      const blob = new Blob([bytes.buffer], { type: attachment.mimeType });
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error('Error downloading attachment:', downloadError);
    } finally {
      setDownloadingAttachments(prev => ({ ...prev, [attachment.id]: false }));
    }
  }, []);

  const handleDownloadAllAttachments = useCallback(async () => {
    if (!mail?.attachments?.length) return;
    
    // Download each attachment sequentially
    for (const attachment of mail.attachments) {
      await handleDownloadAttachment(attachment);
    }
  }, [mail?.attachments, handleDownloadAttachment]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <EmptyContent
        title={error}
        imgUrl={`${CONFIG.assetsDir}/assets/icons/empty/ic-email-disabled.svg`}
      />
    );
  }

  if (isEmpty) {
    return (
      <EmptyContent
        title="No conversation selected"
        description="Select a conversation to read"
        imgUrl={`${CONFIG.assetsDir}/assets/icons/empty/ic-email-selected.svg`}
      />
    );
  }

  const renderHead = () => (
    <>
      <Box sx={{ gap: 1, flexGrow: 1, display: 'flex' }}>
        {mail?.labelIds?.map((labelId) => {
          const label = renderLabel?.(labelId);

          return label ? (
            <Label
              key={label.id}
              sx={[
                (theme) => ({
                  color: darken(label.color, 0.24),
                  bgcolor: hexAlpha(label.color, 0.16),
                  ...theme.applyStyles('dark', {
                    color: lighten(label.color, 0.24),
                  }),
                }),
              ]}
            >
              {label.name}
            </Label>
          ) : null;
        })}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} disabled={isRefreshing}>
            <Iconify icon={isRefreshing ? "eos-icons:loading" : "mdi:refresh"} />
          </IconButton>
        </Tooltip>

        <Tooltip title={isStarred ? "Unstar" : "Star"}>
          <IconButton 
            onClick={handleToggleStarred}
            disabled={isUpdating}
            color={isStarred ? "warning" : "default"}
          >
            <Iconify 
              icon={isStarred ? "eva:star-fill" : "eva:star-outline"} 
              sx={{ 
                ...(isUpdating && { animation: 'spin 1s linear infinite' }),
              }} 
            />
          </IconButton>
        </Tooltip>

        <Tooltip title={isImportant ? "Mark not important" : "Mark important"}>
          <IconButton 
            onClick={handleToggleImportant}
            disabled={isUpdating}
            color={isImportant ? "warning" : "default"}
          >
            <Iconify 
              icon="material-symbols:label-important-rounded"
              sx={{ 
                ...(isUpdating && { animation: 'spin 1s linear infinite' }),
                transform: isImportant ? 'none' : 'rotate(180deg)',
              }} 
            />
          </IconButton>
        </Tooltip>

        <Tooltip title="Archive">
          <IconButton>
            <Iconify icon="solar:archive-down-minimlistic-bold" />
          </IconButton>
        </Tooltip>

        <Tooltip title={isRead ? "Mark as Unread" : "Mark as Read"}>
          <IconButton 
            onClick={handleToggleRead}
            disabled={isUpdating}
            color={!isRead ? "primary" : "default"}
          >
            <Iconify 
              icon={isRead ? "fluent:mail-read-20-filled" : "fluent:mail-unread-20-filled"}
              sx={{ 
                ...(isUpdating && { animation: 'spin 1s linear infinite' }),
              }} 
            />
          </IconButton>
        </Tooltip>

        <Tooltip title="Trash">
          <IconButton>
            <Iconify icon="solar:trash-bin-trash-bold" />
          </IconButton>
        </Tooltip>
      </Box>
    </>
  );

  const renderSubject = () => (
    <>
      <Typography
        variant="subtitle2"
        sx={[
          (theme) => ({
            ...theme.mixins.maxLine({ line: 2 }),
            flex: '1 1 auto',
          }),
        ]}
      >
        {mail?.subject}
      </Typography>

      <Stack spacing={0.5}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Tooltip title="Reply">
            <IconButton size="small" onClick={handleReply}>
              <Iconify width={18} icon="solar:reply-bold" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Forward">
            <IconButton size="small" onClick={handleForward}>
              <Iconify width={18} icon="solar:forward-bold" />
            </IconButton>
          </Tooltip>
        </Box>

        <Typography variant="caption" noWrap sx={{ color: 'text.disabled' }}>
          {fDateTime(new Date(mail?.date))}
        </Typography>
      </Stack>
    </>
  );

  const renderSender = () => (
    <>
      <Avatar alt={fromName} sx={{ mr: 2 }}>
        {fromName.charAt(0).toUpperCase()}
      </Avatar>

      <Stack spacing={0.5} sx={{ width: 0, flexGrow: 1 }}>
        <Box sx={{ gap: 0.5, display: 'flex' }}>
          <Typography component="span" variant="subtitle2" sx={{ flexShrink: 0 }}>
            {fromName}
          </Typography>
          <Typography component="span" noWrap variant="body2" sx={{ color: 'text.secondary' }}>
            {`<${fromEmail}>`}
          </Typography>
        </Box>

        <Typography noWrap component="span" variant="caption" sx={{ color: 'text.secondary' }}>
          {`To: ${mail?.to || 'me'}`}
        </Typography>
      </Stack>
    </>
  );

  const renderAttachments = () => (
    <Stack spacing={1} sx={{ p: 1, borderRadius: 1, bgcolor: 'background.neutral' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <ButtonBase
          onClick={showAttachments.onToggle}
          sx={{
            p: 1,
            gap: 1,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Iconify icon={showAttachments.value ? 'eva:arrow-ios-downward-fill' : 'eva:arrow-ios-forward-fill'} />
          <Box component="span" sx={{ typography: 'caption', color: 'text.secondary' }}>
            {mail?.attachments?.length || 0} Attachments
          </Box>
        </ButtonBase>

        {mail?.attachments?.length > 0 && (
          <Tooltip title="Download all">
            <IconButton size="small" onClick={handleDownloadAllAttachments}>
              <Iconify icon="eva:download-fill" width={20} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Collapse in={showAttachments.value}>
        <Box
          gap={1}
          display="grid"
          gridTemplateColumns={{
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)',
          }}
        >
          {mail?.attachments?.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              downloading={downloadingAttachments[file.id]}
              onDownload={() => handleDownloadAttachment(file)}
            />
          ))}
        </Box>
      </Collapse>
    </Stack>
  );

  const renderContent = () => (
    <Box sx={{ p: 3 }}>
      {/* Show calendar event view if this is an event email */}
      {isEvent && eventDetails && (
        <CalendarEventView 
          eventDetails={eventDetails} 
          mailId={mail?.id}
        />
      )}
      
      {/* Show regular email content */}
      <Markdown children={mail?.body || mail?.snippet || ''} />
    </Box>
  );

  return (
    <>
      <Box
        sx={{
          p: 2,
          gap: 2,
          display: 'flex',
          alignItems: 'center',
          borderBottom: (theme) => `solid 1px ${theme.palette.divider}`,
        }}
      >
        {renderHead()}
      </Box>

      <Box
        sx={{
          p: 2,
          gap: 2,
          display: 'flex',
          alignItems: 'flex-start',
          borderBottom: (theme) => `solid 1px ${theme.palette.divider}`,
        }}
      >
        {renderSubject()}
      </Box>

      <Box
        sx={{
          p: 2,
          gap: 2,
          display: 'flex',
          alignItems: 'flex-start',
          borderBottom: (theme) => `solid 1px ${theme.palette.divider}`,
        }}
      >
        {renderSender()}
      </Box>

      <Scrollbar>
        {!!mail?.attachments?.length && renderAttachments()}

        {renderContent()}
      </Scrollbar>
    </>
  );
}

// ----------------------------------------------------------------------

function FileItem({ file, downloading, onDownload }) {
  return (
    <Box
      sx={{
        p: 1,
        borderRadius: 1,
        cursor: 'pointer',
        position: 'relative',
        '&:hover': {
          bgcolor: 'background.paper',
        },
      }}
      onClick={onDownload}
    >
      <Box
        sx={{
          p: 1,
          mb: 0.5,
          borderRadius: 1,
          overflow: 'hidden',
          position: 'relative',
          bgcolor: 'background.paper',
        }}
      >
        <FileThumbnail file={file.filename} />
        
        {downloading && (
          <Box
            sx={{
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              position: 'absolute',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (theme) => hexAlpha(theme.palette.background.neutral, 0.8),
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}
      </Box>

      <Stack spacing={0.5}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {file.filename}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
          {fData(file.size)}
        </Typography>
      </Stack>
    </Box>
  );
}
