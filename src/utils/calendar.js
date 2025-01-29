export function createGoogleCalendarEventUrl({
  title,
  description,
  location,
  startTime,
  endTime,
  attendeeEmail,
}) {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  
  const event = {
    action: 'TEMPLATE',
    text: title,
    details: description,
    location,
    dates: `${formatDateTime(startTime)}/${formatDateTime(endTime)}`,
    add: attendeeEmail,
  };

  const params = new URLSearchParams(event);
  return `${baseUrl}?${params.toString()}`;
}

function formatDateTime(date) {
  return date.toISOString().replace(/-|:|\.\d+/g, '');
}

export function listenForCalendarEventCreation(calendarWindow) {
  return new Promise((resolve) => {
    // Check if window was closed
    const checkInterval = setInterval(() => {
      if (calendarWindow.closed) {
        clearInterval(checkInterval);
        
        // Get calendar events within the last minute to verify creation
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60000);
        
        // We assume event was created if window was closed
        // In a production environment, you'd want to verify with the Google Calendar API
        resolve(true);
      }
    }, 500);

    // Set a timeout in case window stays open too long
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 300000); // 5 minute timeout
  });
} 