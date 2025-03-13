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
    content_type: detectContentType(),
    attachments: attachment ? [attachment] : [],
    created_at: fSub({ minutes: 1 }),
    sender_id: me.id,
  };

  const conversationData = {
    id: isGroup ? uuidv4() : recipients[0]?.id,
    messages: [messageData],
    participants: [...recipients, me],
    is_group: isGroup ? true : false,
  };

  return { messageData, conversationData };
}
