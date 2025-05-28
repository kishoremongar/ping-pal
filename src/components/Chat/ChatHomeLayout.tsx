"use client";

import SearchbarIcon from "@@assets/icons/searchbar.svg";
import { useMemo, useState, useEffect, useRef } from "react";
import useDebounce from "@/hooks/useDebounce";
import { useWebSocket } from "@/utils/useWebSocket";
import {
  useDeviceProfile,
  useConversations,
  useMessages,
  useSendMessage,
  useInvalidateChatData,
  useSearchDevices,
  useStartConversation,
} from "../../hooks/useChatQueries";
import { useDevice } from "@/wrapper/DeviceProvider";

interface ChatItem {
  id: number;
  participants: any[];
  device_participants: any[];
  last_message?: {
    content: string;
    timestamp: string;
    sender_name: string;
  };
  created_at: string;
  updated_at: string;
  unread_count: number;
}

interface SearchResult {
  device_id: string;
  name: string;
  username: string;
  created_at: string;
  full_name: string;
}

export default function ChatHomeLayout() {
  const [currentChat, setCurrentChat] = useState<number | null>(null);
  const [searchContact, setSearchContact] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchContact, 500);

  // Get device ID from cookie
  const { deviceId, isLoading: deviceIdLoading } = useDevice();

  // React Query hooks
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useDeviceProfile();
  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    error: conversationsError,
  } = useConversations();
  const { data: reactQueryMessages = [], isLoading: messagesLoading } =
    useMessages(currentChat);
  const sendMessageMutation = useSendMessage();
  const { invalidateConversations, invalidateMessages } =
    useInvalidateChatData();

  // Search functionality
  const { data: searchResults, isLoading: searchLoading } =
    useSearchDevices(debouncedSearchQuery);
  const startConversationMutation = useStartConversation();

  const generalWs = useWebSocket({ deviceId, conversationId: null });
  const chatWs = useWebSocket({ deviceId, conversationId: currentChat });

  const messages = useMemo(() => {
    let allMessages = Array.isArray(reactQueryMessages)
      ? [...reactQueryMessages]
      : reactQueryMessages
      ? [reactQueryMessages]
      : [];

    if (chatWs.messages.length > 0) {
      const wsMessages = chatWs.messages.map((msg) => ({
        id: msg.message_id,
        content: msg.message,
        timestamp: msg.timestamp,
        device_sender: { device_id: msg.device_id },
        sender_name: msg.sender_name,
      }));

      // Only add WebSocket messages that don't already exist
      wsMessages.forEach((wsMsg) => {
        const exists = allMessages.some((existing) => existing.id === wsMsg.id);
        if (!exists) {
          allMessages.push(wsMsg);
        }
      });
    }

    // Sort all messages by timestamp
    allMessages.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return allMessages;
  }, [reactQueryMessages, chatWs.messages]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Add this effect to scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  // Handle real-time updates from WebSocket
  useEffect(() => {
    if (generalWs.isConnected) {
      generalWs.getProfile();
      generalWs.getChatList();
    }
  }, [generalWs.isConnected]);

  // Invalidate queries when receiving real-time updates
  useEffect(() => {
    if (generalWs.chatList.length > 0) {
      invalidateConversations();
    }
  }, [generalWs.chatList, invalidateConversations]);

  useEffect(() => {
    if (generalWs.profile) {
      invalidateConversations();
    }
  }, [generalWs.profile, invalidateConversations]);

  useEffect(() => {
    if (chatWs.messages.length > 0 && currentChat) {
      invalidateMessages(currentChat);
    }
  }, [chatWs.messages, currentChat, invalidateMessages]);

  // Show/hide search results based on search query
  useEffect(() => {
    setShowSearchResults(debouncedSearchQuery.length >= 2);
  }, [debouncedSearchQuery]);

  function getCurrentChat(chatId: number) {
    setCurrentChat(chatId);
    setShowSearchResults(false);
    setSearchContact("");
  }

  const handleStartConversation = async (targetDevice: SearchResult) => {
    try {
      const conversation = await startConversationMutation.mutateAsync(
        targetDevice.device_id
      );
      setCurrentChat(conversation.id);
      setShowSearchResults(false);
      setSearchContact("");
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentChat) return;
    const messageContent = newMessage;
    setNewMessage("");
    try {
      if (chatWs.isConnected) {
        chatWs.sendMessage(messageContent);
      } else {
        await sendMessageMutation.mutateAsync({
          conversationId: currentChat,
          content: messageContent,
        });

        // Refresh messages after REST API send
        invalidateMessages(currentChat);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageContent);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredChatList: ChatItem[] = useMemo(() => {
    if (showSearchResults) return [];

    return conversations.filter((chat: ChatItem) => {
      const deviceParticipants = chat.device_participants || [];
      const userParticipants = chat.participants || [];

      const searchTerm = searchContact.toLowerCase();

      return (
        deviceParticipants.some(
          (device) =>
            (device.username &&
              device.username.toLowerCase().includes(searchTerm)) ||
            (device.name && device.name.toLowerCase().includes(searchTerm))
        ) ||
        userParticipants.some(
          (user) =>
            user.username && user.username.toLowerCase().includes(searchTerm)
        )
      );
    });
  }, [conversations, searchContact, showSearchResults]);
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getChatDisplayName = (chat: ChatItem) => {
    const otherDevices =
      chat.device_participants?.filter(
        (device) => device.device_id !== deviceId
      ) || [];
    const otherUsers = chat.participants || [];

    if (otherDevices.length > 0) {
      return otherDevices[0].full_name || otherDevices[0].name || "Anonymous";
    }
    if (otherUsers.length > 0) {
      return otherUsers[0].full_name || "User";
    }
    return "Unknown";
  };

  const getChatInitials = (chat: ChatItem) => {
    const name = getChatDisplayName(chat);
    return name.charAt(0).toUpperCase();
  };

  const getSearchResultUsername = (device: SearchResult) => {
    return device.username || device.name || "Anonymous";
  };
  const getSearchResultDisplayName = (device: SearchResult) => {
    return device.full_name || device.full_name || "Anonymous";
  };

  const getSearchResultInitials = (device: SearchResult) => {
    const name = getSearchResultDisplayName(device);
    return name.charAt(0).toUpperCase();
  };

  const currentChatData = conversations.find(
    (chat: ChatItem) => chat.id === currentChat
  );

  const isLoading = deviceIdLoading || profileLoading || conversationsLoading;

  // Error handling
  if (profileError || conversationsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">
          Error loading data:{" "}
          {profileError?.message || conversationsError?.message}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full h-screen grid grid-cols-12">
        {/* Sidebar */}
        <div className="w-full col-span-3 bg-white border-r border-gray-200">
          {/* Header */}
          <div className="h-16 bg-[#5b67ca] flex items-center justify-between px-4">
            <h1 className="text-white text-xl font-semibold">Chats</h1>
            <button className="w-9 h-9 bg-white rounded-full flex items-center justify-center">
              <span className="text-gray-600">
                {profile?.username?.charAt(0)?.toUpperCase() ?? "AB"}
              </span>
            </button>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search contacts..."
                className="w-full py-2 px-8 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:border-[#5b67ca]"
                value={searchContact}
                onChange={(e) => setSearchContact(e.target.value)}
              />
              <SearchbarIcon className="text-red-500 size-4 absolute top-[0.6rem] left-2" />
              {searchLoading && (
                <div className="absolute right-2 top-[0.6rem]">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-[#5b67ca] rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {/* Contact List or Search Results */}
          <div className="overflow-y-auto">
            {showSearchResults ? (
              /* Search Results */
              <div>
                <div className="px-4 py-2 text-xs text-gray-500 uppercase tracking-wide">
                  Search Results
                </div>
                {searchResults?.results?.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {searchLoading ? "Searching..." : "No devices found"}
                  </div>
                ) : (
                  searchResults?.results?.map((device: SearchResult) => (
                    <div
                      key={device.device_id}
                      className="px-4 py-3 flex items-center cursor-pointer hover:bg-gray-50"
                      onClick={() => handleStartConversation(device)}
                    >
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-800">
                          {getSearchResultInitials(device)}
                        </span>
                      </div>
                      <div className="ml-3 flex-1">
                        <h2 className="text-sm font-semibold">
                          {getSearchResultDisplayName(device)}
                        </h2>
                        <p className="text-xs text-gray-500">
                          {getSearchResultUsername(device)}
                        </p>
                      </div>
                      {startConversationMutation.isPending && (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-[#5b67ca] rounded-full animate-spin"></div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Existing Conversations */
              <div>
                {filteredChatList.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {conversationsLoading
                      ? "Loading conversations..."
                      : searchContact
                      ? "No conversations match your search"
                      : "No conversations found"}
                  </div>
                ) : (
                  filteredChatList.map((chat) => (
                    <div
                      className={`px-4 py-3 flex flex-col gap-y-3 cursor-pointer ${
                        chat.id === currentChat
                          ? "bg-indigo-50"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => getCurrentChat(chat.id)}
                      key={chat.id}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-800">
                            {getChatInitials(chat)}
                          </span>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">
                              {getChatDisplayName(chat)}
                            </h2>
                            <div className="flex items-center">
                              <span className="text-xs text-gray-500 mr-2">
                                {chat.last_message
                                  ? formatTime(chat.last_message.timestamp)
                                  : ""}
                              </span>
                              {chat.unread_count > 0 && (
                                <span className="bg-[#5b67ca] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center mr-1">
                                  {chat.unread_count > 9
                                    ? "9+"
                                    : chat.unread_count}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {chat.last_message?.content || "No messages yet"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="col-span-9 flex flex-col bg-white h-screen">
          {currentChat && currentChatData ? (
            <>
              {/* Chat Header */}
              <div className="h-16 border-b border-gray-200 flex items-center px-6 flex-shrink-0">
                <div className="flex items-center flex-1">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-800">
                      {getChatInitials(currentChatData)}
                    </span>
                  </div>
                  <div className="ml-3">
                    <h2 className="text-lg font-semibold">
                      {getChatDisplayName(currentChatData)}
                    </h2>
                    <p className="text-sm text-green-600">
                      {generalWs.isConnected ? "Online" : "Connecting..."}
                    </p>
                  </div>
                </div>
                <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
                  <span className="block w-1 h-1 bg-gray-600 rounded-full"></span>
                  <span className="block w-1 h-1 bg-gray-600 rounded-full ml-0.5"></span>
                  <span className="block w-1 h-1 bg-gray-600 rounded-full ml-0.5"></span>
                </button>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-scroll p-6 min-h-0"
                style={{
                  height: "calc(100vh - 250px)", // Adjust based on header + input height
                  scrollBehavior: "smooth",
                }}
              >
                {messagesLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="text-gray-500">Loading messages...</div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="text-gray-500">
                      No messages yet. Start the conversation!
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages
                      .filter(
                        (message) => message && message.content && message.id
                      )
                      .map((message) => {
                        const isMyMessage =
                          message.device_sender?.device_id === deviceId;

                        return (
                          <div
                            key={message.id}
                            className={`flex mb-6 ${
                              isMyMessage ? "justify-end" : ""
                            }`}
                          >
                            <div className="max-w-[70%]">
                              <div
                                className={`rounded-2xl p-4 ${
                                  isMyMessage
                                    ? "bg-[#5b67ca] text-white"
                                    : "bg-gray-100"
                                }`}
                              >
                                <p>{message.content || "[Empty message]"}</p>
                              </div>
                              <div
                                className={`flex items-center mt-1 ${
                                  isMyMessage ? "justify-end" : ""
                                }`}
                              >
                                <span className="text-xs text-gray-500">
                                  {message.timestamp
                                    ? formatTime(message.timestamp)
                                    : "No timestamp"}
                                </span>
                                {isMyMessage && (
                                  <span className="ml-1">
                                    {getMessageStatusIcon(message, true)}
                                  </span>
                                )}
                              </div>
                              {!isMyMessage && (
                                <span className="text-xs text-gray-500 mt-1 block">
                                  {message.sender_name || "Unknown sender"}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex items-center">
                  <button className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
                    <span className="block w-5 h-0.5 bg-gray-400" />
                  </button>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 mx-4 py-2 px-4 bg-white border border-gray-200 rounded-full focus:outline-none focus:border-[#5b67ca]"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sendMessageMutation.isPending}
                  />
                  <button
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                      sendMessageMutation.isPending || !newMessage.trim()
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-[#5b67ca] hover:bg-[#4a5bc4]"
                    }`}
                    onClick={handleSendMessage}
                    disabled={
                      sendMessageMutation.isPending || !newMessage.trim()
                    }
                  >
                    {sendMessageMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "→"
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* No Chat Selected */
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 text-2xl">💬</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Welcome to Chat
                </h3>
                <p className="text-gray-500 mb-4">
                  Select a conversation to start messaging or search for new
                  contacts
                </p>
                {profile && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg max-w-sm mx-auto">
                    <p className="text-sm text-gray-600">
                      Logged in as:{" "}
                      <span className="font-semibold">
                        {profile.username || profile.name || "Anonymous"}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Device ID: {profile.device_id}
                    </p>
                  </div>
                )}
                {/* Quick search tip */}
                <div className="mt-6 p-3 bg-blue-50 rounded-lg max-w-sm mx-auto">
                  <p className="text-sm text-blue-700">
                    💡 Tip: Use the search bar to find other users by username
                    or device ID
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Message - Hidden on desktop */}
        <div className="flex md:hidden flex-1 items-center justify-center bg-white">
          <p className="text-gray-500">Select a chat to start messaging</p>
        </div>
      </div>

      {/* Loading overlay for starting conversation */}
      {startConversationMutation.isPending && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-[#5b67ca] rounded-full animate-spin"></div>
            <span className="text-gray-700">Starting conversation...</span>
          </div>
        </div>
      )}
    </div>
  );
}

const getMessageStatusIcon = (message: any, isMyMessage: boolean) => {
  if (!isMyMessage) return null;

  switch (
    message.status // Uses the simple status field
  ) {
    case "sent":
      return <span className="text-xs text-gray-400">✓</span>;
    case "delivered":
      return <span className="text-xs text-gray-400">✓✓</span>;
    case "read":
      return <span className="text-xs text-blue-500">✓✓</span>;
    default:
      return <span className="text-xs text-gray-400">✓</span>;
  }
};
