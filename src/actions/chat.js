import { useMemo } from 'react';
import { keyBy } from 'es-toolkit';
import useSWR, { mutate } from 'swr';

import axios, {fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
const BASE_URL = 'http://127.0.0.1:8000/api/chat';

const enableServer = false;

const CHART_ENDPOINT = endpoints.chat;

const swrOptions = {
  revalidateIfStale: enableServer,
  revalidateOnFocus: enableServer,
  revalidateOnReconnect: enableServer,
};

// ----------------------------------------------------------------------




export function useGetContacts() {
  // const url = [CHART_ENDPOINT, { params: { endpoint: 'contacts' } }];

  const { data, isLoading, error, isValidating } = useSWR(`${BASE_URL}/contacts/`, fetcher);
  const memoizedValue = useMemo(
    () => ({
      contacts: data?.contacts || [],
      contactsLoading: isLoading,
      contactsError: error,
      contactsValidating: isValidating,
      contactsEmpty: !isLoading && !isValidating && !data?.contacts.length,
    }),
    [data?.contacts, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetConversations(userId) {
  // const url = [CHART_ENDPOINT, { params: { endpoint: 'conversations' } }];
  const { data, isLoading, error, isValidating } =useSWR(`${BASE_URL}/conversations/`, fetcher);
  const memoizedValue = useMemo(() => {
    const userConversations = data?.conversations?.filter((conversation) =>
      conversation.participants.some((participant) => participant.id === userId)
    ) || [];

    const byId = userConversations.length ? keyBy(userConversations, (conv) => conv.id) : {};
    const allIds = Object.keys(byId);
    return {
      conversations: { byId, allIds },
      conversationsLoading: isLoading,
      conversationsError: error,
      conversationsValidating: isValidating,
      conversationsEmpty: !isLoading && !isValidating && !allIds.length,
    };
  }, [data?.conversations, userId, error, isLoading, isValidating]);

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetConversation(conversationId) {
  const url = conversationId
    ? [`${BASE_URL}/conversationByID/`, { params: { conversationId, endpoint: 'conversation' } }]
    : '';
  const { data, isLoading, error, isValidating } = useSWR(url, fetcher, swrOptions);
  const memoizedValue = useMemo(
    () => ({
      conversation: data?.conversations?.[0] || null, // Ensure a valid conversation object
      conversationLoading: isLoading,
      conversationError: error,
      conversationValidating: isValidating,
      conversationEmpty: !isLoading && !isValidating && (!data?.conversations || data.conversations.length === 0),
    }),
    [data?.conversations, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export async function sendMessage(conversationId, userId, messageData) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${userId}`);

    ws.onopen = () => {
      const messagePayload = JSON.stringify({
        conversation_id: conversationId,
        sender_id: userId,
        ...messageData,
      });
      console.log(messagePayload)
      ws.send(messagePayload);

      resolve(messageData);
    };

    ws.onmessage = (event) => {
      console.log('Received message:', event.data);
      // When a new message is received, update the conversation list
      mutate(`http://127.0.0.1:8000/api/chat/conversationByID/${conversationId}`);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      reject(error);
    };

    ws.onclose = () => {
      console.warn("WebSocket disconnected, attempting reconnection...");
      // setTimeout(() => sendMessage(conversationId, userId, messageData), 1000);
    };
  });
}




// ----------------------------------------------------------------------

export async function createConversation(conversationData) {
  const url = [CHART_ENDPOINT, { params: { endpoint: 'conversations' } }];

  /**
   * Work on server
   */
  const data = { conversationData };
  const res = await axios.post(CHART_ENDPOINT, data);

  /**
   * Work in local
   */

  mutate(
    url,
    (currentData) => {
      const currentConversations = currentData.conversations;

      const conversations = [...currentConversations, conversationData];

      return { ...currentData, conversations };
    },
    false
  );

  return res.data;
}

// ----------------------------------------------------------------------

export async function clickConversation(conversationId) {
  /**
   * Work on server
   */
  if (enableServer) {
    try {
      await axios.get(`${BASE_URL}/markAsSeen/`, {
        params: { conversationId },
      });
    } catch (error) {
      console.error("Failed to mark conversation as seen:", error);
    }
  }

  /**
   * Work in local
   */
  mutate(
    [CHART_ENDPOINT, { params: { endpoint: 'conversations' } }],
    (currentData) => {
      if (!currentData || !currentData.conversations) {
        return currentData; // Ensure a consistent return value
      }

      const updatedConversations = currentData.conversations.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
      );

      return { ...currentData, conversations: updatedConversations };
    },
    false
  );
}

