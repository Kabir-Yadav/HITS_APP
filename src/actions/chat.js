import useSWR, { mutate } from 'swr';
import { useMemo, useState, useEffect } from 'react';

import { supabase } from 'src/lib/supabase';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

/* ----------------------------------------------------------------------
   1) Fetch Contacts (Users)
   ---------------------------------------------------------------------- */
   export function useGetContacts() {
    const { data: contactsData, error: contactsError, isLoading } = useSWR(
      'contacts',
      async () => {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, avatar_url, email');
  
        if (error) throw error;
        return data;
      },
      swrOptions
    );
  
    return {
      contacts: contactsData || [],
      contactsLoading: isLoading,
      contactsError,
      contactsEmpty: !isLoading && !contactsData?.length,
    };
  }
  
  /* ----------------------------------------------------------------------
     2️⃣ Fetch Conversations for a User
  ---------------------------------------------------------------------- */
  export function useGetConversations(userId) {
    const { data: conversationsData, error: conversationsError, isLoading } = useSWR(
      userId ? ['conversations', userId] : null,
      async () => {
        const { data, error } = await supabase
          .from('conversation_participants')
          .select('conversations(*)')
          .eq('participant_id', userId);
  
        if (error) throw error;
        return data.map(row => row.conversations);
      },
      swrOptions
    );
  
    return {
      conversations: conversationsData || [],
      conversationsLoading: isLoading,
      conversationsError,
    };
  }
  
  /* ----------------------------------------------------------------------
     3️⃣ Fetch Single Conversation & Messages
  ---------------------------------------------------------------------- */
  export function useGetConversation(conversationId) {
    const { data: conversationData, error: conversationError, isLoading, mutate: updateConversation } = useSWR(
      conversationId ? ['conversation', conversationId] : null,
      async () => {
        const { data, error } = await supabase
          .from('conversations')
          .select('*, messages(*, attachments(*))')
          .eq('id', conversationId)
          .single();
  
        if (error) throw error;
        return data;
      },
      swrOptions
    );
  
    useEffect(() => {
      if (!conversationId) return;
    
      const channel = supabase
        .channel(`conversation-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            updateConversation((prev) =>
              prev ? { ...prev, messages: [...prev.messages, payload.new] } : prev
            );
          }
        )
        .subscribe();
    
      // ✅ ENSURE Cleanup Function Doesn't Return a Value
      return () => {
        void supabase.removeChannel(channel); // ✅ Ensure no return value
      };
      
    }, [conversationId, updateConversation]);
    
    
  
    return {
      conversation: conversationData || null,
      conversationLoading: isLoading,
      conversationError,
    };
  }
  
  /* ----------------------------------------------------------------------
     4️⃣ Send Message (Now Using Supabase)
  ---------------------------------------------------------------------- */
  export async function sendMessage(conversationId, senderId, body, parentId = null) {
    if (!conversationId || !senderId) {
      console.error('sendMessage: Missing conversationId or senderId');
      return;
    }
  
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body,
      parent_id: parentId,
      content_type: 'text',
    });
  
    if (error) {
      console.error('sendMessage error:', error);
      throw error;
    }
  }
  
  /* ----------------------------------------------------------------------
     5️⃣ Create a New Conversation
  ---------------------------------------------------------------------- */
  export async function createConversation({ type, participantIds }) {
    const { data: newConversation, error } = await supabase.from('conversations').insert({ type }).single();
  
    if (error) throw error;
  
    if (participantIds?.length) {
      const participantsData = participantIds.map((pid) => ({
        conversation_id: newConversation.id,
        participant_id: pid,
      }));
      const { error: partErr } = await supabase.from('conversation_participants').insert(participantsData);
      if (partErr) throw partErr;
    }
  
    return newConversation;
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