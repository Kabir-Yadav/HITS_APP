import { google } from 'googleapis';
import { getGmailClient } from 'src/utils/gmail-client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messageId } = req.query;
    const { addLabelIds = [], removeLabelIds = [] } = req.body;

    const gmail = await getGmailClient();

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds,
        removeLabelIds,
      },
    });

    // Get the updated message to return
    const { data: updatedMessage } = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
    });

    return res.status(200).json(updatedMessage);
  } catch (error) {
    console.error('Error modifying message:', error);
    return res.status(500).json({ error: 'Failed to modify message' });
  }
} 