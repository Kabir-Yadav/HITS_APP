// ----------------------------------------------------------------------

export function getMessage({ message, participants, currentUserId }) {
  const sender = participants.find((participant) => participant.id === message.senderId);

  const isCurrentUser = message.senderId === currentUserId;

  const senderDetails = isCurrentUser
    ? { type: "me" }
    : { avatarUrl: sender?.avatarUrl, firstName: sender?.name?.split(" ")[0] ?? "Unknown" };
  // console.log(message)
  // ✅ Detect Images
  const hasImage = message.contentType?.startsWith("image");

  // ✅ Detect Files (PDFs, ZIPs, DOCs, etc.)
  const hasFile = message.contentType?.startsWith("application");

  // ✅ Detect Folders (Assuming folders are marked as `[FOLDER]` in body)
  const hasFolder = message.body?.includes("[FOLDER]");

  return { hasImage, hasFile, hasFolder, me: isCurrentUser, senderDetails };
}
