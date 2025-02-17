import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fToNow } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

import { useMockedUser } from 'src/auth/hooks';

import { getMessage } from './utils/get-message';

// ----------------------------------------------------------------------

export function ChatMessageItem({ message, participants, onOpenLightbox }) {
  const { user } = useMockedUser();

  const { me, senderDetails, hasImage, hasFile } = getMessage({
    message,
    participants,
    currentUserId: `${user?.id}`,
  });
  const { firstName, avatarUrl } = senderDetails;

  const { body, createdAt, attachments } = message;

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

  // ✅ Function to Render Attachments First
  const renderAttachments = () => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <Stack spacing={1} sx={{ mb: 1 }}>
        {attachments.map((attachment) => {
          // ✅ Normalize Type Handling
          const fileType = attachment.type.toLowerCase();
          const isImage =
            fileType.includes('image') ||
            ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileType);

          return (
            <Box
              key={attachment.id}
              sx={{
                p: 1.5,
                borderRadius: 1,
                maxWidth: 320,
                bgcolor: 'background.neutral',
                display: 'flex',
                alignItems: 'center',
                ...(me && { bgcolor: 'primary.lighter' }),
              }}
            >
              {/* ✅ Render Image Preview Instead of Name */}
              {isImage ? (
                <Box
                  component="img"
                  alt="Attachment"
                  src={attachment.path} // ✅ Use correct S3 URL
                  onClick={() => onOpenLightbox(attachment.path)}
                  sx={{
                    width: 250,
                    height: 'auto',
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    objectFit: 'cover',
                    aspectRatio: '16/11',
                    '&:hover': { opacity: 0.9 },
                  }}
                />
              ) : (
                <Stack direction="row" alignItems="center">
                  <Iconify icon="eva:file-text-outline" width={24} sx={{ mr: 1 }} />
                  <Typography
                    variant="body2"
                    sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    <a
                      href={attachment.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      {attachment.name}
                    </a>
                  </Typography>
                </Stack>
              )}
            </Box>
          );
        })}
      </Stack>
    );
  };

  // ✅ Render Message Text (After Attachments)
  const renderBody = () => {
    if (!body) return null; // ✅ Don't render empty messages
    return (
      <Stack
        sx={{
          p: 1.5,
          minWidth: 48,
          maxWidth: 320,
          borderRadius: 1,
          typography: 'body2',
          bgcolor: 'background.neutral',
          ...(me && { color: 'grey.800', bgcolor: 'primary.lighter' }),
        }}
      >
        {body}
      </Stack>
    );
  };

  // ✅ Render Actions (Reply, Delete)
  const renderActions = () => (
    <Box
      className="message-actions"
      sx={(theme) => ({
        pt: 0.5,
        left: 0,
        opacity: 0,
        top: '100%',
        display: 'flex',
        position: 'absolute',
        transition: theme.transitions.create(['opacity'], {
          duration: theme.transitions.duration.shorter,
        }),
        ...(me && { right: 0, left: 'unset' }),
      })}
    >
      <IconButton size="small">
        <Iconify icon="solar:reply-bold" width={16} />
      </IconButton>

      <IconButton size="small">
        <Iconify icon="eva:smiling-face-fill" width={16} />
      </IconButton>

      <IconButton size="small">
        <Iconify icon="solar:trash-bin-trash-bold" width={16} />
      </IconButton>
    </Box>
  );

  return (
    <Box sx={{ mb: 5, display: 'flex', justifyContent: me ? 'flex-end' : 'unset' }}>
      {!me && <Avatar alt={firstName} src={avatarUrl} sx={{ width: 32, height: 32, mr: 2 }} />}

      <Stack alignItems={me ? 'flex-end' : 'flex-start'}>
        {renderInfo()}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            '&:hover': { '& .message-actions': { opacity: 1 } },
          }}
        >
          <Stack spacing={1}>
            {renderAttachments()} {/* ✅ Attachments are displayed first */}
            {renderBody()} {/* ✅ Message text appears below attachments */}
          </Stack>
          {renderActions()}
        </Box>
      </Stack>
    </Box>
  );
}
