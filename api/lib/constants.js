/**
 * Application-wide constants and configurable limits.
 * All values can be overridden via environment variables.
 */

const LIMITS = {
  MAX_CODE_LENGTH: parseInt(process.env.MAX_CODE_LENGTH) || 2000,
  MAX_OUTPUT_LENGTH: parseInt(process.env.MAX_OUTPUT_LENGTH) || 5000,
  MAX_LOOP_ITERATIONS: parseInt(process.env.MAX_LOOP_ITERATIONS) || 20,
  VALIDATION_TIMEOUT_MS: parseInt(process.env.VALIDATION_TIMEOUT_MS) || 1000,
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 10000,
  RATE_LIMIT_MAX_MESSAGES: parseInt(process.env.RATE_LIMIT_MAX_MESSAGES) || 10,
  MAX_USERNAME_LENGTH: 25,
  MAX_ROOM_NAME_LENGTH: 30,
  MAX_LIVE_MESSAGES: 50,
};

const SUPPORTED_LANGUAGES = ['c', 'cpp', 'python', 'java'];

const LANGUAGE_LABELS = {
  c: 'C',
  cpp: 'C++',
  python: 'Python',
  java: 'Java'
};

const PLACEHOLDERS = {
  c: 'printf("Hello CodeChat\\n");',
  cpp: 'cout << "Hello CodeChat" << endl;',
  python: 'print("Hello CodeChat")',
  java: 'System.out.println("Hello CodeChat");'
};

const SOCKET_EVENTS = {
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

module.exports = {
  LIMITS,
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  PLACEHOLDERS,
  SOCKET_EVENTS
};
