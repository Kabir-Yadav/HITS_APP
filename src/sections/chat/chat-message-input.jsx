import { uuidv4 } from 'minimal-shared/utils';
import { useRef, useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import { Stack } from '@mui/material';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { today } from 'src/utils/format-time';
import { fDateTime } from 'src/utils/format-time';

import { sendMessage, createConversation } from 'src/actions/chat';

import { Iconify } from 'src/components/iconify';
import { FileThumbnail, formatFileSize } from 'src/components/file-thumbnail';

import { useMockedUser } from 'src/auth/hooks';

import { initialConversation } from './utils/initial-conversation';

// ----------------------------------------------------------------------

export function ChatMessageInput({
  disabled,
  recipients,
  onAddRecipients,
  selectedConversationId,
}) {
  const router = useRouter();

  const { user } = useMockedUser();

  const fileRef = useRef(null);

  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]); // ✅ Store multiple attachments

  const myContact = useMemo(
    () => ({
      id: `${user?.id}`,
      role: `${user?.role}`,
      email: `${user?.email}`,
      address: `${user?.address}`,
      name: `${user?.name}`,
      lastActivity: today(),
      avatarUrl: `${user?.avatar_url}`,
      phoneNumber: `${user?.phone_number}`,
      status: 'online',
    }),
    [user]
  );

  const { messageData, conversationData } = initialConversation({
    message,
    recipients,
    me: myContact,
    attachments,
  });

  const handleAttach = useCallback(() => {
    if (fileRef.current) {
      fileRef.current.click();
    }
  }, []);

  const handleChangeMessage = useCallback((event) => {
    setMessage(event.target.value);
  }, []);

  const handleFileChange = useCallback((event) => {
    const files = Array.from(event.target.files);
    const newAttachments = [];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newAttachments.push({
          id: uuidv4(),
          name: file.name,
          path: e.target.result,
          preview: e.target.result,
          size: file.size,
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          type: file.type.split('/')[1],
        });

        if (newAttachments.length === files.length) {
          // ✅ Ensures all attachments are added before updating state
          setAttachments((prev) => [...prev, ...newAttachments]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleSendMessage = useCallback(
    async (event) => {
      if (event.key !== 'Enter' && event.type !== 'click') return;

      try {
        let finalMessageData = { ...messageData, body: message };

        if (attachments.length > 0) {
          finalMessageData = {
            ...finalMessageData, // ✅ Preserve existing data
            attachments: [...attachments], // ✅ Ensure attachments are included
            contentType: attachments.some((att) => att.type.includes('image')) ? 'image' : 'file',
          };
        }

        console.log('Sending message:', finalMessageData); // ✅ Debug before sending

        if (selectedConversationId) {
          await sendMessage(selectedConversationId, user?.id, finalMessageData);
        } else {
          const res = await createConversation(conversationData);
          router.push(`${paths.dashboard.chat}?id=${res.conversation.id}`);
          onAddRecipients([]);
        }

        setMessage('');
        setAttachments([]); // ✅ Clear attachments only after sending
      } catch (error) {
        console.error(error);
      }
    },
    [
      message,
      attachments,
      selectedConversationId,
      user?.id,
      conversationData,
      router,
      onAddRecipients,
    ]
  );

  return (
    <>
      {/* ✅ Small preview inside input like WhatsApp */}
      {attachments.length > 0 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 1,
            p: 1,
            borderRadius: 1,
            flexWrap: "wrap", // ✅ Ensures multiple previews fit
            gap: 1, // ✅ Adds spacing between previews
          }}
        >
          {attachments.map((file) => {
            const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(file.type);

            return (
              <Stack key={file.id} sx={{ position: "relative", alignItems: "center" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: 1,
                    maxWidth: 180, // ✅ Prevents taking full width
                    borderRadius: 5
                  }}
                >
                  {/* ✅ Close Button Only for Images */}
                  {isImage && (
                    <IconButton
                      onClick={() =>
                        setAttachments((prev) => prev.filter((item) => item.id !== file.id))
                      }
                      sx={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        width: 30,
                        height: 30,
                        color: "white",
                        backgroundColor: "rgba(0, 0, 0, 0.5)", // ✅ Semi-transparent background
                        "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.7)" }, // ✅ Darker on hover
                      }}
                    >
                      <Iconify icon="mingcute:close-line" width={18} />
                    </IconButton>
                  )}

                  {/* ✅ Image Preview */}
                  {isImage ? (
                    <img
                      src={file.preview}
                      alt="Preview"
                      style={{ width: 110, height: 100, borderRadius: 5 }}
                    />
                  ) : (
                    // ✅ File Icon for Non-Image Files
                    <></>
                  )}
                </Box>

                {/* ✅ File Display for Non-Image Files */}
                {!isImage && (
                  <Box sx={{ boxShadow: 1, p: .5, borderRadius: 2, maxWidth: 200, gap: 1.5, display: "flex", alignItems: "center" }}>
                    <FileThumbnail
                      imageView
                      file={file.type}
                      onRemove
                      slotProps={{ icon: { sx: { width: 24, height: 24 } } }}
                      sx={{ width: 40, height: 40, bgcolor: "background.neutral" }}
                    />

                    <ListItemText
                      primary={file.name}
                      secondary={formatFileSize(file.size)}
                      slotProps={{
                        primary: { noWrap: true, sx: { typography: "body2" } },
                        secondary: {
                          noWrap: true,
                          sx: {
                            mt: 0.25,
                            typography: "caption",
                            color: "text.disabled",
                          },
                        },
                      }}
                    />
                  </Box>
                )}
              </Stack>
            );
          })}
        </Box>
      )}


      <InputBase
        name="chat-message"
        id="chat-message-input"
        value={message}
        onKeyUp={handleSendMessage}
        onChange={handleChangeMessage}
        placeholder="Type a message"
        disabled={disabled}
        startAdornment={
          <IconButton>
            <Iconify icon="eva:smiling-face-fill" />
          </IconButton>
        }
        endAdornment={
          <Box sx={{ flexShrink: 0, display: 'flex' }}>
            <IconButton onClick={handleAttach}>
              <Iconify icon="solar:gallery-add-bold" />
            </IconButton>
            <IconButton onClick={handleAttach}>
              <Iconify icon="eva:attach-2-fill" />
            </IconButton>
            <IconButton>
              <Iconify icon="solar:microphone-bold" />
            </IconButton>
          </Box>
        }
        sx={[
          (theme) => ({
            px: 1,
            height: 56,
            flexShrink: 0,
            borderTop: `solid 1px ${theme.vars.palette.divider}`,
          }),
        ]}
      />

      <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={handleFileChange} />
    </>
  );
}
