import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import useShowToast from "../hooks/useShowToast";
import { Box, Typography } from "@mui/material";
import { Skeleton } from "antd";
import { motion } from "framer-motion";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import { selectedConversationAtom } from "../atoms/messagesAtom";
import { useSocket } from "../context/SocketContext";
import Message from "./Message";

const MessageContainer = ({ userId }) => {
  const currentUser = useRecoilValue(userAtom);
  const selectedConversation = useRecoilValue(selectedConversationAtom);
  const { socket } = useSocket();
  const showToast = useShowToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [isValidating, setIsValidating] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (!userId) {
      showToast("Error", "No recipient selected", "error");
      navigate("/chat");
      setIsValidating(false);
      return;
    }
    setIsValidating(false);
  }, [userId, showToast, navigate]);

  useEffect(() => {
    if (isValidating || !userId) return;

    const getMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await fetch(`/api/messages/${userId}`, { credentials: "include" });
        const data = await res.json();
        if (data.error) {
          showToast("Error", data.error, "error");
          return;
        }
        setMessages(data);
        if (data.length > 0) {
          setConversationId(data[0].conversationId);
        } else {
          const convRes = await fetch(`/api/messages/conversations`, { credentials: "include" });
          const convData = await convRes.json();
          const conv = convData.find((c) => c.participants.some((p) => p._id === userId));
          if (conv) setConversationId(conv._id);
        }
      } catch (error) {
        showToast("Error", error.message, "error");
      } finally {
        setLoadingMessages(false);
      }
    };

    getMessages();
  }, [userId, showToast, isValidating]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      const isRelevantChat =
        message.conversationId === conversationId ||
        (message.sender._id === userId && message.recipientId === currentUser._id) ||
        (message.sender._id === currentUser._id && message.recipientId === userId);

      if (isRelevantChat) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) {
            return prev.map((m) => (m._id === message._id ? { ...m, status: message.status } : m));
          }
          return [...prev, { ...message, status: message.sender._id === currentUser._id ? "sent" : "received" }];
        });
        if (!conversationId) setConversationId(message.conversationId);

        socket.emit("messageDelivered", {
          messageId: message._id,
          conversationId: message.conversationId,
          recipientId: currentUser._id,
        });
      }
    };

    const handleMessagesSeen = ({ conversationId: cid, seenMessages }) => {
      if (cid === conversationId) {
        setMessages((prev) =>
          prev.map((msg) =>
            seenMessages.includes(msg._id.toString())
              ? { ...msg, seen: true, status: "seen" }
              : msg
          )
        );
      }
    };

    const handleMessageDelivered = ({ messageId, conversationId: cid }) => {
      if (cid === conversationId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId ? { ...msg, status: "delivered" } : msg
          )
        );
      }
    };

    const handleTyping = ({ conversationId: cid, userId: typingUserId }) => {
      if (cid === conversationId && typingUserId !== currentUser._id) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = ({ conversationId: cid, userId: typingUserId }) => {
      if (cid === conversationId && typingUserId !== currentUser._id) {
        setIsTyping(false);
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("messageDelivered", handleMessageDelivered);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    if (conversationId && selectedConversation._id === conversationId) {
      socket.emit("markMessagesAsSeen", { conversationId, userId: currentUser._id });
    }

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("messageDelivered", handleMessageDelivered);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
    };
  }, [socket, userId, currentUser._id, conversationId, selectedConversation._id]);

  const dotVariants = {
    animate: {
      y: [0, -8, 0],
      transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" },
    },
  };

  if (isValidating || loadingMessages) {
    return (
      <Box sx={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Skeleton
          active
          animation="wave"
          paragraph={{ rows: 6 }}
          title={false}
          sx={{ width: "100%", maxWidth: { xs: "100%", sm: "600px", md: "800px" } }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        p: { xs: 1, sm: 2 },
        overflowY: "auto",
        bgcolor: "#1e1e1e",
        borderRadius: { xs: 0, sm: "8px" },
      }}
    >
      {messages.length === 0 && (
        <Typography color="text.secondary" textAlign="center" sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          No messages yet. Start the conversation!
        </Typography>
      )}
      {messages.map((message) => (
        <Message
          key={message._id}
          message={message}
          isOwnMessage={message.sender._id === currentUser._id}
        />
      ))}
      {isTyping && (
        <Box display="flex" alignItems="center" gap={1} mt={1} px={2}>
          <motion.div
            variants={dotVariants}
            animate="animate"
            style={{ width: 8, height: 8, backgroundColor: "#9b59b6", borderRadius: "50%" }}
          />
          <motion.div
            variants={dotVariants}
            animate="animate"
            style={{ width: 8, height: 8, backgroundColor: "#9b59b6", borderRadius: "50%" }}
            transition={{ delay: 0.2 }}
          />
          <motion.div
            variants={dotVariants}
            animate="animate"
            style={{ width: 8, height: 8, backgroundColor: "#9b59b6", borderRadius: "50%" }}
            transition={{ delay: 0.4 }}
          />
          <Typography variant="body2" color="text.secondary">
            Typing...
          </Typography>
        </Box>
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};

MessageContainer.propTypes = {
  userId: PropTypes.string.isRequired,
};

export default MessageContainer;