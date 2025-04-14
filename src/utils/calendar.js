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
    let lastFocusTime = Date.now();
    let hasSwitchedBack = false;

    // Check for tab switching
    const checkInterval = setInterval(() => {
      if (document.hasFocus() && !calendarWindow.closed) {
        const currentTime = Date.now();
        // If we've been focused for more than 2 seconds, assume user has switched back
        if (currentTime - lastFocusTime > 2000 && !hasSwitchedBack) {
          hasSwitchedBack = true;
          clearInterval(checkInterval);
          
          // Get calendar events within the last minute to verify creation
          const now = new Date();
          const oneMinuteAgo = new Date(now.getTime() - 60000);
          
          // We assume event was created if user switched back to the tab
          // In a production environment, you'd want to verify with the Google Calendar API
          resolve(true);
        }
      } else {
        lastFocusTime = Date.now();
      }
    }, 500);

    // Set a timeout in case user doesn't switch back
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 300000); // 5 minute timeout
  });
} 