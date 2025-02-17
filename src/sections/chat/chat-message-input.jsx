import { uuidv4 } from 'minimal-shared/utils';
import { useRef, useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { today } from 'src/utils/format-time';

import { sendMessage, createConversation } from 'src/actions/chat';

import { Iconify } from 'src/components/iconify';

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
            display: 'flex',
            alignItems: 'center',
            mb: 1,
            p: 1,
            borderRadius: 1,
            flexWrap: 'wrap', // ✅ Ensures multiple previews fit
            gap: 1, // ✅ Adds spacing between previews
          }}
        >
          {attachments.map((file) => (
            <Box
              key={file.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1,
                borderRadius: 1,
                backgroundColor: 'background.default',
                boxShadow: 1,
                maxWidth: 180, // ✅ Prevents taking full width
              }}
            >
              {file.type.includes('image') ? (
                <img
                  src={file.preview}
                  alt="Preview"
                  style={{ width: 50, height: 50, borderRadius: 5, marginRight: 8 }}
                />
              ) : (
                <Iconify
                  icon="eva:file-text-outline"
                  width={40}
                  sx={{ color: 'text.secondary', mr: 1 }}
                />
              )}
              <Typography
                variant="body2"
                sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {file.name}
              </Typography>
              <IconButton
                onClick={() => setAttachments((prev) => prev.filter((item) => item.id !== file.id))}
                sx={{ ml: 1 }}
              >
                <Iconify icon="eva:close-circle-outline" width={20} />
              </IconButton>
            </Box>
          ))}
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
