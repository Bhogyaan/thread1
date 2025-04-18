import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import useShowToast from "../hooks/useShowToast";

// MUI Imports
import {
  Box,
  IconButton,
  Tooltip,
  Skeleton,
  Avatar,
} from "@mui/material";
import {
  Home as HomeIcon,
  Search as SearchIcon,
  PersonOutline as PersonIcon,
  Chat as ChatIcon,
  AddBox as AddBoxIcon,
} from "@mui/icons-material";

// Antd Imports
import { Flex as AntdFlex } from "antd";

// Framer Motion Imports
import { motion } from "framer-motion";

const BottomNav = ({ onOpenCreatePost }) => {
  const [loading, setLoading] = useState(true); // Skeleton loading state
  const navigate = useNavigate();
  const location = useLocation();
  const user = useRecoilValue(userAtom);
  const showToast = useShowToast();

  // Simulate loading for demo purposes
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000); // 2-second loading simulation
    return () => clearTimeout(timer);
  }, []);

  // Only show on small screens (below 500px)
  const isBelow500px = window.innerWidth <= 500; // Simplified media query for demo
  if (!isBelow500px) return null;

  const isActive = (path) => location.pathname === path;

  const handleProfileClick = () => {
    if (!user || !user.username) {
      showToast("Error", "You must be logged in to view your profile", "error");
      return;
    }
    navigate(`/${user.username}`);
  };

  const handleCreatePostClick = () => {
    if (!user) {
      showToast("Error", "You must be logged in to create a post", "error");
      return;
    }
    onOpenCreatePost();
  };

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: "#1A202C", // Mimics gray.800
        color: "white",
        py: 1,
        zIndex: 10,
        boxShadow: "0 -2px 10px rgba(0,0,0,0.2)",
      }}
    >
      {loading ? (
        <AntdFlex justify="space-around">
          {[...Array(5)].map((_, index) => (
            <Skeleton
              key={index}
              variant="circular"
              width={48}
              height={48}
            />
          ))}
        </AntdFlex>
      ) : (
        <AntdFlex justify="space-around" align="center">
          <Tooltip title="Home">
            <IconButton
              component={motion.button}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/")}
              sx={{
                color: isActive("/") ? "#42A5F5" : "white", // blue.400 equivalent
                "&:hover": { color: "#42A5F5" },
              }}
              aria-label="Home"
            >
              <HomeIcon fontSize="large" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Create Post">
            <IconButton
              component={motion.button}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleCreatePostClick}
              sx={{
                color: isActive("/create-post") ? "#42A5F5" : "white",
                "&:hover": { color: "#42A5F5" },
              }}
              aria-label="Create Post"
            >
              <AddBoxIcon fontSize="large" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Search">
            <IconButton
              component={motion.button}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/search")}
              sx={{
                color: isActive("/search") ? "#42A5F5" : "white",
                "&:hover": { color: "#42A5F5" },
              }}
              aria-label="Search"
            >
              <SearchIcon fontSize="large" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Profile">
          <IconButton
  component={motion.button}
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.9 }}
  onClick={() => navigate(`/${user?.username}`)}
  sx={{ p: 0, borderRadius: "50%" }}
  aria-label="Profile"
  title="Profile"
>
  <Avatar
    src={user?.profilePic}
    alt={user?.username}
    sx={{ width: 32, height: 32 }}
  />
</IconButton>
          </Tooltip>

          <Tooltip title="Chat">
            <IconButton
              component={motion.button}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate("/chat")}
              sx={{
                color: isActive("/chat") ? "#42A5F5" : "white",
                "&:hover": { color: "#42A5F5" },
              }}
              aria-label="Chat"
            >
              <ChatIcon fontSize="large" />
            </IconButton>
          </Tooltip>
        </AntdFlex>
      )}
    </Box>
  );
};

export default BottomNav;
