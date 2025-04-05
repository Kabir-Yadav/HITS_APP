// Gmail API configuration
export const GMAIL_CONFIG = {
  API_KEY: process.env.GOOGLE_CALENDAR_API_KEY, // Reusing the same API key
  CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'],
  SCOPES: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
  ],
  // Add your authorized domains here
  AUTHORIZED_DOMAINS: [
    'localhost:8000', // Development
    'employeeos.tech', // Production
    'www.employeeos.tech' // Production with www
  ]
}; 