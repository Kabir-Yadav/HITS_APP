import useSWR from 'swr';
import { useMemo } from 'react';
import { keyBy } from 'es-toolkit';

import { fetchGmailMessages, fetchGmailMessage, sendEmail } from 'src/utils/gmail';

import { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// Gmail label IDs for different categories
const LABEL_MAPPINGS = {
  all: '',
  inbox: 'INBOX',
  sent: 'SENT',
  drafts: 'DRAFT',
  trash: 'TRASH',
  spam: 'SPAM',
  important: 'IMPORTANT',
  starred: 'STARRED',
  unread: 'UNREAD',
};

// ----------------------------------------------------------------------

export function useGetLabels() {
  const memoizedValue = useMemo(
    () => ({
      labels: [
        { id: 'all', name: 'All Mail', color: '#00B8D9' },
        { id: 'inbox', name: 'Inbox', color: '#00B8D9' },
        { id: 'sent', name: 'Sent', color: '#36B37E' },
        { id: 'drafts', name: 'Drafts', color: '#FF5630' },
        { id: 'trash', name: 'Trash', color: '#FF8B00' },
        { id: 'spam', name: 'Spam', color: '#FF8B00' },
        { id: 'important', name: 'Important', color: '#FFAB00' },
        { id: 'starred', name: 'Starred', color: '#FFAB00' },
      ],
      labelsLoading: false,
      labelsError: null,
      labelsValidating: false,
      labelsEmpty: false,
    }),
    []
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetMails(labelId = 'inbox') {
  const { data, isLoading, error, isValidating } = useSWR(
    ['gmail-messages', labelId],
    async () => {
      const messages = await fetchGmailMessages(50, LABEL_MAPPINGS[labelId] || '');
      return { mails: messages };
    },
    {
      ...swrOptions,
      keepPreviousData: false, // Don't keep old data when switching labels
    }
  );

  const memoizedValue = useMemo(() => {
    const byId = data?.mails?.length ? keyBy(data.mails, (option) => option.id) : {};
    const allIds = Object.keys(byId);

    return {
      mails: { byId, allIds },
      mailsLoading: isLoading,
      mailsError: error,
      mailsValidating: isValidating,
      mailsEmpty: !isLoading && !isValidating && !allIds.length,
    };
  }, [data?.mails, error, isLoading, isValidating]);

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetMail(mailId) {
  const { data, isLoading, error, isValidating } = useSWR(
    mailId ? `gmail-message-${mailId}` : null,
    async () => {
      if (!mailId) return { mail: null };
      const mail = await fetchGmailMessage(mailId);
      return { mail };
    },
    {
      ...swrOptions,
      keepPreviousData: false, // Don't keep old data when switching emails
      revalidateOnMount: true, // Always fetch when mounting
    }
  );

  const memoizedValue = useMemo(
    () => ({
      mail: data?.mail,
      mailLoading: isLoading,
      mailError: error,
      mailValidating: isValidating,
      mailEmpty: !isLoading && !isValidating && !data?.mail,
    }),
    [data?.mail, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export const sendMail = async (to, subject, body) => {
  try {
    const response = await sendEmail(to, subject, body);
    return response;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

// Helper function to count unread messages
const countUnreadMessages = (messages = []) => 
  messages.filter(message => !message.isRead).length;

export function useGetUnreadCount() {
  const { data, isLoading } = useSWR(
    'gmail-unread-count',
    async () => {
      const messages = await fetchGmailMessages(50, 'INBOX');
      return countUnreadMessages(messages);
    },
    {
      ...swrOptions,
      refreshInterval: 1000, // Refresh every second
      revalidateOnFocus: true, // Revalidate when window gets focus
      revalidateIfStale: true, // Revalidate if data is stale
    }
  );

  return {
    unreadCount: data || 0,
    loading: isLoading,
  };
}
