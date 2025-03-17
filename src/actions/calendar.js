import { useMemo } from 'react';

import { supabase } from 'src/lib/supabase';
import { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const CALENDAR_ENDPOINT = endpoints.calendar;

// ----------------------------------------------------------------------

// New function to handle Google Calendar auth with Supabase
const ensureGoogleCalendarAuth = async () => {
  try {
    // Check if user is logged in with Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('User not authenticated');
    }

    // Verify Google authentication and tokens
    const provider = session.user.app_metadata.provider;
    const accessToken = session.provider_token;

    if (provider !== 'google' || !accessToken) {
      throw new Error('Google authentication required');
    }

    // Set the token in gapi client
    if (!window.gapi.client.getToken() || window.gapi.client.getToken().access_token !== accessToken) {
      window.gapi.client.setToken({
        access_token: accessToken,
      });
    }

    return true;
  } catch (error) {
    console.error('Auth error:', error);
    
    // Handle authentication errors
    if (error.message === 'User not authenticated' || error.message === 'Google authentication required') {
      // Redirect to Google login through Supabase
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

// Helper function to handle token refresh
const handleTokenRefresh = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session');

    const accessToken = session.provider_token;
    window.gapi.client.setToken({
      access_token: accessToken,
    });

    return true;
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
};

// Helper to handle API calls with token refresh
const executeWithTokenRefresh = async (apiCall) => {
  try {
    await ensureGoogleCalendarAuth();
    return await apiCall();
  } catch (error) {
    if (error?.status === 401) {
      const refreshed = await handleTokenRefresh();
      if (refreshed) {
        return await apiCall();
      }
    }
    throw error;
  }
};

export function useGetEvents() {
  const memoizedValue = useMemo(() => ({
    events: [],
    eventsLoading: false,
    eventsError: null,
    eventsValidating: false,
    eventsEmpty: true,
  }), []);

  return memoizedValue;
}

export const getEventDetails = async (eventId) => 
  executeWithTokenRefresh(async () => {
    const response = await window.gapi.client.calendar.events.get({
      calendarId: 'primary',
      eventId,
    });

    if (!response.result) {
      throw new Error('No event details found');
    }

    const event = response.result;
    return {
      id: event.id,
      title: event.summary || '',
      description: event.description || '',
      start: event.start?.dateTime || event.start?.date || new Date().toISOString(),
      end: event.end?.dateTime || event.end?.date || new Date().toISOString(),
      allDay: !event.start?.dateTime,
      attendees: event.attendees ? event.attendees.map(a => a.email).join(', ') : '',
      color: event.colorId === '1' ? 'primary.main' : 'secondary.main',
    };
  });

export const createEvent = async (eventData) => 
  executeWithTokenRefresh(async () => {
    const response = await window.gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: eventData,
      sendUpdates: 'all',
    });
    return response.result;
  });

export const updateEvent = async (eventId, eventData) => 
  executeWithTokenRefresh(async () => {
    const response = await window.gapi.client.calendar.events.update({
      calendarId: 'primary',
      eventId,
      resource: eventData,
      sendUpdates: 'all',
    });
    return response.result;
  });

export const deleteEvent = async (eventId) => 
  executeWithTokenRefresh(async () => {
    await window.gapi.client.calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
    });
    return true;
  });

export { ensureGoogleCalendarAuth };
