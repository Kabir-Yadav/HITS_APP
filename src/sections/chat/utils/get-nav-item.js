// ----------------------------------------------------------------------

export function getNavItem({ currentUserId, conversation }) {
  const { messages, participants } = conversation;

  const participantsInConversation = participants.filter(
    (participant) => participant.id !== currentUserId
  );

  const lastMessage = messages[messages.length - 1];

  const group = participantsInConversation.length > 1;

  const displayName = participantsInConversation.map((participant) => participant.name).join(', ');

  const hasOnlineInGroup = group
    ? participantsInConversation.map((item) => item.status).includes('online')
    : false;

  let displayText = '';

  if (lastMessage) {
    const lastAttachment = lastMessage.attachments && lastMessage.attachments.length > 0
      ? lastMessage.attachments[lastMessage.attachments.length - 1]
      : null;

    const sender = lastMessage.senderId === currentUserId ? 'You: ' : '';

    const message = lastMessage.body === '' ? lastAttachment ? `Sent a ${lastAttachment.type}` : 'Sent a file' : lastMessage.body;

    displayText = `${sender}${message}`;
  }

  return {
    group,
    displayName,
    displayText,
    participants: participantsInConversation,
    lastActivity: lastMessage?.createdAt,
    hasOnlineInGroup,
  };
}
