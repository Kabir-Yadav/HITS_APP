// google-calendar.js

import { GOOGLE_CALENDAR_CONFIG } from '../config/google-calendar';

// Initialize the Google API client and handle authentication
export const initGoogleCalendarApi = async () => {
  try {
    // Load gapi script if not already loaded
    if (!window.gapi) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
        script.onload = resolve;
        script.onerror = reject;
      });
    }

    // Load gapi client
    await new Promise((resolve) => window.gapi.load('client', resolve));

    // Initialize the client with credentials
    await window.gapi.client.init({
      apiKey: GOOGLE_CALENDAR_CONFIG.API_KEY,
      discoveryDocs: GOOGLE_CALENDAR_CONFIG.DISCOVERY_DOCS,
      clientId: GOOGLE_CALENDAR_CONFIG.CLIENT_ID,
    });

    // Load Google Identity Services script if not already loaded
    if (!window.google?.accounts) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
        script.onload = resolve;
        script.onerror = reject;
      });
    }

    // Initialize token client
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CALENDAR_CONFIG.CLIENT_ID,
      scope: GOOGLE_CALENDAR_CONFIG.SCOPES.join(' '),
      prompt: 'consent',
      callback: (response) => {
        if (response.error) {
          throw new Error(response.error);
        }
        window.gapi.client.setToken(response);
      },
    });

    // Request access token
    return new Promise((resolve) => {
      tokenClient.requestAccessToken({
        prompt: 'consent',
      });
      resolve(window.gapi);
    });

  } catch (error) {
    console.error('Failed to initialize Google Calendar API:', error);
    throw error;
  }
};

// Check if user is authenticated and has required permissions
export const ensureGoogleCalendarAuth = async () => {
  try {
    if (!window.gapi?.client?.calendar) {
      await initGoogleCalendarApi();
      return true;
    }

    // Check if we have a valid token
    const token = window.gapi.client.getToken();
    if (!token) {
      await initGoogleCalendarApi();
      return true;
    }

    // Check if token is expired
    if (token.expires_at && token.expires_at < Date.now()) {
      await initGoogleCalendarApi();
      return true;
    }

    return true;
  } catch (error) {
    console.error('Failed to ensure Google Calendar authentication:', error);
    throw error;
  }
};

// Get authorized domains
export const isAuthorizedDomain = () => {
  const currentDomain = window.location.host;
  return GOOGLE_CALENDAR_CONFIG.AUTHORIZED_DOMAINS.includes(currentDomain) || 
         currentDomain.includes('localhost'); // Allow localhost for development
};

// Fetch Google Calendar events
export const fetchCalendarEvents = async () => {
  try {
    await ensureGoogleCalendarAuth();
    const response = await window.gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      showDeleted: false,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return response.result.items || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
};