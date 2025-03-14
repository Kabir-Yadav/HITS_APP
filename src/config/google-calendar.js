// Google Calendar API configuration
export const GOOGLE_CALENDAR_CONFIG = {
  API_KEY: 'AIzaSyDh4-SOuKTopXe45oDM9nQA7R4cNJ1So0c',
  CLIENT_ID: '463956183839-i7j5nt5rkpbm4npukg21vfnhav5vvgeh.apps.googleusercontent.com',
  DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
  SCOPES: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly'
  ],
  // Add your authorized domains here
  AUTHORIZED_DOMAINS: [
    'localhost:8000', // Development
    'https://employeeos.tech' // Replace with your actual production domain
  ]
}; 