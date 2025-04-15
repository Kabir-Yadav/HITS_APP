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
  
  // Token expires after 7 days (604800000 ms)
  if (now - timestamp > 604800000) {
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

  // Only request new token if we don't have a valid one
  if (!storedToken && !currentToken) {
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
  }

  return { status: 'no_token' };
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
    threadId: details.result.threadId,
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
export async function sendEmail(to, subject, body, { cc, bcc } = {}, attachments = [], threadId = null) {
  try {
    const message = {
      to,
      subject,
      body,
      cc,
      bcc,
      threadId // Include threadId if this is a reply
    };

    const response = await fetch('/api/gmail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return response.json();
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Helper function to create email headers for reply/forward
const createEmailHeaders = (originalMail, type) => {
  const headers = {
    subject: '',
    to: '',
    cc: '',
    references: originalMail.id,
    inReplyTo: originalMail.id,
  };

  if (type === 'reply') {
    // For reply, set subject with Re: prefix if not already present
    headers.subject = originalMail.subject.startsWith('Re:') 
      ? originalMail.subject 
      : `Re: ${originalMail.subject}`;
    
    // Reply to the sender
    headers.to = originalMail.from;
  } else if (type === 'forward') {
    // For forward, set subject with Fwd: prefix if not already present
    headers.subject = originalMail.subject.startsWith('Fwd:') 
      ? originalMail.subject 
      : `Fwd: ${originalMail.subject}`;
    
    // Forward to empty (user will fill in)
    headers.to = '';
  }

  return headers;
};

// Function to prepare a reply email
export const prepareReply = (originalMail) => {
  const headers = createEmailHeaders(originalMail, 'reply');
  
  // Format the original message for the reply
  const originalContent = `
On ${new Date(originalMail.date).toLocaleString()}, ${originalMail.from} wrote:

${originalMail.body}
`;

  return {
    to: headers.to,
    subject: headers.subject,
    body: originalContent,
    references: headers.references,
    inReplyTo: headers.inReplyTo,
  };
};

// Function to prepare a forward email
export const prepareForward = (originalMail) => {
  const headers = createEmailHeaders(originalMail, 'forward');
  
  // Format the original message for forwarding
  const originalContent = `
---------- Forwarded message ---------
From: ${originalMail.from}
Date: ${new Date(originalMail.date).toLocaleString()}
Subject: ${originalMail.subject}
To: ${originalMail.to}

${originalMail.body}
`;

  return {
    to: headers.to,
    subject: headers.subject,
    body: originalContent,
  };
};

// Function to modify labels on a message
export const modifyMessageLabels = async (messageId, addLabels = [], removeLabels = []) => {
  try {
    await ensureGmailAuth();
    
    const response = await gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        addLabelIds: addLabels,
        removeLabelIds: removeLabels
      }
    });

    return response.result;
  } catch (error) {
    console.error('Error modifying message labels:', error);
    throw error;
  }
};

// Function to toggle star status
export const toggleStarred = async (messageId, isStarred) => {
  try {
    return await modifyMessageLabels(
      messageId,
      isStarred ? ['STARRED'] : [],
      isStarred ? [] : ['STARRED']
    );
  } catch (error) {
    console.error('Error toggling star:', error);
    throw error;
  }
};

// Function to toggle important status
export const toggleImportant = async (messageId, isImportant) => {
  try {
    return await modifyMessageLabels(
      messageId,
      isImportant ? ['IMPORTANT'] : [],
      isImportant ? [] : ['IMPORTANT']
    );
  } catch (error) {
    console.error('Error toggling important:', error);
    throw error;
  }
};

// Function to detect if an email is a calendar event
export const isCalendarEvent = (mail) => {
  if (!mail) return false;
  
  // Check for common calendar event indicators
  const isEvent = mail.subject?.toLowerCase().includes('invitation') ||
                 mail.subject?.toLowerCase().includes('calendar event') ||
                 mail.subject?.toLowerCase().includes('accepted') ||
                 mail.subject?.toLowerCase().includes('declined');
                 
  // Check for calendar attachment
  const hasCalendarAttachment = mail.attachments?.some(
    attachment => attachment.mimeType === 'text/calendar' || 
                 attachment.filename?.endsWith('.ics')
  );
  
  return isEvent || hasCalendarAttachment;
};

// Function to parse calendar event details from email
export const parseCalendarEvent = (mail) => {
  if (!mail) return null;
  
  // Extract event details from the email body
  const eventDetails = {
    type: 'unknown',
    title: mail.subject,
    date: null,
    time: null,
    location: null,
    attendees: [],
    organizer: null,
    status: 'pending'
  };
  
  // Check for response status
  if (mail.subject?.toLowerCase().includes('accepted')) {
    eventDetails.type = 'response';
    eventDetails.status = 'accepted';
  } else if (mail.subject?.toLowerCase().includes('declined')) {
    eventDetails.type = 'response';
    eventDetails.status = 'declined';
  } else if (mail.subject?.toLowerCase().includes('invitation')) {
    eventDetails.type = 'invitation';
  }
  
  // Try to extract event details from the body
  const body = mail.body || '';
  
  // Extract date and time
  const dateMatch = body.match(/When:?\s*([^\n]+)/i);
  if (dateMatch) {
    const dateTimeStr = dateMatch[1].trim();
    const [date, time] = dateTimeStr.split(/\s+/);
    eventDetails.date = date;
    eventDetails.time = time;
  }
  
  // Extract location
  const locationMatch = body.match(/Where:?\s*([^\n]+)/i);
  if (locationMatch) {
    eventDetails.location = locationMatch[1].trim();
  }
  
  // Extract attendees
  const attendeesMatch = body.match(/Attendees:?\s*([^\n]+)/i);
  if (attendeesMatch) {
    eventDetails.attendees = attendeesMatch[1]
      .split(',')
      .map(email => email.trim())
      .filter(Boolean);
  }
  
  // Extract organizer
  const organizerMatch = body.match(/Organizer:?\s*([^\n]+)/i);
  if (organizerMatch) {
    eventDetails.organizer = organizerMatch[1].trim();
  }
  
  return eventDetails;
};

// Function to respond to a calendar event
export const respondToCalendarEvent = async (messageId, response) => {
  try {
    await ensureGmailAuth();
    
    // Get the event details from the message
    const message = await gapi.client.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    
    // Extract the event ID from the message
    const eventId = extractEventId(message.result);
    if (!eventId) {
      throw new Error('Could not find event ID in the message');
    }
    
    // Send the response to the calendar API
    const responseData = {
      responseStatus: response, // 'accepted', 'declined', or 'tentative'
    };
    
    const calendarResponse = await gapi.client.calendar.events.patch({
      calendarId: 'primary',
      eventId: eventId,
      resource: responseData,
      sendUpdates: 'all', // Notify all attendees
    });
    
    // Update the email labels to reflect the response
    const labelUpdates = {
      accepted: ['CATEGORY_EVENTS', 'CATEGORY_PERSONAL'],
      declined: ['CATEGORY_EVENTS', 'CATEGORY_PERSONAL'],
      tentative: ['CATEGORY_EVENTS', 'CATEGORY_PERSONAL'],
    };
    
    await modifyMessageLabels(
      messageId,
      labelUpdates[response] || [],
      []
    );
    
    return calendarResponse.result;
  } catch (error) {
    console.error('Error responding to calendar event:', error);
    throw error;
  }
};

// Helper function to extract event ID from a Gmail message
const extractEventId = (message) => {
  // Look for the event ID in the message body
  const body = message.payload?.body?.data 
    ? decodeBase64Url(message.payload.body.data) 
    : '';
  
  // Common patterns for event IDs in calendar invitations
  const eventIdMatch = body.match(/eventid=([^&]+)/i) || 
                      body.match(/event_id=([^&]+)/i) ||
                      body.match(/eid=([^&]+)/i);
  
  if (eventIdMatch && eventIdMatch[1]) {
    return decodeURIComponent(eventIdMatch[1]);
  }
  
  // If not found in body, check attachments
  if (message.payload?.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/calendar' || part.filename?.endsWith('.ics')) {
        const icsContent = part.body?.data 
          ? decodeBase64Url(part.body.data) 
          : '';
        
        // Look for UID in ICS file
        const uidMatch = icsContent.match(/UID:([^\r\n]+)/i);
        if (uidMatch && uidMatch[1]) {
          return uidMatch[1].trim();
        }
      }
    }
  }
  
  return null;
};

/**
 * Mark a message as read by removing the UNREAD label
 * @param {string} messageId - The ID of the message to mark as read
 */
export async function markAsRead(messageId) {
  try {
    await ensureGmailAuth();
    
    const response = await gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        removeLabelIds: ['UNREAD']
      }
    });

    return response.result;
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
}

/**
 * Mark a message as unread by adding the UNREAD label
 * @param {string} messageId - The ID of the message to mark as unread
 */
export async function markAsUnread(messageId) {
  try {
    await ensureGmailAuth();
    
    const response = await gapi.client.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      resource: {
        addLabelIds: ['UNREAD']
      }
    });

    return response.result;
  } catch (error) {
    console.error('Error marking message as unread:', error);
    throw error;
  }
} 