import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';

import { Scrollbar } from 'src/components/scrollbar';
import { Lightbox, useLightBox } from 'src/components/lightbox';

import { ChatMessageItem } from './chat-message-item';
import { useMessagesScroll } from './hooks/use-messages-scroll';

// ----------------------------------------------------------------------

export function ChatMessageList({ messages = [], conversationId, participants, loading, onReply }) {
  const { messagesEndRef } = useMessagesScroll(messages);

  // ✅ Collect all image attachments from messages
  const slides = messages.flatMap(
    (message) =>
      message.attachments
        ?.filter(
          (attachment) =>
            attachment.type.startsWith('image/') ||
            ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(attachment.type.toLowerCase())
        )
        .map((attachment) => ({ src: attachment.preview ?? attachment.path })) || []
  );

  const lightbox = useLightBox(slides);

  if (loading) {
    return (
      <Stack sx={{ flex: '1 1 auto', position: 'relative' }}>
        <LinearProgress
          color="inherit"
          sx={{
            top: 0,
            left: 0,
            width: 1,
            height: 2,
            borderRadius: 0,
            position: 'absolute',
          }}
        />
      </Stack>
    );
  }

  return (
    <>
      <Scrollbar
        ref={messagesEndRef}
        sx={{
          px: 3,
          pt: 5,
          pb: 3,
          flex: '1 1 auto',
        }}
      >
        {messages.map((message) => (
          <ChatMessageItem
            key={message.id}
            message={message}
            conversationId={conversationId}
            participants={participants}
            onOpenLightbox={(imageUrl) => {
              lightbox.onOpen(imageUrl);
            }}
            onReply={onReply} // ✅ Pass to each message item
            allmessages={messages}
          />
        ))}
      </Scrollbar>

      <Lightbox
        slides={slides}
        open={lightbox.open}
        close={lightbox.onClose}
        index={lightbox.selected}
      />
    </>
  );
}
