import { mutate } from 'swr';
import { useBoolean } from 'minimal-shared/hooks';
import { useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
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
import { downloadAttachment, prepareReply, prepareForward, toggleStarred, toggleImportant, sendCalendarResponse } from 'src/utils/gmail';

import { CONFIG } from 'src/global-config';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Markdown } from 'src/components/markdown';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { FileThumbnail } from 'src/components/file-thumbnail';
import { LoadingScreen } from 'src/components/loading-screen';


// ----------------------------------------------------------------------

// Helper function to check if email is a calendar invite
const isCalendarInvite = (mail) => {
  if (!mail) return false;
  return mail.subject?.startsWith('Invitation:') || 
         mail.subject?.startsWith('Updated invitation:');
};

// Helper function to get current response status
const getResponseStatus = (mail) => {
  if (!mail?.labelIds) return 'none';
  if (mail.labelIds.includes('ACCEPTED')) return 'yes';
  if (mail.labelIds.includes('TENTATIVE')) return 'maybe';
  if (mail.labelIds.includes('DECLINED')) return 'no';
  return 'none';
};

// Helper function to parse calendar event details from email body
const parseCalendarEvent = (body) => {
  if (!body) return null;

  // Extract event details using regex
  const meetLinkMatch = body.match(/meet\.google\.com\/[a-z-]+/);
  const whenMatch = body.match(/When\s*([^\n]+)/);
  const phoneMatch = body.match(/Join by phone[^\n]*\n([^P]+)PIN: ([0-9]+)/);
  const organizerMatch = body.match(/Organizer\s*([^\n]+)/);

  return {
    meetLink: meetLinkMatch ? `https://${meetLinkMatch[0]}` : null,
    when: whenMatch ? whenMatch[1].trim() : null,
    phone: phoneMatch ? {
      number: phoneMatch[1].trim(),
      pin: phoneMatch[2].trim()
    } : null,
    organizer: organizerMatch ? organizerMatch[1].trim() : null
  };
};

export function MailDetails({ mail, renderLabel, isEmpty, error, loading, onCompose }) {
  const showAttachments = useBoolean(true);
  const [isStarred, setIsStarred] = useState(mail?.labelIds?.includes('STARRED') || false);
  const [isImportant, setIsImportant] = useState(mail?.labelIds?.includes('IMPORTANT') || false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Update state when mail changes
  useEffect(() => {
    if (mail) {
      setIsStarred(mail.labelIds?.includes('STARRED') || false);
      setIsImportant(mail.labelIds?.includes('IMPORTANT') || false);
    }
  }, [mail]);

  // Extract sender info
  const fromName = mail?.from ? mail.from.split('<')[0].trim() || mail.from.split('@')[0] : 'Unknown';
  const fromEmail = mail?.from ? (mail.from.match(/<(.+)>/) || [])[1] || mail.from : '';

  // State for tracking downloading attachments
  const [downloadingAttachments, setDownloadingAttachments] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [rsvpStatus, setRsvpStatus] = useState(getResponseStatus(mail));
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);

  // Update RSVP status when mail changes
  useEffect(() => {
    setRsvpStatus(getResponseStatus(mail));
  }, [mail]);

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

  const handleRsvp = useCallback(async (response) => {
    if (!mail?.id || isRsvpLoading) return;

    try {
      setIsRsvpLoading(true);
      await sendCalendarResponse(mail.id, response);
      setRsvpStatus(response);
      
      // Refresh both the current mail and the mail list
      await Promise.all([
        mutate(`gmail-message-${mail.id}`),
        mutate(['gmail-messages', 'inbox']),
        mutate(['gmail-messages', 'sent']),
      ]);
    } catch (rsvperror) {
      console.error('Error sending RSVP:', rsvperror);
      // Revert the status if there was an error
      setRsvpStatus(getResponseStatus(mail));
    } finally {
      setIsRsvpLoading(false);
    }
  }, [mail?.id, isRsvpLoading]);

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

        <Tooltip title="Mark Unread">
          <IconButton>
            <Iconify icon="fluent:mail-unread-20-filled" />
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

  const renderCalendarInvite = () => {
    if (!mail?.body) return null;

    const eventDetails = parseCalendarEvent(mail.body);
    if (!eventDetails) return null;

    const showRsvpButtons = isCalendarInvite(mail);

    return (
      <Box
        sx={{
          p: 3,
          gap: 2,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 1,
          bgcolor: 'background.neutral'
        }}
      >
        {/* Event Time */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'background.paper',
              textAlign: 'center',
              minWidth: 80
            }}
          >
            <Typography variant="h6" sx={{ lineHeight: 1 }}>
              {new Date(eventDetails.when).getDate()}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {new Date(eventDetails.when).toLocaleString('default', { month: 'short' })}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1">
              {mail.subject.replace(/^(Invitation: |Accepted: |Declined: |Tentative: )/, '')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {eventDetails.when}
            </Typography>
          </Box>
        </Box>

        {/* RSVP Buttons - only show for invitations */}
        {showRsvpButtons && (
          <Stack direction="row" spacing={1}>
            <Button
              variant={rsvpStatus === 'yes' ? 'contained' : 'outlined'}
              color="success"
              disabled={isRsvpLoading}
              onClick={() => handleRsvp('yes')}
              startIcon={<Iconify icon="ic:round-check-circle" />}
              sx={{
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Yes
            </Button>
            <Button
              variant={rsvpStatus === 'maybe' ? 'contained' : 'outlined'}
              color="warning"
              disabled={isRsvpLoading}
              onClick={() => handleRsvp('maybe')}
              startIcon={<Iconify icon="ic:round-help" />}
              sx={{
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              Maybe
            </Button>
            <Button
              variant={rsvpStatus === 'no' ? 'contained' : 'outlined'}
              color="error"
              disabled={isRsvpLoading}
              onClick={() => handleRsvp('no')}
              startIcon={<Iconify icon="ic:round-cancel" />}
              sx={{
                textTransform: 'none',
                fontWeight: 500
              }}
            >
              No
            </Button>
          </Stack>
        )}

        <Divider />

        {/* Meet Link */}
        {eventDetails.meetLink && (
          <Button
            variant="contained"
            href={eventDetails.meetLink}
            target="_blank"
            startIcon={
              <Iconify 
                icon="logos:google-meet" 
                sx={{ 
                  width: 20, 
                  height: 20,
                  mr: 0.5 
                }} 
              />
            }
            sx={{
              alignSelf: 'flex-start',
              bgcolor: '#00796b',
              color: '#fff',
              px: 2.5,
              py: 1,
              borderRadius: '100px',
              textTransform: 'none',
              fontSize: '0.9375rem',
              fontWeight: 500,
              letterSpacing: '0.25px',
              boxShadow: '0 1px 2px 0 rgba(60,64,67,0.302), 0 1px 3px 1px rgba(60,64,67,0.149)',
              '&:hover': {
                bgcolor: '#00695c',
                boxShadow: '0 1px 3px 0 rgba(60,64,67,0.302), 0 4px 8px 3px rgba(60,64,67,0.149)'
              }
            }}
          >
            Join with Google Meet
          </Button>
        )}

        {/* Phone Details */}
        {eventDetails.phone && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 0.5,
            mt: 2 
          }}>
            <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
              Join by phone
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {eventDetails.phone.number}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              PIN: {eventDetails.phone.pin}
            </Typography>
          </Box>
        )}

        {/* Organizer */}
        {eventDetails.organizer && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Organized by {eventDetails.organizer}
          </Typography>
        )}
      </Box>
    );
  };

  const renderContent = () => {
    if (!mail?.body) return null;

    if (isCalendarInvite(mail)) {
      return renderCalendarInvite();
    }

    return (
      <Box sx={{ p: 3 }}>
        <Markdown children={mail?.body || mail?.snippet || ''} />
      </Box>
  );
  };

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
