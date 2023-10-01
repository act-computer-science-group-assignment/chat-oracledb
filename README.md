# Node.js REST API with OracleDB

This project involves redesigning the database system for a group chatting software using Node.js and OracleDB.

## Technologies Used

- Node.js
- Express
- OracleDB

## How to Run

```bash
# Clone this repository
$ git clone https://github.com/act-computer-science-group-assignment/chat-oracledb.git

# Go into the repository
$ cd chat-oracledb

# Create a .env file for environment variables in your root directory
$ touch .env

# Add the following environment variables to your .env file
DB_USER=your_username
DB_PASSWORD=your_password
DB_CONNECT_STRING=your_connect_string

# Install dependencies
$ npm install

# Run the app
$ npm run dev
```

## Oracle db tables

- users
- rooms
- user_rooms
- messages

## API endpoints

- /api/v1/users
- /api/v1/rooms
- /api/v1/user_rooms
- /api/v1/messages
- /api/v1/messages/:id
- /api/v1/messages/group/:id
- /api/v1/messages/user/:id

### How we enable sharding in our database

We enable sharding in our database by using range partitioning. We partition the messages table by the room_id column. This allows us to store messages for different rooms in different partitions. We can then store these partitions on different servers. This allows us to scale horizontally by adding more servers to our database.

### How we enable replication in our database

We enable replication in our database by using triggers. We create a trigger on the messages table that inserts the new message into a replication table. This allows us to replicate the messages table on the same database.

### How we enable replication to a different database

We enable replication to a different database by using database links. We create a database link to the other database and then use that database link to insert the new message into the messages table on the other database.

### How we enable replication to a different database in real time

We enable replication to a different database in real time by using materialized views. We create a materialized view on the messages table that refreshes on commit. This allows us to replicate the messages table on the other database in real time.

### users

| Field | Type | Null | Key | Default | Extra |
| --- | --- | --- | --- | --- | --- |
| id | int(11) | NO | PRI | NULL | auto_increment |
| username | varchar(255) | NO | | NULL | |

### rooms

| Field | Type | Null | Key | Default | Extra |
| --- | --- | --- | --- | --- | --- |
| id | int(11) | NO | PRI | NULL | auto_increment |
| name | varchar(255) | NO | | NULL | |

### user_rooms

| Field | Type | Null | Key | Default | Extra |
| --- | --- | --- | --- | --- | --- |
| id | int(11) | NO | PRI | NULL | auto_increment |
| user_id | int(11) | NO | | NULL | |
| room_id | int(11) | NO | | NULL | |

### messages

| Field | Type | Null | Key | Default | Extra |
| --- | --- | --- | --- | --- | --- |
| id | int(11) | NO | PRI | NULL | auto_increment |
| sender_id | int(11) | NO | | NULL | |
| room_id | int(11) | NO | | NULL | |
| message_text | varchar(500) | NO | | NULL | |
| timestamp | timestamp | NO | | NULL | |

## replication_chat_messages

| Field | Type | Null | Key | Default | Extra |
| --- | --- | --- | --- | --- | --- |
| id | int(11) | NO | PRI | NULL | auto_increment |
| sender_id | int(11) | NO | | NULL | |
| room_id | int(11) | NO | | NULL | |
| message_text | varchar(500) | NO | | NULL | |
| timestamp | timestamp | NO | | NULL | |

## Procedures and functions

### Inserting a new chat
```sql
PROCEDURE insert_chat_message(
    p_room_id IN NUMBER,
    p_sender_id IN NUMBER,
    p_message_text IN VARCHAR2
) AS
BEGIN
    INSERT INTO messages (message_id, sender_id, room_id, message_text, timestamp)
    VALUES (message_id_sequence.NEXTVAL, p_sender_id, p_room_id, p_message_text, SYSTIMESTAMP);
END;
```

### Getting chats
```sql
FUNCTION get_chat_messages(
    p_room_id IN NUMBER
) RETURN SYS_REFCURSOR AS
    result SYS_REFCURSOR;
BEGIN
    OPEN result FOR
        SELECT message_id, sender_id, room_id, message_text, timestamp
        FROM messages
        WHERE room_id = p_room_id;

    RETURN result;
END;
```

### Range partitioning

```sql
CREATE TABLE messages (
  message_id NUMBER PRIMARY KEY,
  sender_id NUMBER NOT NULL,
  room_id NUMBER NOT NULL,
  message_text VARCHAR2(500),
  timestamp TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(room_id)
)
PARTITION BY RANGE (room_id)
INTERVAL (100)
(PARTITION messages_initial VALUES LESS THAN (100));
```

### Hash partitioning

```sql
CREATE TABLE messages (
  message_id NUMBER PRIMARY KEY,
  sender_id NUMBER NOT NULL,
  room_id NUMBER NOT NULL,
  message_text VARCHAR2(500),
  timestamp TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(room_id)
)
PARTITION BY HASH (room_id)
PARTITIONS 4;
```

### Replication with triggers

```sql
CREATE OR REPLACE TRIGGER chat_message_insert_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
      BEGIN
          -- Insert the new message into the replication table on the source database
          INSERT INTO replication_chat_messages
          VALUES (:NEW.message_id, :NEW.sender_id, :NEW.room_id, :NEW.message_text, :NEW.timestamp);
      END;
```
### Replication with materialized views

```sql
CREATE MATERIALIZED VIEW replication_chat_messages
  REFRESH FAST ON COMMIT
  AS SELECT * FROM messages;
```

### Replication to a different database

```sql
CREATE DATABASE LINK chat_db_link
  CONNECT TO chat_user
  IDENTIFIED BY chat_password
  USING 'chat_db';
```

```sql
 BEGIN
  DBMS_SCHEDULER.create_job (
    job_name        => 'replication_job',
    job_type        => 'PLSQL_BLOCK',
    job_action      => 'BEGIN INSERT INTO replication_chat_messages SELECT * FROM messages@chat_db_link; END;',
    start_date      => SYSTIMESTAMP,
    repeat_interval => 'FREQ=SECONDLY;INTERVAL=5',
    enabled         => TRUE);
END;
```

### Creating remote links for sharding

```sql
ALTER DATABASE SET SHARD=TRUE;

CREATE SHARD shard_a SET LOCATION = 'Server A';
CREATE SHARD shard_b SET LOCATION = 'Server B';

CREATE DATABASE LINK shard_a_link
CONNECT TO chat IDENTIFIED BY chat1234
USING
  '(DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = 192.168.1.15)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = orcl)
    )
  )';

CREATE DATABASE LINK shard_b_link
CONNECT TO chat IDENTIFIED BY chat1234
USING
  '(DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = 192.168.1.8)(PORT = 1521))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = orcl)
    )
  )';
```

### The database schema
 [db.sql](https://github.com/act-computer-science-group-assignment/chat-oracledb/blob/main/db.sql)
