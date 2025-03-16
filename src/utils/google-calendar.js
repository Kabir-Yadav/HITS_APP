import { GOOGLE_CALENDAR_CONFIG } from '../config/google-calendar';

// Initialize the Google API client and handle authentication
export const initGoogleCalendarApi = async () => {
  try {
    // First, load the gapi script if not already loaded
    if (!window.gapi) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = "anonymous";
        script.nonce = document.querySelector('meta[name="csp-nonce"]')?.content;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    // Load the gapi client
    await new Promise((resolve) => window.gapi.load('client', resolve));

    // Initialize the client first
    await window.gapi.client.init({
      apiKey: GOOGLE_CALENDAR_CONFIG.API_KEY,
      discoveryDocs: GOOGLE_CALENDAR_CONFIG.DISCOVERY_DOCS,
    });

    // Now load the identity platform script
    if (!window.google?.accounts) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.crossOrigin = "anonymous";
        script.nonce = document.querySelector('meta[name="csp-nonce"]')?.content;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    // Initialize Google Identity Services
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CALENDAR_CONFIG.CLIENT_ID,
      scope: GOOGLE_CALENDAR_CONFIG.SCOPES.join(' '),
      callback: (response) => {
        if (response.error) {
          throw new Error(response.error);
        }
        // Set the access token
        window.gapi.client.setToken(response);
      },
    });

    // Request the token
    await new Promise((resolve, reject) => {
      try {
        tokenClient.requestAccessToken({ prompt: 'consent' });
        resolve();
      } catch (error) {
        reject(error);
      }
    });

    return window.gapi;
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