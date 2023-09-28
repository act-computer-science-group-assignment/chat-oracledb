const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const connection = await req.app.locals.oraclePool.getConnection();
    const result = await connection.execute(
      'INSERT INTO users (user_id, username) VALUES (users_seq.nextval, :username)',
      [username]
    );
    result.rowsAffected === 1 ? await connection.commit() : await connection.rollback();
    connection.release();

    return res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Error creating user' });
  }
});


router.get('/', async (req, res) => {
  try {
    const connection = await req.app.locals.oraclePool.getConnection();
    const result = await connection.execute(
      'SELECT user_id, username FROM users ORDER BY user_id'
    );
    connection.release();

    const users = result.rows.map((row) => {
      return {
        id: row[0],
        username: row[1],
      };
    });

    return res.status(200).json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    return res.status(500).json({ error: 'Error getting users' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const connection = await req.app.locals.oraclePool.getConnection();
    const result = await connection.execute(
      'SELECT user_id, username FROM users WHERE user_id = :id',
      [id]
    );
    connection.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = {
      id: result.rows[0][0],
      username: result.rows[0][1],
    };

    return res.status(200).json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    return res.status(500).json({ error: 'Error getting user' });
  }
});

//delete user
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const connection = await req.app.locals.oraclePool.getConnection();
    const result = await connection.execute(
      'DELETE FROM users WHERE user_id = :id',
      [id]
    );
    result.rowsAffected === 1 ? await connection.commit() : await connection.rollback();
    connection.release();

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Error deleting user' });
  }
});


module.exports = router;
