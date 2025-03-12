import { keyBy } from 'es-toolkit';
import useSWR, { mutate } from 'swr';
import { useMemo, useState } from 'react';

import axios, { fetcher, endpoints } from 'src/lib/axios';

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
    this.eventHandlers = {};
    this.setLoading = () => { }; // Default to an empty function if not provided

  }

  connect(userId, setLoading = () => { }) {
    this.setLoading = setLoading;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.ws = new WebSocket(`wss://apiemployeeos.duckdns.org:8443/ws/chat/${userId}`);

      this.ws.onopen = () => console.log("✅ WebSocket connected!");

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("📩 Received WebSocket Event:", data);

        this.setLoading((prev) => ({ ...prev, sendingMessage: false }));
        if (data.event === "message" || data.event === "reply") {
          this.updateConversationCache(data.conversation_id, data);
        }
        if (data.event === 'reaction') {
          this.updateReactionCache(data.conversation_id, data.message_id, data.sender_id, data.reactions);
        }
        if (data.event === 'delete') {
          this.deleteMessageCache(data.conversation_id, data.message_id);
        }
        // ✅ Set loading state
        if (this.eventHandlers[data.event]) {
          this.eventHandlers[data.event](data);
        }
      };

      this.ws.onerror = (error) => {
        console.error("❌ WebSocket Error:", error);
      };

      this.ws.onclose = () => {
        console.warn("⚠️ WebSocket disconnected, attempting reconnection...");
        setTimeout(() => this.connect(userId), 3000);
      };
    }
  }

  sendMessage(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      console.warn("⚠️ WebSocket not open. Attempting to reconnect...");
      setTimeout(() => this.sendMessage(payload), 500);
    }
  }
  deleteMessageCache(conversationId, messageId) {
    const url = conversationId
      ? [`${BASE_URL}/conversationByID/`, { params: { conversationId, endpoint: 'conversation' } }]
      : '';

    mutate(url, (currentData) => {
      if (!currentData || !currentData.conversations) {
        console.warn("deleteMessage: No cached conversation found. Skipping mutation.");
        return currentData;
      }

      return {
        ...currentData,
        conversations: currentData.conversations.map((conv) =>
          conv.id === conversationId
            ? {
              ...conv,
              messages: conv.messages.filter((msg) => msg.id !== messageId),
            }
            : conv
        ),
      };
    }, false);

    mutate(
      `${BASE_URL}/conversations/`,
      (currentData) => {
        const currentConversations = currentData.conversations;

        const conversations = currentConversations.map(
          (conversation) =>
            conversation.id === conversationId
              ? { ...conversation, messages: conversation.messages.filter((msg) => msg.id !== messageId) }
              : conversation
        );

        return { ...currentData, conversations };
      },
      false
    );
  }
  updateReactionCache(conversationId, messageId, userId, reactions) {
    const url = conversationId
      ? [`${BASE_URL}/conversationByID/`, { params: { conversationId, endpoint: 'conversation' } }]
      : '';

    mutate(url, (currentData) => {
      if (!currentData || !currentData.conversations) {
        console.warn("handleAddReaction: No cached conversation found. Skipping mutation.");
        return currentData;
      }

      return {
        ...currentData,
        conversations: currentData.conversations.map((conv) =>
          conv.id === conversationId
            ? {
              ...conv,
              messages: conv.messages.map((msg) => {
                if (msg.id !== messageId) return msg;

                return {
                  ...msg,
                  reactions: reactions,
                };
              }),
            }
            : conv
        ),
      };
    }, false);
  }

  updateConversationCache(conversationId, newMessage) {
    const url = conversationId
      ? [`${BASE_URL}/conversationByID/`, { params: { conversationId, endpoint: 'conversation' } }]
      : '';
    console.log(newMessage)
    mutate(url, (currentData) => {
      if (!currentData) {
        console.warn("sendMessage: No cached data found for mutation. Skipping mutation.");
        return currentData;
      }
      return {
        ...currentData,
        conversations: currentData.conversations.map((conv) =>
          conv.id === conversationId
            ? {
              ...conv,
              messages: [...conv.messages, newMessage], // ✅ Append message safely
            }
            : conv
        ),
      };
    }, false);

    mutate(
      `${BASE_URL}/conversations/`,
      (currentData) => {
        const currentConversations = currentData.conversations;

        const conversations = currentConversations.map(
          (conversation) =>
            conversation.id === conversationId
              ? { ...conversation, messages: [...conversation.messages, newMessage] }
              : conversation
        );

        return { ...currentData, conversations };
      },
      false
    );

  }
}

export const websocketManager = new WebSocketManager();

const loadingState = {
  sendingMessage: false,
  sendingReaction: false,
  deletingMessage: false
};

export function useChatState() {
  const [loading, setLoading] = useState(loadingState);

  return { loading, setLoading };
}


export function useGetContacts() {
  // const url = [CHART_ENDPOINT, { params: { endpoint: 'contacts' } }];

  const { data, isLoading, error, isValidating } = useSWR(`${BASE_URL}/contacts/`, fetcher, swrOptions);
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
    console.log({ byId, allIds })
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
  // console.log("DEBUG: useGetConversation data →", data); // ✅ Debug to check if data updates

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
  if (!conversationId || !userId) {
    console.error("sendMessage: Missing conversationId or userId");
    return;
  }

  const messagePayload = {
    event: "message",
    conversation_id: conversationId,
    sender_id: userId,
    parent_id: parentId,
    ...messageData,
  };

  setLoading((prev) => ({ ...prev, sendingMessage: true })); // ✅ Set loading state to true before sending

  console.log("DEBUG: Sending message →", messagePayload);
  websocketManager.connect(userId, setLoading); // ✅ Ensure WebSocket is connected before sending
  websocketManager.sendMessage(messagePayload);
}

// ----------------------------------------------------------------------

export async function createConversation(conversationData) {

  console.log(conversationData)
  const response = await axios.post(`${BASE_URL}/create-conversation/`, {
    conversationData, // Send the entire object
  });

  if (response.data) {
    console.log("✅ New conversation created:", response.data);

    // Update SWR cache with the new conversation
    mutate(`${BASE_URL}/conversations/`, (currentData) => ({
      ...currentData,
      conversations: [...currentData.conversations, response.data],
    }));
  }
  return response.data;
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

    websocketManager.connect(user_id); // Ensure WebSocket is connected

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

  websocketManager.connect(userId);

  const reactionPayload = {
    event: "reaction",
    conversation_id: conversationId,
    message_id: messageId,
    sender_id: userId,
    reaction: emoji,
  };

  websocketManager.sendMessage(reactionPayload);

}
