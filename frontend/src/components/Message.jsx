import React, { useState } from "react";
import { Avatar, Box, Typography, Paper, Skeleton } from "@mui/material";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import { selectedConversationAtom } from "../atoms/messagesAtom";
import { BsCheck, BsCheck2All } from "react-icons/bs";
import { motion } from "framer-motion";
import { format } from "date-fns";

const Message = ({ isOwnMessage, message }) => {
  const selectedConversation = useRecoilValue(selectedConversationAtom);
  const user = useRecoilValue(userAtom);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const renderMedia = () => {
    if (!message.img) return null;

    const fileType = message.img.split(";")[0].split(":")[1] || "";
    if (fileType.includes("image")) {
      return (
        <Box
          component="img"
          src={message.img}
          alt="Message content"
          sx={{
            maxWidth: "100%",
            maxHeight: { xs: "120px", sm: "150px", md: "200px" },
            borderRadius: "12px",
            display: mediaLoaded ? "block" : "none",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
          onLoad={() => setMediaLoaded(true)}
          onError={() => setMediaLoaded(true)}
        />
      );
    } else if (fileType.includes("video")) {
      return (
        <Box
          component="video"
          src={message.img}
          controls
          sx={{
            maxWidth: "100%",
            maxHeight: { xs: "120px", sm: "150px", md: "200px" },
            borderRadius: "12px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        />
      );
    } else if (fileType.includes("audio")) {
      return (
        <Box
          component="audio"
          src={message.img}
          controls
          sx={{
            width: "100%",
            "& audio": {
              width: "100%",
              height: "40px",
              borderRadius: "12px",
              bgcolor: "rgba(255, 255, 255, 0.1)",
            },
          }}
        />
      );
    } else if (fileType.includes("pdf") || fileType.includes("text")) {
      return (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
        >
          Document: <a href={message.img} download style={{ color: "#9b59b6" }}>Download</a>
        </Typography>
      );
    }
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
      >
        Unsupported media: <a href={message.img} download style={{ color: "#9b59b6" }}>Download</a>
      </Typography>
    );
  };

  const renderStatus = () => {
    if (!isOwnMessage) return null;
    if (message.seen || message.status === "seen") {
      return (
        <Box sx={{ position: "relative" }} title="Seen">
          <BsCheck2All size={18} color="#4caf50" />
        </Box>
      );
    } else if (message.status === "delivered") {
      return (
        <Box sx={{ position: "relative" }} title="Delivered">
          <BsCheck2All size={18} color="#bdc3c7" />
        </Box>
      );
    }
    return (
      <Box sx={{ position: "relative" }} title="Sent">
        <BsCheck size={18} color="#bdc3c7" />
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isOwnMessage ? "row-reverse" : "row",
        alignItems: "flex-end",
        mb: 1,
        px: { xs: 1, sm: 2 },
      }}
    >
      {!isOwnMessage && (
        <Avatar
          src={selectedConversation.userProfilePic}
          sx={{ width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 }, mr: 1 }}
        />
      )}
      <Paper
        sx={{
          p: { xs: 1, sm: 1.5 },
          bgcolor: isOwnMessage ? "#9b59b6" : "rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          backdropFilter: "blur(10px)",
          maxWidth: { xs: "75%", sm: "70%", md: "60%" },
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
        component={motion.div}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {message.text && (
          <Typography
            variant="body2"
            sx={{
              wordBreak: "break-word",
              color: isOwnMessage ? "white" : "text.secondary",
              fontSize: { xs: "0.875rem", sm: "0.9375rem" },
            }}
          >
            {message.text}
          </Typography>
        )}
        {message.img && (
          <Box sx={{ mt: message.text ? 1 : 0 }}>
            {renderMedia()}
            {!mediaLoaded && message.img.includes("image") && (
              <Skeleton
                variant="rectangular"
                width="100%"
                height={{ xs: 120, sm: 150, md: 200 }}
                sx={{ borderRadius: "12px", bgcolor: "rgba(255, 255, 255, 0.1)" }}
              />
            )}
          </Box>
        )}
        <Box
          sx={{
            display: "flex",
            justifyContent: isOwnMessage ? "flex-end" : "flex-start",
            alignItems: "center",
            mt: 0.5,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              mr: isOwnMessage ? 0.5 : 0,
              fontSize: { xs: "0.75rem", sm: "0.8125rem" },
            }}
          >
            {format(new Date(message.createdAt), "h:mm a")}
          </Typography>
          {renderStatus()}
        </Box>
      </Paper>
    </Box>
  );
};

export default Message;