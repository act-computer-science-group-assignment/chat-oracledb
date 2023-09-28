const express = require('express');
const router = express.Router();

// Send a new message
router.post('/', async (req, res) => {
  const { sender_id, room_id, message_text } = req.body;
  if (!sender_id || !room_id || !message_text) {
    return res.status(400).json({ error: 'Sender ID, room ID, and message text are required' });
  }

  try {
    const connection = await req.app.locals.oraclePool.getConnection();
    const result = await connection.execute(
      'INSERT INTO messages (message_id, sender_id, room_id, message_text, timestamp) VALUES (messages_seq.nextval, :sender_id, :room_id, :message_text, CURRENT_TIMESTAMP)',
      [sender_id, room_id, message_text]
    );
    connection.release();

    return res.status(201).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Error sending message' });
  }
});

// Get all messages in a room
router.get('/room/:id', async (req, res) => {
  const roomId = req.params.id;

  try {
    const connection = await req.app.locals.oraclePool.getConnection();
    const result = await connection.execute(
      'SELECT m.message_id, u.username AS sender, m.message_text, m.timestamp ' +
      'FROM messages m ' +
      'JOIN users u ON m.sender_id = u.user_id ' +
      'WHERE m.room_id = :roomId ' +
      'ORDER BY m.timestamp',
      [roomId]
    );
    connection.release();

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching messages in a room:', error);
    return res.status(500).json({ error: 'Error fetching messages in a room' });
  }
});

router.delete('/:message_id', async (req, res) => {
    const messageId = req.params.message_id;

    try {
      const connection = await req.app.locals.oraclePool.getConnection();
      // Check if the message exists
      const messageQuery = 'SELECT 1 FROM messages WHERE message_id = :message_id';
      const [messageExists] = await connection.execute(messageQuery, [messageId]);

      if (!messageExists) {
        connection.release();
        return res.status(404).json({ error: 'Message not found' });
      }

      // Delete the message
      const deleteMessageQuery = 'DELETE FROM messages WHERE message_id = :message_id';
      await connection.execute(deleteMessageQuery, [messageId]);
      connection.release();

      return res.status(200).json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Error deleting message:', error);
      return res.status(500).json({ error: 'Error deleting message' });
    }
  });

module.exports = router;
