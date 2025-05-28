const apiEndPoints = {
  USER_DEVICE_REGISTRATION: "/register-device/",
  DEVICE_LOGIN: "/device-login/",
  DEVICE_REGISTER: "/device-register/",
  DEVICE_PROFILE: "/profile/",
  DEVICE_CONVERSATIONS: "/conversations-list/",
  CONVERSATION_MESSAGES: "/messages/:id/",
  SEND_MESSAGE: "/send-message/",
  UPDATE_DEVICE_PROFILE: "/devices/update_me/",

  DEVICES_LIST: "/devices/",
  CONVERSATIONS_LIST: "/conversations/",
  MESSAGES_LIST: "/messages/",
  SEARCH_DEVICES: "/search-devices/",
  START_CONVERSATION: "/start-conversation/",

  WS_GENERAL: "/ws/general/",
  WS_CHAT: "/ws/chat/",
};

export default apiEndPoints;
