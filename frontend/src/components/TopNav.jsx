import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";
import useShowToast from "../hooks/useShowToast";
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Typography,
  Skeleton,
  Avatar,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import {
  Home as HomeIcon,
  Message as MessageIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { Flex as AntdFlex } from "antd";
import { motion } from "framer-motion";

const TopNav = ({ user, sx }) => {
  const navigate = useNavigate();
  const showToast = useShowToast();
  const [, setUser] = useRecoilState(userAtom);
  const [, setPosts] = useRecoilState(postsAtom);
  const [loading, setLoading] = useState(true);
  const isMediumScreen = useMediaQuery("(min-width:500px) and (max-width:1024px)");
  const isSmallScreen = useMediaQuery("(<max-width:501></max-width:501>px)");

  // Simulate loading (replace with actual data fetch if needed)
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setPosts({ posts: [], stories: [] });
    showToast("Success", "Logged out successfully", "success");
    navigate("/auth");
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        bgcolor: "#1A202C",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        top: 0,
        zIndex: 1200,
        ...sx, // Allow external sx props from App component
      }}
    >
      <Toolbar
        sx={{
          maxWidth: { xs: "100%", md: "900px", lg: "1200px" },
          mx: "auto",
          width: "100%",
          px: { xs: 2, md: 4 },
          py: isMediumScreen ? 1 : 0, // Reduced padding for medium screens
          flexWrap: isMediumScreen ? "wrap" : "nowrap", // Allow wrapping on medium screens
        }}
      >
        {/* Left Side - Logo and Animated Name */}
        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="text" width={100} sx={{ fontSize: "1.5rem" }} />
          </Box>
        ) : (
          <AntdFlex align="center" gap={isMediumScreen ? 8 : 16}>
            <Box
              component={motion.div}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              sx={{
                bgcolor: "white",
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#1A202C",
                fontWeight: "bold",
                fontSize: "1rem",
              }}
            >
              NR
            </Box>
            <Typography
              component={motion.p}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
              variant={isSmallScreen ? "body1" : "h6"} // Smaller text on small screens
              sx={{ color: "white", fontWeight: "bold" }}
            >
              NR BLOG
            </Typography>
          </AntdFlex>
        )}

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Right Side - Navigation Icons */}
        {loading ? (
          <Box sx={{ display: "flex", gap: 1 }}>
            {[...Array(isMediumScreen ? 4 : 5)].map((_, index) => (
              <Skeleton
                key={index}
                variant="circular"
                width={40}
                height={40}
              />
            ))}
          </Box>
        ) : (
          <AntdFlex gap={isMediumScreen ? 4 : 8} align="center">
            <Tooltip title="Home">
              <IconButton
                component={motion.button}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate("/")}
                sx={{ color: "white", p: isMediumScreen ? 0.5 : 1 }}
                aria-label="Home"
              >
                <HomeIcon fontSize={isMediumScreen ? "small" : "medium"} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Chat">
              <IconButton
                component={motion.button}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate("/chat")}
                sx={{ color: "white", p: isMediumScreen ? 0.5 : 1 }}
                aria-label="Chat"
              >
                <MessageIcon fontSize={isMediumScreen ? "small" : "medium"} />
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
              >
                <Avatar
                  src={user?.profilePic}
                  alt={user?.username}
                  sx={{ width: isMediumScreen ? 28 : 32, height: isMediumScreen ? 28 : 32 }}
                />
              </IconButton>
            </Tooltip>
            {!isMediumScreen && ( // Hide settings on medium screens to save space
              <Tooltip title="Settings">
                <IconButton
                  component={motion.button}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate("/settings")}
                  sx={{ color: "white", p: isMediumScreen ? 0.5 : 1 }}
                  aria-label="Settings"
                >
                  <SettingsIcon fontSize={isMediumScreen ? "small" : "medium"} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Logout">
              <IconButton
                component={motion.button}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleLogout}
                sx={{ color: "white", p: isMediumScreen ? 0.5 : 1 }}
                aria-label="Logout"
              >
                <LogoutIcon fontSize={isMediumScreen ? "small" : "medium"} />
              </IconButton>
            </Tooltip>
          </AntdFlex>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default TopNav;