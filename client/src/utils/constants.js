/**
 * Client-side constants — mirrors server constants.
 */

export const SUPPORTED_LANGUAGES = ['c', 'cpp', 'python', 'java'];

export const LANGUAGE_LABELS = {
  c: 'C',
  cpp: 'C++',
  python: 'Python',
  java: 'Java'
};

export const PLACEHOLDERS = {
  c: 'printf("Hello CodeChat\\n");',
  cpp: 'cout << "Hello CodeChat" << endl;',
  python: 'print("Hello CodeChat")',
  java: 'System.out.println("Hello CodeChat");'
};

export const SOCKET_EVENTS = {
  // Client -> Server
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  SEND_MESSAGE: 'send_message',
  RUN_CODE: 'run_code',
  VALIDATE_CODE: 'validate_code',
  CHANGE_LANGUAGE: 'change_language',

  // Server -> Client
  ROOM_JOINED: 'room_joined',
  ROOM_LEFT: 'room_left',
  NEW_MESSAGE: 'new_message',
  RUN_RESULT: 'run_result',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  ONLINE_COUNT: 'online_count',
  USERS_LIST: 'users_list',
  VALIDATION_RESULT: 'validation_result',
  MESSAGE_ERROR: 'message_error',
  LANGUAGE_CHANGED: 'language_changed',
};

export const LIMITS = {
  MAX_CODE_LENGTH: 2000,
  MAX_OUTPUT_LENGTH: 5000,
  MAX_LOOP_ITERATIONS: 20,
  MAX_USERNAME_LENGTH: 25,
  MAX_ROOM_NAME_LENGTH: 30,
  MAX_LIVE_MESSAGES: 50,
};
