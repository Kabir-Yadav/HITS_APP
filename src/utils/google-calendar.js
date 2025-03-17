/* global gapi, google */

// google-calendar.js

import { supabase } from 'src/lib/supabase';

import { GOOGLE_CALENDAR_CONFIG } from '../config/google-calendar';

const CLIENT_ID = '463956183839-i7j5nt5rkpbm4npukg21vfnhav5vvgeh.apps.googleusercontent.com';
const API_KEY = 'AIzaSyDh4-SOuKTopXe45oDM9nQA7R4cNJ1So0c';
const SCOPES = 'https://www.googleapis.com/auth/calendar';

let tokenClient;
let gapiInited = false;
let gisInited = false;

export const initializeGoogleCalendar = async () => {
  try {
    // Check if user is logged in with Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('User not authenticated');
    }

    // Get user's Google OAuth tokens from Supabase session
    const provider = session.user.app_metadata.provider;
    const accessToken = session.provider_token; // Google OAuth access token
    const refreshToken = session.provider_refresh_token; // Google OAuth refresh token

    if (provider !== 'google') {
      throw new Error('User not authenticated with Google');
    }

    // Initialize the Google API client
    await new Promise((resolve, reject) => {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            apiKey: import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
          });

          // Set the access token directly
          gapi.client.setToken({
            access_token: accessToken,
          });

          // Initialize the tokenClient for refresh token handling
          window.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/calendar',
            callback: () => {}, // Token refresh callback
          });

          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    return true;
  } catch (error) {
    console.error('Error initializing Google Calendar:', error);
    
    // If there's an authentication error, redirect to Supabase Google login
    if (error.message === 'User not authenticated' || error.message === 'User not authenticated with Google') {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard/calendar`,
          scopes: 'https://www.googleapis.com/auth/calendar',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      return false;
    }
    
    throw error;
  }
};

// Add a token refresh handler
export const handleTokenRefresh = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session');

    // Get new tokens from Supabase session
    const accessToken = session.provider_token;
    
    // Update the Google API client with new token
    gapi.client.setToken({
      access_token: accessToken,
    });

    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
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
    // Try to fetch events
    const response = await gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      showDeleted: false,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
    });

    return response.result.items || [];
  } catch (error) {
    // If token expired, try to refresh
    if (error.status === 401) {
      const refreshed = await handleTokenRefresh();
      if (refreshed) {
        // Retry the fetch with new token
        const response = await gapi.client.calendar.events.list({
          calendarId: 'primary',
          timeMin: new Date().toISOString(),
          showDeleted: false,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 2500,
        });
        return response.result.items || [];
      }
    }
    throw error;
  }
};