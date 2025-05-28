import makeApiRequest from "../services/makeApiRequest";
import apiEndPoints from "../services/apiEndPoints";

// Define common parameter types
interface SendMessagePayload {
  conversationId: string | number;
  content: string;
}

interface UpdateProfilePayload {
  username?: string;
  displayName?: string;
  // Add more profile fields if needed
}

export const chatApiService = {
  // Get device profile
  getProfile: async () => {
    const response = await makeApiRequest.get(apiEndPoints.DEVICE_PROFILE);
    return response.data;
  },

  // Get conversations
  getConversations: async () => {
    const response = await makeApiRequest.get(
      apiEndPoints.DEVICE_CONVERSATIONS
    );
    return response.data;
  },

  // Get messages for a conversation
  getMessages: async (conversationId: string | number) => {
    const response = await makeApiRequest.get(
      apiEndPoints.CONVERSATION_MESSAGES.replace(
        ":id",
        conversationId.toString()
      )
    );
    const data = response.data;

    if (Array.isArray(data)) {
      return data;
    } else if (data && typeof data === "object") {
      return [data];
    } else {
      return [];
    }
  },

  // Send message
  sendMessage: async ({ conversationId, content }: SendMessagePayload) => {
    const response = await makeApiRequest.post(apiEndPoints.SEND_MESSAGE, {
      conversation_id: conversationId,
      content,
    });
    return response.data;
  },

  // Update profile
  updateProfile: async (data: UpdateProfilePayload) => {
    const response = await makeApiRequest.put(
      apiEndPoints.UPDATE_DEVICE_PROFILE,
      data
    );
    return response.data;
  },

  // Search devices
  searchDevices: async (query: string) => {
    const response = await makeApiRequest.get(
      `${apiEndPoints.SEARCH_DEVICES}?q=${encodeURIComponent(query)}`
    );
    return response.data;
  },

  // Start conversation
  startConversation: async (targetDeviceId: string) => {
    const response = await makeApiRequest.post(
      apiEndPoints.START_CONVERSATION,
      {
        target_device_id: targetDeviceId,
      }
    );
    return response.data;
  },
};
