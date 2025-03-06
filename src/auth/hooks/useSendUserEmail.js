export function useSendUserEmail() {

  async function sendUserEmailToBackend(userData) {
    try {
      if (!userData?.email) {
        console.error('No email found in auth context');
        return null;
      }

      const response = await fetch(`http://127.0.0.1:8000/api/chat/get-user?email=${encodeURIComponent(userData.email)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  return { sendUserEmailToBackend };
}