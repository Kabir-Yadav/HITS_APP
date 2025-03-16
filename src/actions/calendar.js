import useSWR from 'swr';
import { useMemo } from 'react';

import axios, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const CALENDAR_ENDPOINT = endpoints.calendar;

// ----------------------------------------------------------------------

export function useGetEvents() {
  const { data, isLoading, error, isValidating } = useSWR(CALENDAR_ENDPOINT, fetcher);

  const memoizedValue = useMemo(() => ({
    events: [], // Return empty array since we're using Google Calendar directly
    eventsLoading: isLoading,
    eventsError: error,
    eventsValidating: isValidating,
    eventsEmpty: true,
  }), [error, isLoading, isValidating]);

  return memoizedValue;
}

// ----------------------------------------------------------------------

export const getEventDetails = async (eventId) => {
  try {
    // First ensure we have a valid token
    if (!window.gapi?.client?.calendar) {
      throw new Error('Google Calendar API not initialized');
    }

    // Get the current access token
    const token = window.gapi.client.getToken();
    if (!token) {
      // If no token, trigger auth flow
      const authInstance = await window.gapi.auth2.getAuthInstance();
      await authInstance.signIn();
    }

    // Now make the API call
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
  } catch (error) {
    console.error('Failed to fetch event details:', error);
    // Re-initialize Google API if needed
    try {
      await window.gapi.client.init({
        apiKey: process.env.GOOGLE_CALENDAR_API_KEY,
        clientId: process.env.GOOGLE_CLIENT_ID,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        scope: 'https://www.googleapis.com/auth/calendar',
      });
      // Retry the event fetch after re-initialization
      const response = await window.gapi.client.calendar.events.get({
        calendarId: 'primary',
        eventId,
      });
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
    } catch (retryError) {
      console.error('Failed to re-initialize and fetch:', retryError);
      throw retryError;
    }
  }
};

// ----------------------------------------------------------------------

export const createEvent = () => null;

// ----------------------------------------------------------------------

export const updateEvent = () => null;

// ----------------------------------------------------------------------

export const deleteEvent = () => null;
