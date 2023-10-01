const express = require("express");
const router = express.Router();

// Send a new message
router.post("/", async (req, res) => {
  const { sender_id, room_id, message_text } = req.body;
  if (!sender_id || !room_id || !message_text) {
    return res
      .status(400)
      .json({ error: "Sender ID, room ID, and message text are required" });
  }

  try {
    const connection = await req.app.locals.oraclePool.getConnection();
    const result = await connection.execute(
      "INSERT INTO messages (message_id, sender_id, room_id, message_text, timestamp) VALUES (messages_seq.nextval, :sender_id, :room_id, :message_text, CURRENT_TIMESTAMP)",
      [sender_id, room_id, message_text]
    );
    connection.release();

    return res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({ error: "Error sending message" });
  }
});

// Get all messages in a room
router.get("/room/:id", async (req, res) => {
  const roomId = req.params.id;

  try {
    const connection = await req.app.locals.oraclePool.getConnection();
    const result = await connection.execute(
      "SELECT m.message_id, u.username AS sender, m.message_text, m.timestamp " +
        "FROM messages m " +
        "JOIN users u ON m.sender_id = u.user_id " +
        "WHERE m.room_id = :roomId " +
        "ORDER BY m.timestamp",
      [roomId]
    );
    connection.release();

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching messages in a room:", error);
    return res.status(500).json({ error: "Error fetching messages in a room" });
  }
});

router.delete("/:message_id", async (req, res) => {
  const messageId = req.params.message_id;

  try {
    const connection = await req.app.locals.oraclePool.getConnection();
    // Check if the message exists
    const messageQuery =
      "SELECT 1 FROM messages WHERE message_id = :message_id";
    const [messageExists] = await connection.execute(messageQuery, [messageId]);

    if (!messageExists) {
      connection.release();
      return res.status(404).json({ error: "Message not found" });
    }

    // Delete the message
    const deleteMessageQuery =
      "DELETE FROM messages WHERE message_id = :message_id";
    await connection.execute(deleteMessageQuery, [messageId]);
    connection.release();

    return res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    return res.status(500).json({ error: "Error deleting message" });
  }
});

// Insert a chat message
router.post("/chat-messages", async (req, res) => {
  try {
    const { room_id, sender_id, message_text } = req.body;
    const connection = await oracledb.getConnection(dbConfig);
    const shard_key = Math.abs(room_id % 2); // Adjust for your sharding strategy

    const result = await connection.execute(
      `BEGIN insert_chat_message(:room_id, :sender_id, :message_text); END;`,
      {
        room_id,
        sender_id,
        message_text,
      }
    );

    await connection.close();

    res.status(201).json({ message: "Chat message inserted successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while inserting the chat message" });
  }
});

// Retrieve chat messages for a room
router.get("/chat-messages/:room_id", async (req, res) => {
  try {
    const room_id = parseInt(req.params.room_id);
    const connection = await oracledb.getConnection(dbConfig);
    const shard_key = Math.abs(room_id % 2); // Adjust for your sharding strategy

    const result = await connection.execute(
      `BEGIN :cursor := get_chat_messages(:room_id); END;`,
      {
        room_id,
        cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
      }
    );

    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(100); // Adjust the fetch size as needed
    await resultSet.close();
    await connection.close();

    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving chat messages" });
  }
});

module.exports = router;
