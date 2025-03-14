import { GOOGLE_CALENDAR_CONFIG } from '../config/google-calendar';

// Initialize the Google API client
export const initGoogleCalendarApi = () => new Promise((resolve, reject) => {
  // First, load the gapi script
  const script = document.createElement('script');
  script.src = 'https://apis.google.com/js/api.js';
  script.onload = () => {
    // Load the gapi client
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          apiKey: GOOGLE_CALENDAR_CONFIG.API_KEY,
          discoveryDocs: GOOGLE_CALENDAR_CONFIG.DISCOVERY_DOCS,
        });

        // Now load the identity service separately
        const identityScript = document.createElement('script');
        identityScript.src = 'https://accounts.google.com/gsi/client';
        identityScript.onload = async () => {
          try {
            const client = window.google.accounts.oauth2.initTokenClient({
              client_id: GOOGLE_CALENDAR_CONFIG.CLIENT_ID,
              scope: GOOGLE_CALENDAR_CONFIG.SCOPES.join(' '),
              callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                  window.gapi.client.setToken(tokenResponse);
                  resolve(window.gapi);
                }
              },
            });
            
            // Store the client for later use
            window.googleAuthClient = client;
            resolve(window.gapi);
          } catch (error) {
            reject(error);
          }
        };
        identityScript.onerror = (error) => reject(error);
        document.body.appendChild(identityScript);
      } catch (error) {
        reject(error);
      }
    });
  };
  script.onerror = (error) => reject(error);
  document.body.appendChild(script);
});

// Handle Google Calendar authentication
export const authenticateGoogleCalendar = async () => {
  try {
    if (!window.googleAuthClient) {
      throw new Error('Google Auth Client not initialized');
    }

    return new Promise((resolve, reject) => {
      window.googleAuthClient.callback = (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          window.gapi.client.setToken(tokenResponse);
          resolve(tokenResponse.access_token);
        } else {
          reject(new Error('Failed to get access token'));
        }
      };
      
      window.googleAuthClient.requestAccessToken();
    });
  } catch (error) {
    console.error('Error authenticating with Google Calendar:', error);
    throw error;
  }
};

// Check if the current domain is authorized
export const isAuthorizedDomain = () => {
  const currentDomain = window.location.host;
  return GOOGLE_CALENDAR_CONFIG.AUTHORIZED_DOMAINS.includes(currentDomain);
}; 