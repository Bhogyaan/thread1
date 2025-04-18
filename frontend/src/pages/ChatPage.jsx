import { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { motion } from "framer-motion";
import {
  Avatar,
  Box,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography,
  useMediaQuery,
  Badge,
} from "@mui/material";
import { Search as SearchIcon, ArrowBack } from "@mui/icons-material";
import { message, Skeleton } from "antd";
import MessageContainer from "../components/MessageContainer";
import MessageInput from "../components/MessageInput";
import {
  conversationsAtom,
  selectedConversationAtom,
} from "../atoms/messagesAtom";
import userAtom from "../atoms/userAtom";
import { useSocket } from "../context/SocketContext";

const ChatPage = () => {
  const [searchingUser, setSearchingUser] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedConversation, setSelectedConversation] = useRecoilState(selectedConversationAtom);
  const [conversations, setConversations] = useRecoilState(conversationsAtom);
  const currentUser = useRecoilValue(userAtom);
  const { socket, onlineUsers } = useSocket();
  const isSmall = useMediaQuery("(max-width:600px)");
  const isMedium = useMediaQuery("(min-width:601px) and (max-width:960px)");

  useEffect(() => {
    if (!socket) return;

    const handleMessagesSeen = ({ conversationId }) => {
      console.log("Messages seen for conversation:", conversationId);
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation._id === conversationId
            ? { ...conversation, lastMessage: { ...conversation.lastMessage, seen: true } }
            : conversation
        )
      );
    };

    const handleNewMessage = (message) => {
      console.log("New message received:", message);
      setConversations((prev) => {
        const exists = prev.find((c) => c._id === message.conversationId);
        if (exists) {
          return prev.map((conversation) =>
            conversation._id === message.conversationId
              ? {
                  ...conversation,
                  lastMessage: {
                    text: message.text || "Media",
                    sender: message.sender,
                    seen: message.sender._id === currentUser._id,
                  },
                }
              : conversation
          );
        }
        return [
          ...prev,
          {
            _id: message.conversationId,
            participants: [
              {
                _id: message.sender._id,
                username: message.sender.username,
                profilePic: message.sender.profilePic,
              },
            ],
            lastMessage: {
              text: message.text || "Media",
              sender: message.sender,
              seen: message.sender._id === currentUser._id,
            },
            mock: false,
          },
        ];
      });

      if (message.sender._id !== currentUser._id && !selectedConversation._id) {
        setSelectedConversation({
          _id: message.conversationId,
          userId: message.sender._id,
          username: message.sender.username,
          userProfilePic: message.sender.profilePic,
          isOnline: onlineUsers.includes(message.sender._id),
          mock: false,
        });
      }
    };

    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, setConversations, currentUser._id, selectedConversation._id, setSelectedConversation, onlineUsers]);

  useEffect(() => {
    const getConversations = async () => {
      try {
        const res = await fetch("/api/messages/conversations", { credentials: "include" });
        const data = await res.json();
        if (data.error) {
          message.error(data.error);
          return;
        }
        setConversations(data);
      } catch (error) {
        message.error(error.message);
      } finally {
        setLoadingConversations(false);
      }
    };
    getConversations();
  }, [setConversations]);

  const handleConversationSearch = async (e) => {
    e.preventDefault();
    if (!searchText.trim()) return;
    setSearchingUser(true);
    try {
      const res = await fetch(`/api/users/profile/${searchText}`, { credentials: "include" });
      const searchedUser = await res.json();
      if (searchedUser.error) {
        message.error(searchedUser.error);
        return;
      }
      if (searchedUser._id === currentUser._id) {
        message.error("You cannot message yourself");
        return;
      }
      const conversationAlreadyExists = conversations.find(
        (conversation) => conversation.participants[0]._id === searchedUser._id
      );
      if (conversationAlreadyExists) {
        setSelectedConversation({
          _id: conversationAlreadyExists._id,
          userId: searchedUser._id,
          username: searchedUser.username,
          userProfilePic: searchedUser.profilePic,
          isOnline: onlineUsers.includes(searchedUser._id),
          mock: false,
        });
        return;
      }
      const mockConversation = {
        mock: true,
        lastMessage: { text: "", sender: "" },
        _id: `mock_${Date.now()}`,
        participants: [
          {
            _id: searchedUser._id,
            username: searchedUser.username,
            profilePic: searchedUser.profilePic,
          },
        ],
      };
      setConversations((prevConvs) => [...prevConvs, mockConversation]);
      setSelectedConversation({
        _id: mockConversation._id,
        userId: searchedUser._id,
        username: searchedUser.username,
        userProfilePic: searchedUser.profilePic,
        isOnline: onlineUsers.includes(searchedUser._id),
        mock: true,
      });
    } catch (error) {
      message.error(error.message);
    } finally {
      setSearchingUser(false);
      setSearchText("");
    }
  };

  const handleBack = () => {
    setSelectedConversation({
      _id: "",
      userId: "",
      username: "",
      userProfilePic: "",
      isOnline: false,
      mock: false,
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          flexDirection: isSmall ? "column" : "row",
          bgcolor: "#121212",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Chat List Sidebar */}
        <Box
          sx={{
            width: isSmall ? "100%" : isMedium ? "280px" : "350px",
            height: isSmall ? "auto" : "100%",
            display: isSmall && selectedConversation._id ? "none" : "flex",
            flexDirection: "column",
            bgcolor: "#1e1e1e",
            borderRight: isSmall ? "none" : "1px solid #333",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              p: { xs: 1, sm: 2 },
              bgcolor: "#2c3e50",
              color: "white",
              flexShrink: 0,
            }}
          >
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{ textAlign: "center", fontSize: { xs: "1rem", sm: "1.25rem" } }}
            >
              Chats
            </Typography>
          </Box>
          <Box sx={{ p: { xs: 1, sm: 2 }, flexShrink: 0 }}>
            <form onSubmit={handleConversationSearch}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search users..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                disabled={searchingUser}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "white" }} />
                    </InputAdornment>
                  ),
                  sx: {
                    bgcolor: "#333",
                    borderRadius: 2,
                    "& fieldset": { border: "none" },
                    color: "white",
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  },
                }}
                sx={{ bgcolor: "#333", borderRadius: 2 }}
              />
            </form>
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {loadingConversations ? (
              <List>
                {[0, 1, 2, 3].map((_, i) => (
                  <ListItem key={i} sx={{ py: { xs: 1, sm: 1.5 } }}>
                    <ListItemAvatar>
                      <Skeleton
                        animation="wave"
                        variant="circular"
                        width="40px"
                        height="40px"
                        sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Skeleton
                          animation="wave"
                          variant="text"
                          width="80%"
                          sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }}
                        />
                      }
                      secondary={
                        <Skeleton
                          animation="wave"
                          variant="text"
                          width="60%"
                          sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }}
                        />
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <List>
                {conversations.map((conversation) => (
                  <motion.div
                    key={conversation._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ListItem
                      sx={{
                        "&:hover": { bgcolor: "#333" },
                        py: { xs: 1, sm: 1.5 },
                        cursor: "pointer",
                        bgcolor: selectedConversation._id === conversation._id ? "#333" : "transparent",
                      }}
                      onClick={() =>
                        setSelectedConversation({
                          _id: conversation._id,
                          userId: conversation.participants[0]._id,
                          username: conversation.participants[0].username,
                          userProfilePic: conversation.participants[0].profilePic,
                          isOnline: onlineUsers.includes(conversation.participants[0]._id),
                          mock: conversation.mock || false,
                        })
                      }
                    >
                      <ListItemAvatar>
                        <Badge
                          color="success"
                          variant="dot"
                          invisible={!onlineUsers.includes(conversation.participants[0]._id)}
                        >
                          <Avatar
                            src={conversation.participants[0].profilePic}
                            sx={{ width: { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 } }}
                          />
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography
                            variant="body1"
                            color="white"
                            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" }, fontWeight: conversation.lastMessage.seen ? "normal" : "bold" }}
                          >
                            {conversation.participants[0].username}
                          </Typography>
                        }
                        secondary={
                          <Typography
                            noWrap
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                          >
                            {conversation.lastMessage.text || "No messages yet"}
                          </Typography>
                        }
                      />
                    </ListItem>
                  </motion.div>
                ))}
              </List>
            )}
          </Box>
        </Box>

        {/* Chat Area */}
        {selectedConversation._id ? (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
            {isSmall && (
              <Box
                sx={{
                  p: 1,
                  bgcolor: "#2c3e50",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <IconButton onClick={handleBack} sx={{ color: "white" }}>
                  <ArrowBack />
                </IconButton>
                <Typography variant="h6" sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
                  {selectedConversation.username}
                </Typography>
              </Box>
            )}
            <MessageContainer userId={selectedConversation.userId} />
            <MessageInput />
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "#1e1e1e",
              width: "100%",
            }}
          >
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
            >
              Select a chat to start messaging
            </Typography>
          </Box>
        )}
      </Box>
    </motion.div>
  );
};

export default ChatPage;