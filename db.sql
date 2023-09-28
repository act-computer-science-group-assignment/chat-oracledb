
- CREATE TABLE rooms (
  room_id NUMBER PRIMARY KEY,
  room_name VARCHAR2(100) UNIQUE NOT NULL
  );
-
- CREATE TABLE users (
  user_id NUMBER PRIMARY KEY,
  username VARCHAR2(50) UNIQUE NOT NULL
  );
-
- CREATE TABLE user_rooms (
  user_id NUMBER,
  room_id NUMBER,
  PRIMARY KEY (user_id, room_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(room_id)
  );
-
- CREATE TABLE messages (
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