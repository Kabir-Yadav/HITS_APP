import { uuidv4 } from "minimal-shared/utils";

import { fSub } from "src/utils/format-time";

// ----------------------------------------------------------------------

export function initialConversation({ message = "", recipients, me, attachment = null }) {
  const isGroup = recipients.length > 1;

  const detectContentType = () => {
    if (attachment) return attachment.type.includes("image") ? "image" : "file";
    if (message.startsWith("data:image/")) return "image";
    if (message.startsWith("data:application/")) return "file";
    return "text";
  };

  const messageData = {
    id: uuidv4(),
    body: attachment ? "" : message, // ✅ If attachment exists, no text body
    contentType: detectContentType(),
    attachments: attachment ? [attachment] : [],
    createdAt: fSub({ minutes: 1 }),
    senderId: me.id,
  };

  const conversationData = {
    id: isGroup ? uuidv4() : recipients[0]?.id,
    messages: [messageData],
    participants: [...recipients, me],
    type: isGroup ? "GROUP" : "ONE_TO_ONE",
    unreadCount: 0,
  };

  return { messageData, conversationData };
}
