// ----------------------------------------------------------------------

export function getNavItem({ currentUserId, conversation }) {
  const { messages, participants, id: conversationId, groups } = conversation;
  // Filter out the current user from participants
  const participantsInConversation = participants.filter(
    (participant) => participant.id !== currentUserId
  );
  const lastMessage = messages[messages.length - 1];
  const isGroup = conversation.type === "GROUP";

  // Use group details if available
  const displayName =
    isGroup && groups && groups.group_name
      ? groups.group_name
      : participantsInConversation
        .map((participant) => participant.name || '')
        .join(', ') || 'Unnamed Group';
  const groupAvatar =
    isGroup && groups && groups.group_icon ? groups.group_icon : null;
  const hasOnlineInGroup = isGroup
    ? participantsInConversation.some((item) => item.status === 'online')
    : false;

  let displayText = '';
  if (lastMessage) {
    const lastAttachment =
      lastMessage.attachments && lastMessage.attachments.length > 0
        ? lastMessage.attachments[lastMessage.attachments.length - 1]
        : null;
    const sender = lastMessage.senderId === currentUserId ? 'You: ' : '';
    const message =
      lastMessage.body === ''
        ? lastAttachment
          ? `Sent a ${lastAttachment.type}`
          : 'Sent a file'
        : lastMessage.body;
    displayText = `${sender}${message}`;
  }

  return {
    group: isGroup,
    displayName,
    displayText,
    participants: participantsInConversation,
    groupAvatar,
    lastActivity: lastMessage?.createdAt,
    hasOnlineInGroup,
  };
}
