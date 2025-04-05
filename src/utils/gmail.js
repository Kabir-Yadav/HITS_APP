import { gapi } from 'gapi-script';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY;
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'];
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';

export async function ensureGmailAuth() {
  return new Promise((resolve, reject) => {
    gapi.load('client:auth2', async () => {
      try {
        await gapi.client.init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          discoveryDocs: DISCOVERY_DOCS,
          scope: SCOPES,
        });

        const authInstance = gapi.auth2.getAuthInstance();
        if (!authInstance.isSignedIn.get()) {
          await authInstance.signIn();
        }
        resolve();
      } catch (error) {
        console.error('Error initializing Gmail client:', error);
        reject(error);
      }
    });
  });
}

export async function getGmailLabels() {
  await ensureGmailAuth();
  const response = await gapi.client.gmail.users.labels.list({
    userId: 'me',
  });
  return response.result.labels;
}

export async function getGmailMessages(labelId) {
  await ensureGmailAuth();
  const response = await gapi.client.gmail.users.messages.list({
    userId: 'me',
    labelIds: [labelId],
    maxResults: 50,
  });
  
  const messages = response.result.messages || [];
  const detailedMessages = await Promise.all(
    messages.map(async (message) => {
      const details = await gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });
      return details.result;
    })
  );
  
  return detailedMessages;
}

export async function getGmailMessage(messageId) {
  await ensureGmailAuth();
  const response = await gapi.client.gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });
  return response.result;
} 