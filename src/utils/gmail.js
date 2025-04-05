import { gapi } from 'gapi-script';

const CLIENT_ID = import.meta.env.GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.GOOGLE_CALENDAR_API_KEY;
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'];
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';

let isInitialized = false;

export async function ensureGmailAuth() {
  if (!isInitialized) {
    try {
      await new Promise((resolve) => {
        gapi.load('client:auth2', resolve);
      });

      await gapi.client.init({
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES,
      });

      isInitialized = true;
    } catch (error) {
      console.error('Error initializing Gmail client:', error);
      throw error;
    }
  }

  const authInstance = gapi.auth2.getAuthInstance();
  if (!authInstance.isSignedIn.get()) {
    try {
      await authInstance.signIn();
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }
}

export async function getGmailLabels() {
  await ensureGmailAuth();
  try {
    const response = await gapi.client.gmail.users.labels.list({
      userId: 'me',
    });
    return response.result.labels;
  } catch (error) {
    console.error('Error fetching Gmail labels:', error);
    throw error;
  }
}

export async function getGmailMessages(labelId) {
  await ensureGmailAuth();
  try {
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
  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
    throw error;
  }
}

export async function getGmailMessage(messageId) {
  await ensureGmailAuth();
  try {
    const response = await gapi.client.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    return response.result;
  } catch (error) {
    console.error('Error fetching Gmail message:', error);
    throw error;
  }
} 