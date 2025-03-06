import { keyBy } from 'es-toolkit';
import useSWR, { mutate } from 'swr';
import { useMemo, useState } from 'react';

import axios, {fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------
const BASE_URL = 'https://apiemployeeos.duckdns.org:8443/api/chat';

const enableServer = false;

const CHART_ENDPOINT = endpoints.chat;

const swrOptions = {
  revalidateIfStale: enableServer,
  revalidateOnFocus: enableServer,
  revalidateOnReconnect: enableServer,
};

// ----------------------------------------------------------------------

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.eventHandlers = {}; // Store event listeners for different event types
  }

  connect(userId,url='',conversationsURL='',setLoading) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ws = new WebSocket(`ws://apiemployeeos.duckdns.org:8443/ws/chat/${userId}`);

      this.ws.onopen = () => console.log("✅ WebSocket connected!");

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("📩 Received WebSocket Event:", data);

        // Dispatch event to handlers
        if (this.eventHandlers[data.event]) {
          this.eventHandlers[data.event](data);
        }
        
        mutate(url)
        setLoading((prev) => ({ ...prev, sendingMessage: false }));
        mutate(conversationsURL)

      };

      this.ws.onerror = (error) => console.error("❌ WebSocket Error:", error);

      this.ws.onclose = () => console.warn("⚠️ WebSocket disconnected!");
    }
  }

  sendMessage(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      console.warn("⚠️ WebSocket not open. Reconnecting...");
      setTimeout(() => this.sendMessage(payload), 500);
    }
  }

  on(event, callback) {
    this.eventHandlers[event] = callback;
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const websocketManager = new WebSocketManager();

const loadingState = {
  sendingMessage: false,
  sendingReaction: false,
};

export function useChatState() {
  const [loading, setLoading] = useState(loadingState);

  return { loading, setLoading };
}


export function useGetContacts() {
  // const url = [CHART_ENDPOINT, { params: { endpoint: 'contacts' } }];

  const { data, isLoading, error, isValidating } = useSWR(`${BASE_URL}/contacts/`, fetcher,swrOptions);
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
  const { data, isLoading, error, isValidating } = useSWR(`${BASE_URL}/conversations/`, fetcher, swrOptions);
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
  console.log("DEBUG: useGetConversation data →", data); // ✅ Debug to check if data updates

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

export async function sendMessage(conversationId, userId, messageData, parentId = null, setLoading) {
  const url = conversationId
    ? [`${BASE_URL}/conversationByID/`, { params: { conversationId, endpoint: 'conversation' } }]
    : '';
  const conversationsUrl = `${BASE_URL}/conversations/`;

  websocketManager.connect(userId, url, conversationsUrl,setLoading); // Ensure WebSocket is connected

  const messagePayload = {
    event: "message",
    conversation_id: conversationId,
    sender_id: userId,
    parent_id: parentId,
    ...messageData,
  };

  setLoading((prev) => ({ ...prev, sendingMessage: true })); // ✅ Set loading state

  console.log("DEBUG: Sending message →", messagePayload);
  websocketManager.sendMessage(messagePayload);

  // ✅ Reset loading state when WebSocket confirms message sent
  // websocketManager.on("message", () => {
  //   console.log("✅ Message Sent Successfully!");
  //   setLoading((prev) => ({ ...prev, sendingMessage: false }));
  // });
}

// ----------------------------------------------------------------------

export async function createConversation(conversationData) {
  const url = [CHART_ENDPOINT, { params: { endpoint: 'conversations' } }];

  /**
   * Work on server
   */
  const data = { conversationData };
  console.log(data)
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

//-------------------------------------------------------------------------------------

export function useDeleteMessage() {
  return async (messageId, conversation_id, user_id) => {
    const conversationByIdUrl = [`${BASE_URL}/conversationByID/`, { params: { conversationId: conversation_id, endpoint: 'conversation' } }];
    const conversationsUrl = `${BASE_URL}/conversations/`;

    websocketManager.connect(user_id,conversationByIdUrl,conversationsUrl); // Ensure WebSocket is connected

    const deletePayload = {
      action: "delete",
      message_id: messageId,
      conversation_id: conversation_id,
    };

    websocketManager.sendMessage(deletePayload);

    console.log("DEBUG: Sent delete request via WebSocket", deletePayload);
  };
}

//-------------------------------------------------------------------------------------

export async function handleAddReaction(messageId, userId, emoji, conversationId) {
  const conversationByIdUrl = [`${BASE_URL}/conversationByID/`, { params: { conversationId: conversationId, endpoint: 'conversation' } }];

  websocketManager.connect(userId,conversationByIdUrl);

  const reactionPayload = {
    event: "reaction",
    conversation_id: conversationId,
    message_id: messageId,
    sender_id: userId,
    reaction: emoji,
  };

  websocketManager.sendMessage(reactionPayload);

}
