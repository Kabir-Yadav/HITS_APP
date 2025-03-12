import { keyBy } from 'es-toolkit';
import useSWR, { mutate } from 'swr';
import { useMemo, useState, useEffect, useId } from 'react';

import { supabase } from 'src/lib/supabase';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

const CHAT_CACHE_KEY = 'chat_board';

/* ----------------------------------------------------------------------
   1) Fetch Contacts (Users)
   ---------------------------------------------------------------------- */
export function useGetContacts() {
  const { data, error, isLoading, isValidating } = useSWR(
    'contacts',
    async () => {
      const { data: contactsData, error: contactsError } = await supabase.from('user_info').select('*');
      if (contactsError) throw error;
      return {
        contacts: contactsData,
      };
    },
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      contacts: data?.contacts || [],
      contactsLoading: isLoading,
      contactsError: error,
      contactsValidating: isValidating,
      contactsEmpty: !isLoading && !isValidating && !data.length,
    }),
    [data, error, isLoading, isValidating]
  );
  return memoizedValue;
}

/* ----------------------------------------------------------------------
   2️⃣ Fetch Conversations for a User
---------------------------------------------------------------------- */
export function useGetConversations(userId) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return () => { };

    async function fetchConversations() {
      setLoading(true);

      try {
        // 🔹 Step 1: Get conversations where the user is a participant
        const { data: userConversations, error: convError } = await supabase
          .from("conversation_participants")
          .select(`
            conversation_id, 
            conversations ( id, name, is_group, created_at )
          `)
          .eq("participant_id", userId);

        if (convError) throw convError;
        if (!userConversations.length) {
          setLoading(false);
          return;
        }

        const conversationIds = userConversations.map((c) => c.conversations.id);

        // 🔹 Step 2: Fetch participants for each conversation
        const { data: participantsData, error: participantsError } = await supabase
          .from("conversation_participants")
          .select(`
            conversation_id, 
            participant_id,
            user_info: user_info (
              id,
              email,
              full_name,
              phone_number,
              avatar_url,
              role
            )
          `)
          .in("conversation_id", conversationIds);

        if (participantsError) throw participantsError;

        // 🔹 Step 3: Fetch messages and attachments
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select(`
            id, 
            sender_id, 
            conversation_id, 
            body, 
            content_type, 
            parent_id,
            created_at,
            attachments: attachments (
              id, 
              name, 
              path, 
              size, 
              created_at, 
              type
            )
          `)
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: true });

        if (messagesError) throw messagesError;

        // 🔹 Generate Public URLs for attachments
        const fetchPublicUrls = async (attachments) =>
          Promise.all(
            attachments.map(async (attachment) => {
              const { data } = supabase.storage.from("chat_attachments").getPublicUrl(attachment.path);
              return { ...attachment, path: data.publicUrl };
            })
          );


        // 🔹 Step 4: Structure the data properly
        const formattedConversations = await Promise.all(
          userConversations.map(async (conv) => ({
            id: conv.conversations.id,
            name: conv.conversations.name,
            type: conv.conversations.is_group ? "GROUP" : "ONE_TO_ONE",
            unreadCount: 0,
            participants: participantsData
              .filter((p) => p.conversation_id === conv.conversations.id)
              .map((p) => ({
                id: p.user_info?.id || "",
                role: p.user_info?.role || "participant",
                status: "offline",
                name: `${p.user_info?.full_name}`.trim(),
                email: p.user_info?.email || "",
                phoneNumber: p.user_info?.phone_number || "",
                avatarUrl: p.user_info?.avatar_url || "",
              })),
            messages: await Promise.all(
              messagesData
                .filter((msg) => msg.conversation_id === conv.conversations.id)
                .map(async (msg) => ({
                  id: msg.id,
                  senderId: msg.sender_id,
                  body: msg.body || "",
                  contentType: msg.content_type || "text",
                  createdAt: msg.created_at,
                  parentId: msg.parent_id || null,
                  attachments: msg.attachments ? await fetchPublicUrls(msg.attachments) : [],
                }))
            ),
          }))
        );

        setConversations(formattedConversations);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        setLoading(false);
      }
    }

    fetchConversations();

    return () => { };
  }, [userId]);

  const memoizedValue = useMemo(() => {
    const byId = conversations.length ? keyBy(conversations, (conv) => conv.id) : {};
    const allIds = Object.keys(byId);
    return {
      conversations: { byId, allIds },
      conversationsLoading: loading,
      conversationsEmpty: !loading && !allIds.length,
    };
  }, [conversations, userId, loading]);

  return memoizedValue;
}

/* ----------------------------------------------------------------------
   3️⃣ Fetch Single Conversation & Messages
---------------------------------------------------------------------- */
export function useGetConversation(conversationId) {
  const {
    data: conversationData,
    error: conversationError,
    isLoading,
    isValidating,
    mutate: updateConversation,
  } = useSWR(
    conversationId ? ["conversation", conversationId] : null,
    async () => {
      // Fetch conversation details
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .select("id, is_group, created_at")
        .eq("id", conversationId)
        .single();

      if (convError) throw convError;

      // Fetch participants
      const { data: participants, error: participantsError } = await supabase
        .from("conversation_participants")
        .select(`
          conversation_id, 
          participant_id, 
          user_info: user_info (
            id,
            email,
            full_name,
            phone_number,
            avatar_url,
            role,
            last_activity
          )
        `)
        .eq("conversation_id", conversationId);

      if (participantsError) throw participantsError;

      // Fetch messages
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select(`
          id, 
          sender_id, 
          conversation_id, 
          body, 
          content_type, 
          created_at,
          attachments: attachments (
            id, 
            name, 
            path, 
            size, 
            created_at, 
            type
          )
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      // Generate Public URLs for attachments
      const fetchPublicUrls = async (attachments) =>
        Promise.all(
          attachments.map(async (attachment) => {
            // Ensure `attachment.path` is relative to the bucket root
            const cleanPath = attachment.path.replace(/^storage\/public\/chat_attachments/, "");

            const { data } = supabase.storage
              .from("chat_attachment") // Correct bucket name
              .getPublicUrl(cleanPath);

            return { ...attachment, path: data.publicUrl };
          })
        );

      return {
        id: conversation.id,
        type: conversation.is_group ? "GROUP" : "ONE_TO_ONE",
        participants: participants.map((p) => ({
          id: p.user_info?.id || "",
          role: p.user_info?.role || "participant",
          status: "offline",
          name: `${p.user_info?.full_name}`.trim(),
          email: p.user_info?.email || "",
          phoneNumber: p.user_info?.phone_number || "",
          avatarUrl: p.user_info?.avatar_url || "",
          last_activity: p.user_info?.last_activity || ''
        })),
        messages: await Promise.all(
          messages.map(async (msg) => ({
            id: msg.id,
            senderId: msg.sender_id,
            body: msg.body,
            contentType: msg.content_type,
            createdAt: msg.created_at,
            attachments: msg.attachments ? await fetchPublicUrls(msg.attachments) : [],
          }))
        ),
      };
    }
  );
  return {
    conversation: conversationData || null,
    conversationLoading: isLoading,
    conversationError,
    conversationValidating: isValidating,
    updateConversation,
  };
}

/* ----------------------------------------------------------------------
   4️⃣ Send Message (Now Using Supabase)
---------------------------------------------------------------------- */
// export async function sendMessage(conversationId, senderId, body, parentId = null) {
//   if (!conversationId || !senderId) {
//     console.error('sendMessage: Missing conversationId or senderId');
//     return;
//   }
//   const newMessage = {
//     conversation_id: conversationId,
//     sender_id: senderId,
//     parent_id: parentId,
//     ...body
//   };
//   // Optimistically update UI
//   console.log(newMessage)
//   const { error } = await supabase.from('messages').insert(newMessage);
//   if (error) {
//     console.error('sendMessage error:', error);
//     throw error;
//   }
//   // Revalidate SWR cache to ensure real-time accuracy
// }

// /* ----------------------------------------------------------------------
//    5️⃣ Create a New Conversation
// ---------------------------------------------------------------------- */
// export async function createConversation({ type, participantIds }) {
//   const { data: newConversation, error } = await supabase.from('conversations').insert({ type }).single();

//   if (error) throw error;

//   if (participantIds?.length) {
//     const participantsData = participantIds.map((pid) => ({
//       conversation_id: newConversation.id,
//       participant_id: pid,
//     }));
//     const { error: partErr } = await supabase.from('conversation_participants').insert(participantsData);
//     if (partErr) throw partErr;
//   }

//   return newConversation;
// }
export async function sendMessage({
  conversationId,
  senderId,
  body = "",
  parentId = null,
  attachments = [],
  reactions = [],
}) {
  if (!conversationId || !senderId) {
    console.error("sendMessage: Missing conversationId or senderId");
    return;
  }

  let messageData = {
    conversation_id: conversationId,
    sender_id: senderId,
    body,
    parent_id: parentId, // If it's a reply, store parent_id
    content_type: attachments.length > 0 ? "file" : "text",
    created_at: new Date().toISOString(),
  };

  // Insert message into Supabase
  const { data: insertedMessage, error: messageError } = await supabase
    .from("messages")
    .insert(messageData)
    .select()
    .single();

  if (messageError) {
    console.error("sendMessage error:", messageError);
    throw messageError;
  }

  // Handle attachments
  if (attachments.length > 0) {
    await Promise.all(
      attachments.map(async (file) => {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(`attachments/${Date.now()}-${file.name}`, file);

        if (uploadError) throw uploadError;

        const fileUrl = `${supabase.storageUrl}/storage/v1/object/public/chat-attachments/${uploadData.path}`;

        const { error: attachmentError } = await supabase.from("attachments").insert({
          message_id: insertedMessage.id,
          name: file.name,
          path: uploadData.path,
          preview: fileUrl,
          size: file.size,
          type: file.type,
        });

        if (attachmentError) throw attachmentError;
      })
    );
  }

  // Handle reactions
  if (reactions.length > 0) {
    await Promise.all(
      reactions.map(async (emoji) => {
        const { error: reactionError } = await supabase.from("message_reactions").insert({
          message_id: insertedMessage.id,
          user_id: senderId,
          emoji,
        });
        if (reactionError) throw reactionError;
      })
    );
  }

  // Revalidate messages via SWR to update UI instantly
  mutate(["messages", conversationId]);

  return insertedMessage;
}
/* ----------------------------------------------------------------------
   6️⃣ Upload Attachment (Supabase Storage)
---------------------------------------------------------------------- */
export async function uploadAttachment(file, messageId) {
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .upload(`attachments/${Date.now()}-${file.name}`, file);

  if (error) throw error;

  const fileUrl = `${supabase.storageUrl}/storage/v1/object/public/chat-attachments/${data.path}`;

  const { error: insertErr } = await supabase.from('attachments').insert({
    message_id: messageId,
    name: file.name,
    path: data.path,
    preview: fileUrl,
    size: file.size,
    type: file.type,
  });

  if (insertErr) throw insertErr;
  return fileUrl;
}

/* ----------------------------------------------------------------------
   7️⃣ Toggle Reaction
---------------------------------------------------------------------- */
export async function toggleReaction(messageId, userId, emoji) {
  const { error } = await supabase.from('message_reactions').upsert({
    message_id: messageId,
    user_id: userId,
    emoji,
  });

  if (error) throw error;
}

/* ----------------------------------------------------------------------
   8️⃣ Delete Message
---------------------------------------------------------------------- */
export async function deleteMessage(messageId) {
  const { error } = await supabase.from('messages').delete().eq('id', messageId);
  if (error) throw error;
}

/* ----------------------------------------------------------------------
   9️⃣ Mark Conversation as Read
---------------------------------------------------------------------- */
export async function markConversationAsRead(conversationId) {
  await supabase.from('messages').update({ read: true }).eq('conversation_id', conversationId);
}

export async function clickConversation(conversationId) {


}

export function useDeleteMessage() {
}

//-------------------------------------------------------------------------------------

export async function handleAddReaction(messageId, userId, emoji, conversationId) {



}
