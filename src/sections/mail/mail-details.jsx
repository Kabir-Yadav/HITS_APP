import { mutate } from 'swr';
import { useState, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
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
import { downloadAttachment } from 'src/utils/gmail';

import { CONFIG } from 'src/global-config';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Markdown } from 'src/components/markdown';
import { Scrollbar } from 'src/components/scrollbar';
import { EmptyContent } from 'src/components/empty-content';
import { FileThumbnail } from 'src/components/file-thumbnail';
import { LoadingScreen } from 'src/components/loading-screen';


// ----------------------------------------------------------------------

export function MailDetails({ mail, renderLabel, isEmpty, error, loading }) {
  const showAttachments = useBoolean(true);
  const isStarred = useBoolean(mail?.labelIds?.includes('STARRED'));
  const isImportant = useBoolean(mail?.labelIds?.includes('IMPORTANT'));

  // Extract sender info
  const fromName = mail?.from ? mail.from.split('<')[0].trim() || mail.from.split('@')[0] : 'Unknown';
  const fromEmail = mail?.from ? (mail.from.match(/<(.+)>/) || [])[1] || mail.from : '';

  // State for tracking downloading attachments
  const [downloadingAttachments, setDownloadingAttachments] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);

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

        <Checkbox
          color="warning"
          icon={<Iconify icon="eva:star-outline" />}
          checkedIcon={<Iconify icon="eva:star-fill" />}
          checked={isStarred.value}
          onChange={isStarred.onToggle}
          inputProps={{ id: 'starred-checkbox', 'aria-label': 'Starred checkbox' }}
        />

        <Checkbox
          color="warning"
          icon={<Iconify icon="material-symbols:label-important-rounded" />}
          checkedIcon={<Iconify icon="material-symbols:label-important-rounded" />}
          checked={isImportant.value}
          onChange={isImportant.onToggle}
          inputProps={{ id: 'important-checkbox', 'aria-label': 'Important checkbox' }}
        />

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

        <IconButton>
          <Iconify icon="eva:more-vertical-fill" />
        </IconButton>
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
          <IconButton size="small">
            <Iconify width={18} icon="solar:reply-bold" />
          </IconButton>

          <IconButton size="small">
            <Iconify width={18} icon="solar:multiple-forward-left-broken" />
          </IconButton>

          <IconButton size="small">
            <Iconify width={18} icon="solar:forward-bold" />
          </IconButton>
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
