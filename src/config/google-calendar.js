// Google Calendar API configuration
export const GOOGLE_CALENDAR_CONFIG = {
  API_KEY: process.env.GOOGLE_CALENDAR_API_KEY,
  CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
  SCOPES: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ],
  // Add your authorized domains here
  AUTHORIZED_DOMAINS: [
    'localhost:8000', // Development
    'employeeos.tech', // Production
    'www.employeeos.tech' // Production with www
  ]
}; 