import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApiService } from "./chatApi";

// Query keys
export const QUERY_KEYS = {
  PROFILE: ["profile"],
  CONVERSATIONS: ["conversations"],
  MESSAGES: (conversationId) => ["messages", conversationId],
};

// Get device profile
export const useDeviceProfile = () => {
  return useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: chatApiService.getProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

// Get conversations
export const useConversations = () => {
  return useQuery({
    queryKey: QUERY_KEYS.CONVERSATIONS,
    queryFn: chatApiService.getConversations,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 2,
  });
};

// Get messages for a conversation
export const useMessages = (conversationId) => {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => {
      if (!conversationId) return [];
      return chatApiService.getMessages(conversationId);
    },
    enabled: !!conversationId,
    staleTime: 0, // Change from 30000 to 0 to always refetch
    cacheTime: 0, // Don't cache the results
    refetchOnWindowFocus: false,
    // Add these to ensure fresh data
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
};

// Send message mutation
export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chatApiService.sendMessage,
    onSuccess: (data, variables) => {
      // Invalidate and refetch messages for this conversation
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.MESSAGES(variables.conversationId),
      });

      // Invalidate conversations to update last message
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CONVERSATIONS,
      });

      // Optimistically update the messages cache
      queryClient.setQueryData(
        QUERY_KEYS.MESSAGES(variables.conversationId),
        (oldData) => {
          if (oldData) {
            return [...oldData, data];
          }
          return [data];
        }
      );
    },
    onError: (error) => {
      console.error("Error sending message:", error);
    },
  });
};

// Update profile mutation
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chatApiService.updateProfile,
    onSuccess: (data) => {
      // Update the profile cache
      queryClient.setQueryData(QUERY_KEYS.PROFILE, data);
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
    },
  });
};

// Custom hook to invalidate all chat data (useful for real-time updates)
export const useInvalidateChatData = () => {
  const queryClient = useQueryClient();

  return {
    invalidateProfile: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE });
    },
    invalidateConversations: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONVERSATIONS });
    },
    invalidateMessages: (conversationId) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.MESSAGES(conversationId),
      });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries();
    },
  };
};

// Search devices
export const useSearchDevices = (query) => {
  return useQuery({
    queryKey: ["searchDevices", query],
    queryFn: () => chatApiService.searchDevices(query),
    enabled: !!query && query.length >= 2, // Only search if query is at least 2 characters
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });
};

// Start conversation mutation
export const useStartConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chatApiService.startConversation,
    onSuccess: (data) => {
      // Invalidate conversations to show the new conversation
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CONVERSATIONS,
      });
    },
    onError: (error) => {
      console.error("Error starting conversation:", error);
    },
  });
};
