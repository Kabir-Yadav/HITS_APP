import useSWR from 'swr';
import { useMemo } from 'react';

import { ensureGoogleCalendarAuth } from 'src/utils/google-calendar';
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
    // Ensure we have proper authentication
    await ensureGoogleCalendarAuth();

    // Make the API call
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
    throw error;
  }
};

// ----------------------------------------------------------------------

export const createEvent = async (eventData) => {
  try {
    await ensureGoogleCalendarAuth();
    const response = await window.gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: eventData,
      sendUpdates: 'all',
    });
    return response.result;
  } catch (error) {
    console.error('Failed to create event:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------

export const updateEvent = async (eventId, eventData) => {
  try {
    await ensureGoogleCalendarAuth();
    const response = await window.gapi.client.calendar.events.update({
      calendarId: 'primary',
      eventId,
      resource: eventData,
      sendUpdates: 'all',
    });
    return response.result;
  } catch (error) {
    console.error('Failed to update event:', error);
    throw error;
  }
};

// ----------------------------------------------------------------------

export const deleteEvent = async (eventId) => {
  try {
    await ensureGoogleCalendarAuth();
    await window.gapi.client.calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
    });
    return true;
  } catch (error) {
    console.error('Failed to delete event:', error);
    throw error;
  }
};
