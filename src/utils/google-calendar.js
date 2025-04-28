/* global gapi, google */

// google-calendar.js

import { supabase } from 'src/lib/supabase';
import { GOOGLE_CALENDAR_CONFIG } from '../config/google-calendar';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/calendar';

let gapiInited = false;

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

  gapiInited = true;
};

export const ensureGoogleCalendarAuth = async () => {
  if (!gapiInited) {
    await initializeGoogleCalendar();
  }

  // Get the current session from Supabase
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    throw new Error('No active session found');
  }

  // Get the Google access token from the session
  const { provider_token } = session.provider_token;
  
  if (!provider_token) {
    throw new Error('No Google access token found');
  }

  // Set the token for gapi
  gapi.client.setToken({ access_token: provider_token });

  return { status: 'valid_token' };
};

// Get authorized domains
export const isAuthorizedDomain = () => {
  const currentDomain = window.location.host;
  return GOOGLE_CALENDAR_CONFIG.AUTHORIZED_DOMAINS.includes(currentDomain);
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