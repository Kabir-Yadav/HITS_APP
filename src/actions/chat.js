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

const fetchConversations = async (userId) => {
  if (!userId) return [];

  // 🔹 Step 1: Get conversations where the user is a participant
  const { data: userConversations, error: convError } = await supabase
    .from("conversation_participants")
    .select(`
      conversation_id, 
      conversations ( id, name, is_group, created_at )
    `)
    .eq("participant_id", userId);

  if (convError) throw convError;
  if (!userConversations.length) return [];

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
        preview, 
        size, 
        created_at, 
        type
      )
      reactions: message_reactions(
        user_id,
        emoji
      )
    `)
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: true });

  if (messagesError) throw messagesError;

  // 🔹 Generate Public URLs for attachments
  const fetchPublicUrls = async (attachments) =>
    Promise.all(
      attachments.map(async (attachment) => {
        const { data } = supabase.storage.from("chat_attachment").getPublicUrl(attachment.path);
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
            reactions: msg.reactions || [],
          }))
      ),
    }))
  );

  return formattedConversations;
};

export function useGetConversations(userId) {
  const { data, error, isLoading } = useSWR(
    userId ? ["conversations", userId] : null,
    () => fetchConversations(userId),
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  useEffect(() => {
    if (!userId) return () => { };

    // ✅ Subscribe to new conversations
    const conversationSubscription = supabase
      .channel(`conversation_updates_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_participants",
          filter: `participant_id=eq.${userId}`,
        },
        (payload) => {
          console.log("New conversation added:", payload);
          mutate(["conversations", userId]); // ✅ Refresh conversation list
        }
      )
      .subscribe();

    // ✅ Subscribe to new messages in any conversation of this user
    const messageSubscription = supabase
      .channel(`message_updates_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=in.(${data?.map((conv) => conv.id).join(",")})`,
        },
        (payload) => {
          console.log("New message received 2:", payload);
          mutate(["conversations", userId]); // ✅ Refresh conversations
          mutate(["conversation", payload.new.conversation_id]); // ✅ Refresh individual conversation
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationSubscription);
      supabase.removeChannel(messageSubscription);
    };
  }, [userId, data]);

  const memoizedValue = useMemo(() => {
    const byId = data?.length ? keyBy(data, (conv) => conv.id) : {};
    const allIds = Object.keys(byId);
    console.log({ byId, allIds })
    return {
      conversations: { byId, allIds },
      conversationsLoading: isLoading,
      conversationsEmpty: !isLoading && !allIds.length,
    };
  }, [data, isLoading]);
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
          parent_id,
          content_type, 
          created_at,
          attachments (
            id, 
            name, 
            path,
            preview, 
            size, 
            created_at, 
            type
          ),
          message_reactions (
            user_id,
            emoji
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
            parentId: msg.parent_id,
            attachments: msg.attachments ? await fetchPublicUrls(msg.attachments) : [],
            reactions: msg.message_reactions || []
          }))
        ),
      };
    }
  );

  useEffect(() => {
    if (!conversationId) return () => { };

    // ✅ Listen for new messages in the conversation
    const messageSubscription = supabase
      .channel(`conversation_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("New message received:", payload);
          mutate(["conversation", conversationId]); // Re-fetch messages in real-time
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          console.log(" Message Deleted:", payload);
          mutate(["conversation", conversationId]); // Re-fetch messages in real-time
        }
      )
      .subscribe();

    const reactionSubscription = supabase
      .channel(`reaction_updates_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          console.log("New reaction received:", payload);
          mutate(["conversation", conversationId]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          console.log("Reaction updated:", payload);
          mutate(["conversation", conversationId]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          console.log("Reaction deleted:", payload);
          mutate(["conversation", conversationId]);
        }
      )
      .subscribe();


    return () => {
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(reactionSubscription);

    };
  }, [conversationId]);

  return {
    conversation: conversationData || null,
    conversationLoading: isLoading,
    conversationError,
    conversationValidating: isValidating,
  };
}

/* ----------------------------------------------------------------------
   4️⃣ Send Message (Now Using Supabase)
---------------------------------------------------------------------- */
export async function sendMessage(conversationId, senderId, body, parentId = null, attachments = []) {
  if (!conversationId || !senderId) {
    console.error('sendMessage: Missing conversationId or senderId');
    return;
  }
  let messageData = {
    conversation_id: conversationId,
    sender_id: senderId,
    body,
    parent_id: parentId, // If it's a reply, store parent_id
    content_type: "text",
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
        // 🔹 Extract the file extension
        const fileExt = file.type.split('/')[1] || file.name.split('.').pop();
        const filePath = `${conversationId}/${Date.now()}.${fileExt}`;

        // 🔹 Convert Base64 to Blob
        const byteCharacters = atob(file.path.split(",")[1]); // Extract base64 string
        const byteNumbers = new Array(byteCharacters.length).fill(0).map((_, i) => byteCharacters.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: file.type });

        // 📌 Upload file to Supabase
        const { error: uploadError } = await supabase.storage
          .from("chat_attachment")
          .upload(filePath, blob, {
            contentType: file.type, // Ensures correct MIME type
          });

        if (uploadError) {
          console.error("Attachment upload error:", uploadError);
          throw uploadError;
        }
        console.log("file-uploaded");

        // 📌 Generate Public URL
        const { data } = supabase.storage.from("chat_attachment").getPublicUrl(filePath);
        const publicUrl = data.publicUrl;

        console.log("file-path generated:", publicUrl);

        // 📌 Insert attachment record in DB
        const { error: attachmentError } = await supabase.from("attachments").insert({
          message_id: insertedMessage.id,
          name: file.name,
          path: filePath, // Store the correct path, not the full URL
          preview: publicUrl, // Store the public URL for preview
          size: file.size,
          type: file.type,
          created_at: new Date().toISOString(),
        });

        if (attachmentError) {
          console.error("Attachment DB error:", attachmentError);
          throw attachmentError;
        }
      })
    );
  }

  // [NEW] Only if insertedMessage is truthy:
  if (insertedMessage) {
  // If it's a reply, parent_id is set, so we notify the original message's sender
    if (parentId) {
      await createChatNotificationForReply(conversationId, insertedMessage, senderId);
    } else {
    // Otherwise, it's a brand-new message, notify all participants except the sender
      await createChatNotificationForNewMessage(conversationId, insertedMessage, senderId);
    }
  }


  // Revalidate messages via SWR to update UI instantly
  mutate(["conversation", conversationId],);

  mutate(["conversations", senderId])

}

/* ----------------------------------------------------------------------
   5️⃣ Create a New Conversation
---------------------------------------------------------------------- */
export async function createConversation(conversationData, userid) {
  // Extract required fields from conversationData
  const { participants, name = null, is_group, messages } = conversationData;
  // console.log(participants, name, is_group, messages[0])
  if (participants.length === 0) {
    console.error("Error: participantIds are required");
    throw new Error("participantIds cannot be empty");
  }

  // Step 1️⃣: Insert new conversation
  const { data: newConversation, error } = await supabase
    .from("conversations")
    .insert({
      name,
      is_group: is_group // Ensure this column exists in the database
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }
  console.log("conversation added", newConversation.id)

  // Step 2️⃣: Insert participants into `conversation_participants`
  const participantsData = participants.map((participant) => ({
    conversation_id: newConversation.id,
    participant_id: participant.id,
  }));

  const { error: partErr } = await supabase
    .from("conversation_participants")
    .insert(participantsData);

  if (partErr) {
    console.error("Error adding participants:", partErr);
    throw partErr;
  }
  console.log("participants added")

  let messageData = {
    conversation_id: newConversation.id,
    sender_id: messages[0].sender_id,
    body: messages[0].body,
    parent_id: messages[0].parent_id || null, // If it's a reply, store parent_id
    content_type: "text",
    created_at: messages[0].created_at,
  };
  const { data: insertedMessage, error: messageError } = await supabase
    .from("messages")
    .insert(messageData)
    .select()
    .single();

  if (messageError) {
    console.error("sendMessage error:", messageError);
    throw messageError;
  }

  console.log("message added")

  // Handle attachments
  if (messages[0].attachments.length > 0) {
    await Promise.all(
      messages[0].attachments.map(async (file) => {
        // 🔹 Extract the file extension
        const fileExt = file.type.split('/')[1] || file.name.split('.').pop();
        const filePath = `${newConversation.id}/${Date.now()}.${fileExt}`;

        // 🔹 Convert Base64 to Blob
        const byteCharacters = atob(file.path.split(",")[1]); // Extract base64 string
        const byteNumbers = new Array(byteCharacters.length).fill(0).map((_, i) => byteCharacters.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: file.type });

        // 📌 Upload file to Supabase
        const { error: uploadError } = await supabase.storage
          .from("chat_attachment")
          .upload(filePath, blob, {
            contentType: file.type, // Ensures correct MIME type
          });

        if (uploadError) {
          console.error("Attachment upload error:", uploadError);
          throw uploadError;
        }
        console.log("file-uploaded");

        // 📌 Generate Public URL
        const { data } = supabase.storage.from("chat_attachment").getPublicUrl(filePath);
        const publicUrl = data.publicUrl;

        console.log("file-path generated:", publicUrl);

        // 📌 Insert attachment record in DB
        const { error: attachmentError } = await supabase.from("attachments").insert({
          message_id: insertedMessage.id,
          name: file.name,
          path: filePath, // Store the correct path, not the full URL
          preview: publicUrl, // Store the public URL for preview
          size: file.size,
          type: file.type,
          created_at: new Date().toISOString(),
        });

        if (attachmentError) {
          console.error("Attachment DB error:", attachmentError);
          throw attachmentError;
        }
      })
    );
  }
  mutate(["conversation", newConversation.id],);

  mutate(["conversations", userid])

  return newConversation
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
  return async (messageId, conversationId) => {
    try {
      const { error } = await supabase.from('messages').delete().eq('id', messageId);

      if (error) {
        console.error("Error deleting message:", error);
        throw error;
      }

      console.log("Message deleted:", messageId);

      // ✅ Re-fetch conversation messages after deletion
      mutate(["conversation", conversationId]);

    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };
}


//-------------------------------------------------------------------------------------

export async function handleAddReaction(messageId, userId, emoji, conversationId) {
  try {
    // ✅ Check if the reaction already exists
    const { data: existingReaction, error: fetchError } = await supabase
      .from("message_reactions")
      .select("id, emoji")
      .eq("message_id", messageId)
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching reaction:", fetchError);
      return;
    }

    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        // ✅ If the same user reacts with the same emoji, DELETE the reaction
        const { error: deleteError } = await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existingReaction.id);

        if (deleteError) throw deleteError;
        console.log("Reaction deleted");
      } else {
        // ✅ If the user reacts with a different emoji, UPDATE the reaction
        const { error: updateError } = await supabase
          .from("message_reactions")
          .update({ emoji })
          .eq("id", existingReaction.id);

        if (updateError) throw updateError;
        console.log("Reaction updated");

        await createChatNotificationForReaction(conversationId, messageId, userId, emoji);

      }
    } else {
      // ✅ If no reaction exists, INSERT a new reaction
      const { error: insertError } = await supabase
        .from("message_reactions")
        .insert({
          message_id: messageId,
          user_id: userId,
          emoji: emoji,
        });

      if (insertError) throw insertError;
      console.log("Reaction added");

      await createChatNotificationForReaction(conversationId, messageId, userId, emoji);
      
    }

    // ✅ Trigger a real-time UI update
    mutate(["conversation", conversationId]); // Force UI refresh

  } catch (error) {
    console.error("handleAddReaction error:", error);
  }
}

// ----------------------------------------------------------------------
//       NOTIFICATION HELPER FUNCTIONS (APPEND AT THE VERY BOTTOM)
// ----------------------------------------------------------------------

// 1) For a brand-new message (non-reply), notify ALL participants except the sender.
async function createChatNotificationForNewMessage(conversationId, insertedMessage, senderId) {
  try {
    // Get all participants of the conversation
    const { data: participants, error: partError } = await supabase
      .from("conversation_participants")
      .select("participant_id")
      .eq("conversation_id", conversationId);

    if (partError) {
      console.error("Error fetching participants:", partError);
      return;
    }

    if (!participants || !participants.length) return;

    // Build notifications for all except the sender
    const notifications = participants
      .filter((p) => p.participant_id !== senderId)
      .map((p) => ({
        user_id: p.participant_id,     // who receives it
        actor_id: senderId,            // who triggered it
        conversation_id: conversationId,
        message_id: insertedMessage.id,
        notification_type: "message",  // or "new_message"
        body: insertedMessage.body || "", // snippet
      }));

    // Insert them into chat_notifications
    if (notifications.length) {
      const { error: insertError } = await supabase
        .from("chat_notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Error inserting message notifications:", insertError);
      } else {
        console.log("Inserted 'message' notifications:", notifications);
      }
    }
  } catch (err) {
    console.error("createChatNotificationForNewMessage error:", err);
  }
}

// 2) For a REPLY, notify the original message’s sender (if different).
async function createChatNotificationForReply(conversationId, insertedMessage, senderId) {
  try {
    if (!insertedMessage.parent_id) return;

    // 1) Find the original message to see who sent it
    const { data: parentMsg, error: fetchParentError } = await supabase
      .from("messages")
      .select("sender_id, body")
      .eq("id", insertedMessage.parent_id)
      .single();

    if (fetchParentError) {
      console.error("Error fetching parent message:", fetchParentError);
      return;
    }
    if (!parentMsg) return;

    // 2) If the original sender is the same as the new sender, skip
    if (parentMsg.sender_id === senderId) return;

    // 3) Insert a row in chat_notifications
    const { error: insertError } = await supabase
      .from("chat_notifications")
      .insert({
        user_id: parentMsg.sender_id,
        actor_id: senderId,
        conversation_id: conversationId,
        message_id: insertedMessage.id,
        notification_type: "reply",
        body: insertedMessage.body || "",
      });

    if (insertError) {
      console.error("Error inserting 'reply' notification:", insertError);
    } else {
      console.log("Inserted 'reply' notification for user:", parentMsg.sender_id);
    }
  } catch (err) {
    console.error("createChatNotificationForReply error:", err);
  }
}

// 3) For a REACTION, notify the original message’s sender (if different).
async function createChatNotificationForReaction(conversationId, messageId, reactorId, emoji) {
  try {
    // 1) Find the original message
    const { data: origMsg, error: msgError } = await supabase
      .from("messages")
      .select("sender_id, body")
      .eq("id", messageId)
      .single();

    if (msgError) {
      console.error("Error fetching original message for reaction:", msgError);
      return;
    }
    if (!origMsg) return;

    // 2) If user is reacting to their own message, skip
    if (origMsg.sender_id === reactorId) return;

    // 3) Insert row in chat_notifications
    const { error: insertError } = await supabase
      .from("chat_notifications")
      .insert({
        user_id: origMsg.sender_id, // message owner
        actor_id: reactorId,        // user who reacted
        conversation_id: conversationId,
        message_id: messageId,
        notification_type: "reaction",
        body: origMsg.body || "",   // snippet of original text
        reaction_emoji: emoji,      // store which emoji
      });

    if (insertError) {
      console.error("Error inserting 'reaction' notification:", insertError);
    } else {
      console.log("Inserted 'reaction' notification for user:", origMsg.sender_id);
    }
  } catch (err) {
    console.error("createChatNotificationForReaction error:", err);
  }
}
