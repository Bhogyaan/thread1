import React, { useRef, useState, useEffect } from "react";
import { Box, IconButton, InputAdornment, TextField, CircularProgress } from "@mui/material";
import { IoSendSharp } from "react-icons/io5";
import { BsFillImageFill } from "react-icons/bs";
import { Description as DescriptionIcon, Close as CloseIcon } from "@mui/icons-material";
import useShowToast from "../hooks/useShowToast";
import { conversationsAtom, selectedConversationAtom } from "../atoms/messagesAtom";
import { useRecoilValue, useSetRecoilState } from "recoil";
import usePreviewImg from "../hooks/usePreviewImg";
import { motion } from "framer-motion";
import { useSocket } from "../context/SocketContext";

const MessageInput = () => {
  const [messageText, setMessageText] = useState("");
  const showToast = useShowToast();
  const selectedConversation = useRecoilValue(selectedConversationAtom);
  const setConversations = useSetRecoilState(conversationsAtom);
  const setSelectedConversation = useSetRecoilState(selectedConversationAtom);
  const imageRef = useRef(null);
  const docRef = useRef(null);
  const { handleImageChange, mediaUrl, setMediaUrl, mediaType, setMediaType } = usePreviewImg();
  const [isSending, setIsSending] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !selectedConversation._id) return;

    let typingTimeout;
    const emitTyping = () => {
      socket.emit("typing", { conversationId: selectedConversation._id });
    };
    const emitStopTyping = () => {
      socket.emit("stopTyping", { conversationId: selectedConversation._id });
    };

    if (messageText) {
      emitTyping();
      typingTimeout = setTimeout(emitStopTyping, 2000);
    } else {
      emitStopTyping();
    }

    return () => clearTimeout(typingTimeout);
  }, [messageText, selectedConversation._id, socket]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText && !mediaUrl) return;
    if (isSending) return;
    if (!selectedConversation.userId) {
      showToast("Error", "No recipient selected", "error");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          recipientId: selectedConversation.userId,
          img: mediaUrl,
        }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }

      console.log("Message sent:", data);

      if (selectedConversation.mock) {
        setConversations((prevConvs) =>
          prevConvs.map((conv) =>
            conv._id === selectedConversation._id
              ? {
                  ...conv,
                  _id: data.conversationId,
                  mock: false,
                  lastMessage: { text: messageText || "Media", sender: data.sender },
                }
              : conv
          )
        );
        setSelectedConversation((prev) => ({
          ...prev,
          _id: data.conversationId,
          mock: false,
        }));
      } else {
        setConversations((prevConvs) =>
          prevConvs.map((conv) =>
            conv._id === selectedConversation._id
              ? {
                  ...conv,
                  lastMessage: { text: messageText || "Media", sender: data.sender },
                }
              : conv
          )
        );
      }

      setMessageText("");
      setMediaUrl(null);
      setMediaType(null);
    } catch (error) {
      showToast("Error", error.message, "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelMedia = () => {
    setMediaUrl(null);
    setMediaType(null);
    imageRef.current.value = null;
    docRef.current.value = null;
  };

  const renderMediaPreview = () => {
    if (!mediaUrl) return null;
    switch (mediaType) {
      case "image":
        return (
          <Box
            component="img"
            src={mediaUrl}
            alt="Preview"
            sx={{
              maxWidth: "100%",
              maxHeight: { xs: "80px", sm: "120px", md: "150px" },
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            }}
          />
        );
      case "video":
        return (
          <Box
            component="video"
            src={mediaUrl}
            controls
            sx={{
              maxWidth: "100%",
              maxHeight: { xs: "80px", sm: "120px", md: "150px" },
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            }}
          />
        );
      case "audio":
        return (
          <Box
            component="audio"
            src={mediaUrl}
            controls
            sx={{
              width: "100%",
              "& audio": {
                width: "100%",
                borderRadius: "8px",
                bgcolor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          />
        );
      case "document":
        return (
          <Typography variant="body2" color="text.secondary">
            Document: {imageRef.current?.files[0]?.name || docRef.current?.files[0]?.name}
          </Typography>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ flexShrink: 0, padding: { xs: "8px", sm: "12px" } }}
    >
      {mediaUrl && (
        <Box
          sx={{
            mb: 1,
            p: 1,
            bgcolor: "rgba(255, 255, 255, 0.05)",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {renderMediaPreview()}
          <IconButton onClick={handleCancelMedia} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Box>
      )}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: "rgba(255, 255, 255, 0.05)",
          borderRadius: "12px",
          p: 1,
          border: "1px solid rgba(255, 255, 255, 0.2)",
          backdropFilter: "blur(10px)",
        }}
      >
        <IconButton
          onClick={() => imageRef.current.click()}
          sx={{ color: "white", p: 0.5 }}
        >
          <BsFillImageFill size={20} />
        </IconButton>
        <IconButton
          onClick={() => docRef.current.click()}
          sx={{ color: "white", p: 0.5 }}
        >
          <DescriptionIcon fontSize="small" />
        </IconButton>
        <form onSubmit={handleSendMessage} style={{ flex: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={isSending}
            sx={{
              bgcolor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              "& fieldset": { border: "none" },
              "& input": { color: "white", fontSize: { xs: "0.875rem", sm: "1rem" } },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={isSending || (!messageText && !mediaUrl)}
                    sx={{ color: "#9b59b6", p: 0.5 }}
                  >
                    {isSending ? (
                      <CircularProgress size={20} sx={{ color: "#9b59b6" }} />
                    ) : (
                      <IoSendSharp size={20} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </form>
        <input
          type="file"
          hidden
          ref={imageRef}
          accept="image/*,video/*,audio/*"
          onChange={handleImageChange}
        />
        <input
          type="file"
          hidden
          ref={docRef}
          accept=".pdf,.doc,.docx,.txt"
          onChange={handleImageChange}
        />
      </Box>
    </motion.div>
  );
};

export default MessageInput;