
 CREATE TABLE rooms (
  room_id NUMBER PRIMARY KEY,
  room_name VARCHAR2(100) UNIQUE NOT NULL
  );

 CREATE TABLE users (
  user_id NUMBER PRIMARY KEY,
  username VARCHAR2(50) UNIQUE NOT NULL
  );

 CREATE TABLE user_rooms (
  user_id NUMBER,
  room_id NUMBER,
  PRIMARY KEY (user_id, room_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(room_id)
  );

 CREATE TABLE messages (
  message_id NUMBER PRIMARY KEY,
  sender_id NUMBER NOT NULL,
  room_id NUMBER NOT NULL,
  message_text VARCHAR2(500),
  timestamp TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(room_id)
  );

CREATE TABLE replication_chat_messages (
  message_id NUMBER PRIMARY KEY,
  sender_id NUMBER NOT NULL,
  room_id NUMBER NOT NULL,
  message_text VARCHAR2(500),
  timestamp TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(room_id)
  );

CREATE SEQUENCE users_seq
  START WITH 1
  INCREMENT BY 1
  NOMAXVALUE;

  CREATE SEQUENCE message_id_sequence
  START WITH 1
  INCREMENT BY 1
  NOMAXVALUE;


-- without sharding

PROCEDURE insert_chat_message(
    p_room_id IN NUMBER,
    p_sender_id IN NUMBER,
    p_message_text IN VARCHAR2
) AS
BEGIN
    INSERT INTO messages (message_id, sender_id, room_id, message_text, timestamp)
    VALUES (message_id_sequence.NEXTVAL, p_sender_id, p_room_id, p_message_text, SYSTIMESTAMP);
END;

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

-- create partition

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


-- -- Enable shared server mode
ALTER DATABASE SET SHARD=TRUE;

CREATE SHARD shard_a SET LOCATION = 'Server A';
CREATE SHARD shard_b SET LOCATION = 'Server B';


CREATE DATABASE LINK shard_db
CONNECT TO your_username IDENTIFIED BY your_password
USING 'remote_db_tns';

--
CREATE DATABASE LINK remote_db
CONNECT TO remote_user IDENTIFIED BY remote_password
USING
  '(DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = remote_host)(PORT = remote_port))
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = remote_service_name)
    )
  )';

-- Replication with trigger and job

 -- On the source database (Server A)
  CREATE OR REPLACE TRIGGER chat_message_insert_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
      BEGIN
          -- Insert the new message into the replication table on the source database
          INSERT INTO replication_chat_messages
          VALUES (:NEW.message_id, :NEW.sender_id, :NEW.room_id, :NEW.message_text, :NEW.timestamp);
      END;

 -- On the source database (Server A)
  BEGIN
  DBMS_SCHEDULER.create_job (
      job_name        => 'chat_message_replication_job',
      job_type        => 'PLSQL_BLOCK',
      job_action      => 'BEGIN
      INSERT INTO messages@target_db
      SELECT * FROM replication_chat_messages;
      END;',
      start_date      => SYSTIMESTAMP,
      repeat_interval => 'FREQ=MINUTELY;INTERVAL=5', -- Adjust the interval as needed
      enabled         => TRUE
  );
  END;

-- with sharding

PROCEDURE insert_chat_message(
    p_room_id IN NUMBER,
    p_sender_id IN NUMBER,
    p_message_text IN VARCHAR2
) AS
    shard_key NUMBER;
BEGIN
    shard_key := ABS(MOD(p_room_id, 2)); -- Assuming two shards (0 and 1)

    INSERT INTO messages@shard_db(shard_key) (message_id, sender_id, room_id, message_text, timestamp)
    VALUES (message_id_sequence.NEXTVAL, p_sender_id, p_room_id, p_message_text, SYSTIMESTAMP);
END;


FUNCTION get_chat_messages(
    p_room_id IN NUMBER
) RETURN SYS_REFCURSOR AS
    shard_key NUMBER;
    result SYS_REFCURSOR;
BEGIN
    shard_key := ABS(MOD(p_room_id, 2)); -- Assuming two shards (0 and 1)

    OPEN result FOR
        SELECT message_id, sender_id, room_id, message_text, timestamp
        FROM messages@shard_db(shard_key)
        WHERE room_id = p_room_id;

    RETURN result;
END;

-- Sample insert and select

INSERT INTO users (user_id, username) VALUES (1, 'Kidan');

INSERT INTO rooms (room_id, room_name) VALUES (1, 'ACT GROUP3');

-- join user to room
INSERT INTO user_rooms (user_id, room_id) VALUES (1, 1);


INSERT INTO messages (message_id, sender_id, room_id, message_text, timestamp)
  VALUES (1, 1, 1, 'Hello, everyone!', TIMESTAMP '2023-09-27 13:00:00');

-- Query Messages in a Room
 SELECT m.message_id, u.username AS sender, m.message_text, m.timestamp
  FROM messages m
  JOIN users u ON m.sender_id = u.user_id
  WHERE m.room_id = 1;

-- query the members of a specific chat room
SELECT u.user_id, u.username
  FROM users u
  JOIN user_rooms ur ON u.user_id = ur.user_id
  WHERE ur.room_id = 1;