// Google Calendar API configuration
export const GOOGLE_CALENDAR_CONFIG = {
  API_KEY: 'AIzaSyA4V90Kr0QU_XwYZqEnqL5eKE4n4nPkxFE',
  CLIENT_ID: '725989375342-maqkfta8nnb9ptn7bd33tjioshdcetm8.apps.googleusercontent.com',
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