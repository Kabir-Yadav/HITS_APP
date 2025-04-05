import useSWR from 'swr';
import { useMemo } from 'react';
import { keyBy } from 'es-toolkit';

import { ensureGmailAuth, getGmailLabels, getGmailMessages, getGmailMessage } from 'src/utils/gmail';

// ----------------------------------------------------------------------

const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

// ----------------------------------------------------------------------

export function useGetLabels() {
  const { data, isLoading, error, isValidating } = useSWR(
    'gmail-labels',
    async () => {
      await ensureGmailAuth();
      const labels = await getGmailLabels();
      return { labels };
    },
    swrOptions
  );

  const memoizedValue = useMemo(
    () => ({
      labels: data?.labels || [],
      labelsLoading: isLoading,
      labelsError: error,
      labelsValidating: isValidating,
      labelsEmpty: !isLoading && !isValidating && !data?.labels.length,
    }),
    [data?.labels, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export function useGetMails(labelId) {
  const { data, isLoading, error, isValidating } = useSWR(
    labelId ? ['gmail-messages', labelId] : null,
    async () => {
      await ensureGmailAuth();
      const messages = await getGmailMessages(labelId);
      return { mails: messages };
    },
    swrOptions
  );

  const memoizedValue = useMemo(() => {
    const byId = data?.mails?.length ? keyBy(data?.mails, (option) => option.id) : {};
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
    mailId ? ['gmail-message', mailId] : null,
    async () => {
      await ensureGmailAuth();
      const message = await getGmailMessage(mailId);
      return { mail: message };
    },
    swrOptions
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
