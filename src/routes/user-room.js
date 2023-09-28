const express = require('express');
const router = express.Router();

// Add a user to a room
router.post('/add', async (req, res) => {
  const { user_id, room_id } = req.body;
  if (!user_id || !room_id) {
    return res.status(400).json({ error: 'User ID and room ID are required' });
  }

  try {
    const connection = await req.app.locals.oraclePool.getConnection();
    // Check if the user and room exist
    const userQuery = 'SELECT 1 FROM users WHERE user_id = :user_id';
    const roomQuery = 'SELECT 1 FROM rooms WHERE room_id = :room_id';
    const [userExists] = await connection.execute(userQuery, [user_id]);
    const [roomExists] = await connection.execute(roomQuery, [room_id]);

    if (!userExists || !roomExists) {
      connection.release();
      return res.status(404).json({ error: 'User or room not found' });
    }

    // Check if the user is already a member of the room
    const existingMembershipQuery = 'SELECT 1 FROM user_rooms WHERE user_id = :user_id AND room_id = :room_id';
    const [existingMembership] = await connection.execute(existingMembershipQuery, [user_id, room_id]);

    if (existingMembership) {
      connection.release();
      return res.status(400).json({ error: 'User is already a member of the room' });
    }

    // Add the user to the room
    const addUserToRoomQuery = 'INSERT INTO user_rooms (user_id, room_id) VALUES (:user_id, :room_id)';
    await connection.execute(addUserToRoomQuery, [user_id, room_id]);
    connection.release();

    return res.status(201).json({ message: 'User added to the room successfully' });
  } catch (error) {
    console.error('Error adding user to the room:', error);
    return res.status(500).json({ error: 'Error adding user to the room' });
  }
});

// Get rooms of a user
router.get('/:user_id', async (req, res) => {
    const { user_id } = req.params;

    try {
      const connection = await req.app.locals.oraclePool.getConnection();
      const query = `
        SELECT r.room_id, r.room_name
        FROM rooms r
        JOIN user_rooms ur ON r.room_id = ur.room_id
        WHERE ur.user_id = :user_id
      `;
      const result = await connection.execute(query, [user_id]);
      connection.release();

      return res.status(200).json(result.rows);
    } catch (error) {
      console.error('Error fetching user\'s rooms:', error);
      return res.status(500).json({ error: 'Error fetching user\'s rooms' });
    }
  });

  router.delete('/remove', async (req, res) => {
    const { user_id, room_id } = req.body;
    if (!user_id || !room_id) {
      return res.status(400).json({ error: 'User ID and room ID are required' });
    }

    try {
      const connection = await req.app.locals.oraclePool.getConnection();
      // Check if the user is a member of the room
      const membershipQuery = 'SELECT 1 FROM user_rooms WHERE user_id = :user_id AND room_id = :room_id';
      const [membershipExists] = await connection.execute(membershipQuery, [user_id, room_id]);

      if (!membershipExists) {
        connection.release();
        return res.status(404).json({ error: 'User is not a member of the room' });
      }

      // Remove the user from the room
      const removeMembershipQuery = 'DELETE FROM user_rooms WHERE user_id = :user_id AND room_id = :room_id';
      await connection.execute(removeMembershipQuery, [user_id, room_id]);
      connection.release();

      return res.status(200).json({ message: 'User removed from the room successfully' });
    } catch (error) {
      console.error('Error removing user from the room:', error);
      return res.status(500).json({ error: 'Error removing user from the room' });
    }
  });

module.exports = router;
