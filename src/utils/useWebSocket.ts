import apiEndPoints from "@/services/apiEndPoints";
import { useEffect, useRef, useState, useCallback } from "react";

interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
  conversation_id?: string;
  device_id?: string;
  timestamp?: string;
  message_id?: string;
  sender_name?: string;
  status?: string;
  message_ids: number[];
}

interface UseWebSocketProps {
  deviceId: string | null;
  conversationId?: number | null;
}

// Helper function to get readable WebSocket state
const getWebSocketStateText = (readyState?: number): string => {
  if (!readyState) return "UNKNOWN";

  switch (readyState) {
    case WebSocket.CONNECTING:
      return "CONNECTING";
    case WebSocket.OPEN:
      return "OPEN";
    case WebSocket.CLOSING:
      return "CLOSING";
    case WebSocket.CLOSED:
      return "CLOSED";
    default:
      return "UNKNOWN";
  }
};

// Helper function to check if WebSocket is ready to send
const isWebSocketReady = (
  ws: WebSocket | null,
  isConnected: boolean
): boolean => {
  return !!(ws && ws.readyState === WebSocket.OPEN && isConnected);
};

// Helper function to attempt reconnection
const attemptReconnection = (
  wsRef: React.RefObject<WebSocket | null>,
  connect: () => void
) => {
  if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
    connect();
  }
};

export const useWebSocket = ({
  deviceId,
  conversationId,
}: UseWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatList, setChatList] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!deviceId) {
      return;
    }

    const wsUrl = conversationId
      ? `${process.env.NEXT_PUBLIC_WEBSOCKET_BASEURL}${apiEndPoints.WS_CHAT}${conversationId}/?device_id=${deviceId}`
      : `${process.env.NEXT_PUBLIC_WEBSOCKET_BASEURL}${apiEndPoints.WS_GENERAL}?device_id=${deviceId}`;

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      setIsConnected(true);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error("❌ Error parsing WebSocket message:", error);
        console.error("Raw data:", event.data);
      }
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
    };

    wsRef.current.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
    };
  }, [deviceId, conversationId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(
    (message: string | object) => {
      if (isWebSocketReady(wsRef.current, isConnected)) {
        try {
          const messageData = {
            type: "message",
            message: message,
          };
          wsRef.current!.send(JSON.stringify(messageData));
        } catch (error) {
          console.error("❌ Error sending message:", error);
          handleSendError();
        }
      } else {
        handleWebSocketNotReady();
      }
    },
    [isConnected, connect]
  );

  const handleSendError = useCallback(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      connect();
    }
  }, [connect]);

  const handleWebSocketNotReady = useCallback(() => {
    console.error("❌ Cannot send message - WebSocket not connected");
    attemptReconnection(wsRef, connect);
  }, [isConnected, connect]);

  const sendChatMessage = useCallback(
    (message: string) => {
      if (isWebSocketReady(wsRef.current, isConnected)) {
        try {
          const messageData = { type: "message", message };
          wsRef.current!.send(JSON.stringify(messageData));
        } catch (error) {
          console.error("❌ Error sending chat message:", error);
          handleSendError();
        }
      } else {
        handleWebSocketNotReady();
      }
    },
    [isConnected, connect, handleSendError, handleWebSocketNotReady]
  );

  const getProfile = useCallback(() => {
    sendMessage({ type: "get_profile" });
  }, [sendMessage]);

  const getChatList = useCallback(() => {
    sendMessage({ type: "get_chat_list" });
  }, [sendMessage]);

  const getConversationMessages = useCallback(
    (conversationId: string) => {
      sendMessage({
        type: "get_conversation_messages",
        conversation_id: conversationId,
      });
    },
    [sendMessage]
  );

  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    switch (data.type) {
      case "profile":
        handleProfileMessage(data);
        break;
      case "chat_list":
        handleChatListMessage(data);
        break;
      case "conversation_messages":
        handleConversationMessagesMessage(data);
        break;
      case "new_message":
        handleNewMessage(data);
        break;
      case "messages_read":
        handleMessagesRead(data);
        break;
      case "message_delivered":
        handleMessageDelivered(data);
        break;
      case "error":
        handleErrorMessage(data);
        break;
      default:
        handleUnknownMessage(data);
    }
  }, []);

  const handleProfileMessage = useCallback((data: WebSocketMessage) => {
    setProfile(data.data);
  }, []);

  const handleChatListMessage = useCallback((data: WebSocketMessage) => {
    setChatList(data.data ?? []);
  }, []);

  const handleConversationMessagesMessage = useCallback(
    (data: WebSocketMessage) => {
      setMessages(data.data ?? []);
    },
    []
  );

  const handleNewMessage = useCallback((data: WebSocketMessage) => {
    addNewMessage(data);
  }, []);

  const handleMessagesRead = useCallback((data: WebSocketMessage) => {
    markMessagesRead(data.message_ids);
  }, []);

  const handleMessageDelivered = useCallback((data: WebSocketMessage) => {
    markMessageDelivered(data.message_id);
  }, []);

  const handleErrorMessage = useCallback((data: WebSocketMessage) => {
    console.error("❌ WebSocket error:", data.message);
  }, []);

  const addNewMessage = useCallback((data: WebSocketMessage) => {
    setMessages((prev) => {
      const exists = prev.some((msg) => msg.id === data.message_id);
      if (exists) return prev;

      const newMessage = {
        id: data.message_id,
        content: data.message,
        timestamp: data.timestamp,
        device_sender: { device_id: data.device_id },
        sender_name: data.sender_name,
        status: data.status ?? "delivered",
      };
      return [...prev, newMessage];
    });
  }, []);

  const markMessagesRead = useCallback((messageIds: number[] | undefined) => {
    if (!Array.isArray(messageIds)) return;

    setMessages((prev) =>
      prev.map((msg) =>
        messageIds.includes(msg.id) ? { ...msg, status: "read" } : msg
      )
    );
  }, []);

  const markMessageDelivered = useCallback((messageId?: string) => {
    if (!messageId) return;

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id.toString() === messageId.toString()
          ? { ...msg, status: "delivered" }
          : msg
      )
    );
  }, []);

  const handleUnknownMessage = useCallback((data: WebSocketMessage) => {
    if (!data.message || !data.message_id) {
      console.error("🤷 Unknown message format:", data);
      return;
    }

    const messageObj = {
      type: "new_message",
      message: data.message,
      message_id: data.message_id,
      device_id: data.device_id,
      timestamp: data.timestamp,
      sender_name: data.sender_name,
      conversation_id: data.conversation_id,
    };

    setMessages((prev) => [...prev, messageObj]);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    setMessages([]);
  }, [conversationId]);

  return {
    isConnected,
    messages,
    chatList,
    profile,
    sendMessage: sendChatMessage,
    getProfile,
    getChatList,
    getConversationMessages,
    connect,
    disconnect,
  };
};
