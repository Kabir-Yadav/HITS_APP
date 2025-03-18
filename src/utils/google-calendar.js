/* global gapi, google */

// google-calendar.js

import { GOOGLE_CALENDAR_CONFIG } from '../config/google-calendar';

const CLIENT_ID = '725989375342-maqkfta8nnb9ptn7bd33tjioshdcetm8.apps.googleusercontent.com';
const API_KEY = 'AIzaSyA4V90Kr0QU_XwYZqEnqL5eKE4n4nPkxFE';
const SCOPES = 'https://www.googleapis.com/auth/calendar';

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Function to save token to localStorage
const saveTokenToStorage = (token) => {
  if (token) {
    localStorage.setItem('googleCalendarToken', JSON.stringify({
      token,
      timestamp: new Date().getTime()
    }));
  }
};

// Function to get token from localStorage
const getTokenFromStorage = () => {
  const tokenData = localStorage.getItem('googleCalendarToken');
  if (!tokenData) return null;

  const { token, timestamp } = JSON.parse(tokenData);
  // Check if token is less than 1 hour old (3600000 ms)
  if (new Date().getTime() - timestamp < 3600000) {
    return token;
  }
  
  // Clear expired token
  localStorage.removeItem('googleCalendarToken');
  return null;
};

export const initializeGoogleCalendar = async () => {
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
    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
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

export const ensureGoogleCalendarAuth = async () => {
  if (!gapiInited || !gisInited) {
    await initializeGoogleCalendar();
  }

  // Check if we already have a valid token
  const currentToken = gapi.client.getToken();
  if (currentToken && currentToken.access_token) {
    try {
      // Test the token with a simple API call
      await gapi.client.calendar.calendarList.list();
      return { status: 'valid_token' }; // Return value for valid token
    } catch (error) {
      console.log('Token validation failed, requesting new token');
      // Clear invalid token
      localStorage.removeItem('googleCalendarToken');
      // Continue to request new token
    }
  }

  // Check storage for a valid token
  const storedToken = getTokenFromStorage();
  if (storedToken) {
    try {
      gapi.client.setToken(storedToken);
      await gapi.client.calendar.calendarList.list();
      return { status: 'valid_token' };
    } catch (error) {
      console.log('Stored token validation failed, requesting new token');
      localStorage.removeItem('googleCalendarToken');
    }
  }

  return new Promise((resolve, reject) => {
    try {
      tokenClient.callback = async (response) => {
        if (response.error !== undefined) {
          reject(response);
          return;
        }
        // Save the new token
        saveTokenToStorage(response);
        await gapi.client.calendar.calendarList.list(); // Verify token works
        resolve({ status: 'new_token', response }); // Return value for new token
      };
      
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      console.error('Auth error:', err);
      reject(err);
    }
  });
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
    
    // Get events from the last month to next 6 months
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 6);

    const response = await window.gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      showDeleted: false,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500, // Get more events
    });

    console.log('Google Calendar API response:', response); // Debug log
    return response.result.items || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error; // Propagate error for better error handling
  }
};