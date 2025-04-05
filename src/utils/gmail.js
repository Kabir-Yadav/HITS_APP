/* global gapi, google */

import { GMAIL_CONFIG } from '../config/gmail';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;
const SCOPES = GMAIL_CONFIG.SCOPES.join(' ');

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Function to save token to localStorage
const saveTokenToStorage = (token) => {
  if (token) {
    localStorage.setItem('gmailToken', JSON.stringify({
      token,
      timestamp: new Date().getTime()
    }));
  }
};

const getTokenFromStorage = () => {
  const stored = localStorage.getItem('gmailToken');
  if (!stored) return null;
  
  const { token, timestamp } = JSON.parse(stored);
  const now = new Date().getTime();
  
  // Token expires after 1 hour
  if (now - timestamp > 3600000) {
    localStorage.removeItem('gmailToken');
    return null;
  }
  
  return token;
};

export const initializeGmail = async () => {
  // Initialize the Google API client
  await new Promise((resolve, reject) => {
    gapi.load('client', {
      callback: resolve,
      onerror: reject
    });
  });

  // Initialize gapi.client
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: GMAIL_CONFIG.DISCOVERY_DOCS,
  });

  // Initialize the token client
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', // defined at request time
  });

  gapiInited = true;
  gisInited = true;

  // Try to set token from storage
  const storedToken = getTokenFromStorage();
  if (storedToken) {
    gapi.client.setToken(storedToken);
  }
};

export const ensureGmailAuth = async () => {
  if (!gapiInited || !gisInited) {
    await initializeGmail();
  }

  // Check if we already have a valid token
  const currentToken = gapi.client.getToken();
  if (currentToken && currentToken.access_token) {
    try {
      // Test the token with a simple API call
      await gapi.client.gmail.users.getProfile({ userId: 'me' });
      return { status: 'valid_token' };
    } catch (error) {
      console.log('Token validation failed, requesting new token');
      localStorage.removeItem('gmailToken');
    }
  }

  // Check storage for a valid token
  const storedToken = getTokenFromStorage();
  if (storedToken) {
    try {
      gapi.client.setToken(storedToken);
      await gapi.client.gmail.users.getProfile({ userId: 'me' });
      return { status: 'valid_token' };
    } catch (error) {
      console.log('Stored token validation failed, requesting new token');
      localStorage.removeItem('gmailToken');
    }
  }

  return new Promise((resolve, reject) => {
    try {
      tokenClient.callback = async (response) => {
        if (response.error !== undefined) {
          reject(response);
          return;
        }
        saveTokenToStorage(response);
        await gapi.client.gmail.users.getProfile({ userId: 'me' });
        resolve({ status: 'new_token', response });
      };
      
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      console.error('Auth error:', err);
      reject(err);
    }
  });
};

// Helper function to decode base64url encoded strings
const decodeBase64Url = (str) => {
  try {
    // Replace URL-safe chars and add padding
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    
    // Decode base64 to binary string
    const binString = atob(str);
    
    // Convert binary string to UTF-8 array
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
    
    // Decode UTF-8 array to string
    return new TextDecoder('utf-8').decode(bytes);
  } catch (error) {
    console.error('Error decoding base64url:', error);
    return '';
  }
};

// Helper function to encode string to base64url format
const encodeBase64Url = (str) => btoa(str)
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

// Helper function to process attachments from a message
const processAttachments = async (messageId, payload) => {
  const attachments = [];

  const processPayloadPart = async (part) => {
    if (part.filename && part.body) {
      const attachment = {
        id: part.body.attachmentId,
        messageId,
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
      };
      attachments.push(attachment);
    }

    if (part.parts) {
      for (const subPart of part.parts) {
        await processPayloadPart(subPart);
      }
    }
  };

  await processPayloadPart(payload);
  return attachments;
};

// Helper function to process a Gmail message into our format
const processGmailMessage = async (messageId) => {
  const details = await gapi.client.gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const headers = details.result.payload.headers;
  const subject = headers.find(h => h.name === 'Subject')?.value || '';
  const from = headers.find(h => h.name === 'From')?.value || '';
  const to = headers.find(h => h.name === 'To')?.value || '';
  const date = headers.find(h => h.name === 'Date')?.value || '';
  
  let body = '';
  const payload = details.result.payload;

  // Function to find text content in message parts
  const findTextContent = (part) => {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
    if (part.parts) {
      for (const subPart of part.parts) {
        const content = findTextContent(subPart);
        if (content) return content;
      }
    }
    return null;
  };

  // Try to find text content in the message
  if (payload.parts) {
    body = findTextContent(payload) || '';
  } else if (payload.body?.data) {
    body = decodeBase64Url(payload.body.data);
  }

  // Process attachments
  const attachments = await processAttachments(messageId, payload);

  return {
    id: messageId,
    subject,
    from,
    to,
    date,
    body,
    snippet: details.result.snippet,
    isRead: !details.result.labelIds.includes('UNREAD'),
    labelIds: details.result.labelIds || [],
    attachments,
  };
};

// Fetch Gmail messages with optional label filter
export const fetchGmailMessages = async (maxResults = 50, labelId = '') => {
  try {
    await ensureGmailAuth();
    
    const response = await gapi.client.gmail.users.messages.list({
      userId: 'me',
      maxResults,
      labelIds: labelId ? [labelId] : undefined,
      q: labelId === 'SENT' ? 'in:sent' : undefined,  // Special handling for sent items
    });

    const messages = response.result.messages || [];
    const detailedMessages = await Promise.all(
      messages.map(message => processGmailMessage(message.id))
    );

    return detailedMessages;
  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
    throw error;
  }
};

// Fetch a single Gmail message by ID
export const fetchGmailMessage = async (messageId) => {
  try {
    await ensureGmailAuth();
    return await processGmailMessage(messageId);
  } catch (error) {
    console.error('Error fetching Gmail message:', error);
    throw error;
  }
};

// Download an attachment
export const downloadAttachment = async (messageId, attachmentId) => {
  try {
    await ensureGmailAuth();
    
    const response = await gapi.client.gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: attachmentId,
    });

    // Return the raw base64 data without decoding
    return response.result.data;
  } catch (error) {
    console.error('Error downloading attachment:', error);
    throw error;
  }
};

// Helper function to strip HTML tags
const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
};

// Helper function to create email
const createEmail = async (to, subject, body, { cc = '', bcc = '' } = {}, attachments = []) => {
  try {
    // Get user's email address
    const userProfile = await gapi.client.gmail.users.getProfile({ userId: 'me' });
    const fromEmail = userProfile.result.emailAddress;

    // Strip HTML from body
    const plainBody = stripHtml(body);

    // Generate a boundary string
    const boundary = `boundary_${Math.random().toString(36).slice(2)}`;

    // Start building email content
    let emailContent = `From: ${fromEmail}\r\n`;
    emailContent += `To: ${to}\r\n`;
    if (cc) emailContent += `Cc: ${cc}\r\n`;
    if (bcc) emailContent += `Bcc: ${bcc}\r\n`;
    emailContent += `Subject: ${subject}\r\n`;

    // Set content type to multipart
    emailContent += `Content-Type: multipart/mixed; boundary=${boundary}\r\n\r\n`;

    // Add text part
    emailContent += `--${boundary}\r\n`;
    emailContent += 'Content-Type: text/plain; charset=utf-8\r\n\r\n';
    emailContent += `${plainBody}\r\n\r\n`;

    // Add attachments
    for (const attachment of attachments) {
      emailContent += `--${boundary}\r\n`;
      emailContent += `Content-Type: ${attachment.type}\r\n`;
      emailContent += `Content-Transfer-Encoding: base64\r\n`;
      emailContent += `Content-Disposition: attachment; filename="${attachment.name}"\r\n\r\n`;
      emailContent += `${attachment.content}\r\n\r\n`;
    }

    // End boundary
    emailContent += `--${boundary}--`;

    // Convert to base64url format
    return btoa(emailContent)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (error) {
    console.error('Error creating email:', error);
    throw error;
  }
};

// Send email with attachments
export const sendEmail = async (to, subject, body, { cc = '', bcc = '' } = {}, attachments = []) => {
  try {
    await ensureGmailAuth();

    // Process attachments
    const processedAttachments = await Promise.all(
      attachments.map(async (file) => ({
        name: file.name,
        type: file.type,
        content: await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            // Get base64 content without the data URL prefix
            const base64Content = reader.result.split(',')[1];
            resolve(base64Content);
          };
          reader.readAsDataURL(file);
        })
      }))
    );

    const encodedMessage = await createEmail(to, subject, body, { cc, bcc }, processedAttachments);

    const response = await gapi.client.gmail.users.messages.send({
      userId: 'me',
      resource: {
        raw: encodedMessage
      }
    });

    return response.result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}; 