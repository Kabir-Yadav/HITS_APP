import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

import { fToNow } from 'src/utils/format-time';
import { fDateTime } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';
import { FileThumbnail } from 'src/components/file-thumbnail';

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
  console.log(createdAt)
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
  const renderAttachments = (isCurrentUser) => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <Stack spacing={1} sx={{ mb: 1, alignItems: isCurrentUser ? 'end' : 'start' }}>
        {attachments.map((attachment, index) => {
          const fileType = attachment.type.toLowerCase();
          const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileType);

          return isImage ? (
            // ✅ Display images properly and pass correct `path`
            <Box
              key={attachment.name + index}
              component="img"
              alt="Attachment"
              src={attachment.path} // ✅ Use correct S3 URL
              onClick={() => onOpenLightbox(attachment.path)} // ✅ Pass correct image URL
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
              sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}
            >
              <FileThumbnail
                imageView
                file={attachment.preview}
                onDownload={() => window.open(attachment.path, '_blank')}
                slotProps={{ icon: { sx: { width: 24, height: 24 } } }}
                sx={{ width: 40, height: 40, bgcolor: 'background.neutral' }}
              />

              <ListItemText
                primary={attachment.name}
                secondary={fDateTime(attachment.createdAt)}
                slotProps={{
                  primary: { noWrap: true, sx: { typography: 'body2' } },
                  secondary: {
                    noWrap: true,
                    sx: {
                      mt: 1,
                      typography: 'caption',
                      color: 'text.disabled',
                    },
                  },
                }}
              />
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
          maxWidth: 400,
          width: 'fit-content',
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
            maxWidth: 'fit-content',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            '&:hover': { '& .message-actions': { opacity: 1 } },
          }}
        >
          <Stack spacing={1} alignItems={me ? 'flex-end' : 'flex-start'}>
            {renderAttachments(me)} {/* ✅ Attachments are displayed first */}
            {renderBody()} {/* ✅ Message text appears below attachments */}
          </Stack>
          {renderActions()}
        </Box>
      </Stack>
    </Box>
  );
}
