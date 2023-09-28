const express = require('express');
const router = express.Router();

// Create a new room
router.post('/', async (req, res) => {
  const { room_name } = req.body;
  if (!room_name) {
    return res.status(400).json({ error: 'Room name is required' });
  }

  try {
    const connection = await req.app.locals.oraclePool.getConnection();
    const result = await connection.execute(
      'INSERT INTO rooms (room_id, room_name) VALUES (rooms_seq.nextval, :room_name)',
      [room_name]
    );
    connection.release();

    return res.status(201).json({ message: 'Room created successfully' });
  } catch (error) {
    console.error('Error creating room:', error);
    return res.status(500).json({ error: 'Error creating room' });
  }
});

// Get all rooms
router.get('/', async (req, res) => {
  try {
    const connection = await req.app.locals.oraclePool.getConnection();
    const result = await connection.execute('SELECT * FROM rooms');
    connection.release();

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return res.status(500).json({ error: 'Error fetching rooms' });
  }
});

// Get a room by ID
router.get('/:id', async (req, res) => {
  const roomId = req.params.id;

  try {
    const connection = await req.app.locals.oraclePool.getConnection();
    const result = await connection.execute('SELECT * FROM rooms WHERE room_id = :roomId', [roomId]);
    connection.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching room by ID:', error);
    return res.status(500).json({ error: 'Error fetching room by ID' });
  }
});

// Update a room by ID
router.put('/:id', async (req, res) => {
  const roomId = req.params.id;
  const { room_name } = req.body;
  if (!room_name) {
    return res.status(400).json({ error: 'Room name is required' });
  }

  try {
    const connection = await req.app.locals.oraclePool.getConnection();
    const result = await connection.execute(
      'UPDATE rooms SET room_name = :room_name WHERE room_id = :roomId',
      [room_name, roomId]
    );
    connection.release();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    return res.status(200).json({ message: 'Room updated successfully' });
  } catch (error) {
    console.error('Error updating room by ID:', error);
    return res.status(500).json({ error: 'Error updating room by ID' });
  }
});

// Delete a room by ID
router.delete('/:id', async (req, res) => {
  const roomId = req.params.id;

  try {
    const connection = await req.app.locals.oraclePool.getConnection();
    const result = await connection.execute('DELETE FROM rooms WHERE room_id = :roomId', [roomId]);
    connection.release();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    return res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room by ID:', error);
    return res.status(500).json({ error: 'Error deleting room by ID' });
  }
});

module.exports = router;
