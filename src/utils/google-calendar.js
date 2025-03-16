import { GOOGLE_CALENDAR_CONFIG } from '../config/google-calendar';

// Initialize the Google API client and handle authentication
export const initGoogleCalendarApi = async () => {
  try {
    // First, load the gapi script if not already loaded
    if (!window.gapi) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    }

    // Load the gapi client
    await new Promise((resolve) => window.gapi.load('client:auth2', resolve));

    // Initialize the client
    await window.gapi.client.init({
      apiKey: GOOGLE_CALENDAR_CONFIG.API_KEY,
      clientId: GOOGLE_CALENDAR_CONFIG.CLIENT_ID,
      discoveryDocs: GOOGLE_CALENDAR_CONFIG.DISCOVERY_DOCS,
      scope: GOOGLE_CALENDAR_CONFIG.SCOPES.join(' '),
    });

    // Initialize auth2
    const authInstance = window.gapi.auth2.getAuthInstance();

    // If user is not signed in, trigger the sign-in flow
    if (!authInstance.isSignedIn.get()) {
      await authInstance.signIn({
        prompt: 'consent',  // Force consent prompt
        ux_mode: 'popup',   // Use popup mode
      });
    }

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
    }

    const authInstance = window.gapi.auth2.getAuthInstance();
    if (!authInstance.isSignedIn.get()) {
      await authInstance.signIn({
        prompt: 'consent',
        ux_mode: 'popup',
      });
    }

    // Verify token and refresh if needed
    const currentUser = authInstance.currentUser.get();
    const token = currentUser.getAuthResponse();
    
    if (token.expires_at < Date.now()) {
      await currentUser.reloadAuthResponse();
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
  return GOOGLE_CALENDAR_CONFIG.AUTHORIZED_DOMAINS.includes(currentDomain);
}; 