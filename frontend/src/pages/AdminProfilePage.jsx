import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { motion } from "framer-motion";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
  Tabs,
  Tab,
  useMediaQuery,
  TextField,
} from "@mui/material";
import { ConfigProvider, App, message } from "antd";
import { Verified as VerifiedIcon } from "@mui/icons-material";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";
import { useSocket } from "../context/SocketContext";
import useShowToast from "../hooks/useShowToast";
import Post from "../components/Post";
import AdminDashboard from "./AdminDashboard";

const AdminProfilePage = () => {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingPosts, setFetchingPosts] = useState(true);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  const [postsState, setPostsState] = useRecoilState(postsAtom);
  const currentUser = useRecoilValue(userAtom);
  const setCurrentUser = useSetRecoilState(userAtom);
  const navigate = useNavigate();
  const isSmallScreen = useMediaQuery("(max-width: 600px)");
  const isMediumScreen = useMediaQuery("(max-width: 1200px)");
  const [tabValue, setTabValue] = useState(0);
  const socketContext = useSocket();
  const socket = socketContext?.socket;
  const showToast = useShowToast();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!socket) {
      console.warn("Socket is not initialized in AdminProfilePage");
    } else {
      socket.on("newPost", (post) => {
        setPostsState((prev) => ({
          ...prev,
          posts: [post, ...prev.posts],
        }));
      });

      socket.on("postDeleted", ({ postId }) => {
        setPostsState((prev) => ({
          ...prev,
          posts: prev.posts.filter((p) => p._id !== postId),
        }));
      });

      return () => {
        socket.off("newPost");
        socket.off("postDeleted");
      };
    }
  }, [socket, setPostsState]);

  useEffect(() => {
    const getUser = async () => {
      try {
        let userData;
        if (currentUser && currentUser.username === username) {
          userData = currentUser;
        } else {
          const userRes = await fetch(`/api/users/profile/${username}`, {
            credentials: "include",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          userData = await userRes.json();
          if (!userRes.ok) throw new Error(userData.error || "User profile not found");
        }
        setUser(userData);
      } catch (error) {
        message.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    const getAllPosts = async () => {
      try {
        const res = await fetch("/api/posts/all", {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setPostsState((prev) => ({ ...prev, posts: data }));
      } catch (error) {
        message.error(error.message);
      } finally {
        setFetchingPosts(false);
      }
    };

    const getAllUsers = async () => {
      try {
        const res = await fetch("/api/users/all", {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setUsers(data);
      } catch (error) {
        message.error(error.message);
      } finally {
        setFetchingUsers(false);
      }
    };

    if (currentUser?.isAdmin) {
      getUser();
      getAllPosts();
      getAllUsers();
    }
  }, [username, currentUser, setPostsState]);

  const handleLogout = () => {
    localStorage.removeItem("user-threads");
    localStorage.removeItem("token");
    setCurrentUser(null);
    navigate("/auth");
    message.success("Logged out successfully");
  };

  const handleEditProfile = () => {
    navigate("/edit-profile");
  };

  const handleBanUnbanPost = async (postId, isBanned) => {
    try {
      const endpoint = isBanned ? `/api/posts/unban/${postId}` : `/api/posts/ban/${postId}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPostsState((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => (p._id === postId ? { ...p, isBanned: !isBanned } : p)),
      }));
      showToast("Success", data.message, "success");
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const handleBanUnbanUser = async (userId, isBanned) => {
    try {
      const endpoint = isBanned ? `/api/users/unban/${userId}` : `/api/users/ban/${userId}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isBanned: !isBanned } : u))
      );
      showToast("Success", data.message, "success");
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  if (!currentUser?.isAdmin) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="h6" color="text.primary">
          Admin access required
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Typography variant="h6" color="text.primary">User not found</Typography>
      </Box>
    );
  }

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getGridColumns = () => {
    if (isSmallScreen) return "1fr";
    if (isMediumScreen) return "1fr 1fr";
    return "1fr 1fr 1fr 1fr";
  };

  return (
    <ConfigProvider>
      <App>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <Box sx={{ minHeight: "100vh", p: isSmallScreen ? 1 : 3, pb: isSmallScreen ? 8 : 0 }}>
            <Card
              sx={{
                mb: 2,
                pt: 2,
                bgcolor: "background.paper",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                width: "100%",
                maxWidth: 500,
                mx: "auto",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", flexDirection: isSmallScreen ? "column" : "row" }}>
                <Avatar
                  src={user.profilePic}
                  alt={user.username}
                  sx={{
                    width: isSmallScreen ? 77 : 150,
                    height: isSmallScreen ? 77 : 150,
                    border: "2px solid #fff",
                    mb: isSmallScreen ? 2 : 0,
                    mr: !isSmallScreen ? 3 : 0,
                  }}
                />
                <Box sx={{ flex: 1, textAlign: isSmallScreen ? "center" : "left" }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1, justifyContent: isSmallScreen ? "center" : "flex-start" }}>
                    <Typography variant="h6" sx={{ fontWeight: 400, mr: 1, color: "text.primary" }}>
                      {user.username}
                    </Typography>
                    <VerifiedIcon color="primary" fontSize="small" />
                    <Box sx={{ ml: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleEditProfile}
                        sx={{ mr: 2, borderRadius: 20, textTransform: "none", borderColor: "primary.main", color: "text.primary" }}
                      >
                        Edit Profile
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleLogout}
                        sx={{ borderRadius: 20, textTransform: "none", borderColor: "primary.main", color: "text.primary" }}
                      >
                        Logout
                      </Button>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: isSmallScreen ? 2 : 4, mb: 2, justifyContent: isSmallScreen ? "center" : "flex-start" }}>
                    <Card sx={{ p: 1, minWidth: 80, textAlign: "center", bgcolor: "transparent", border: "none" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                        {postsState.posts.length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Posts</Typography>
                    </Card>
                    <Card sx={{ p: 1, minWidth: 80, textAlign: "center", bgcolor: "transparent", border: "none" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                        {user.followers?.length || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Followers</Typography>
                    </Card>
                    <Card sx={{ p: 1, minWidth: 80, textAlign: "center", bgcolor: "transparent", border: "none" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                        {user.following?.length || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Following</Typography>
                    </Card>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>{user.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{user.bio}</Typography>
                </Box>
              </Box>
            </Card>

            <Box
              sx={{
                position: "sticky",
                top: 0,
                zIndex: 1000,
                bgcolor: "background.paper",
                borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <Tabs
                value={tabValue}
                onChange={(e, newValue) => setTabValue(newValue)}
                variant={isSmallScreen ? "scrollable" : "fullWidth"}
                scrollButtons={isSmallScreen ? "auto" : "off"}
                sx={{
                  "& .MuiTab-root": {
                    minWidth: isSmallScreen ? "100px" : "auto",
                    padding: isSmallScreen ? "6px 12px" : "12px 16px",
                  },
                  "& .MuiTabs-scrollButtons": {
                    "& .MuiButtonBase-root": {
                      color: "text.primary",
                    },
                  },
                }}
                TabIndicatorProps={{ style: { backgroundColor: "primary.main" } }}
              >
                <Tab label="Dashboard" sx={{ textTransform: "none", fontWeight: 600, color: "text.primary" }} />
                <Tab label="All Users" sx={{ textTransform: "none", fontWeight: 600, color: "text.primary" }} />
                <Tab label="Banned Posts" sx={{ textTransform: "none", fontWeight: 600, color: "text.primary" }} />
                <Tab label="Banned Users" sx={{ textTransform: "none", fontWeight: 600, color: "text.primary" }} />
                <Tab label="Followers" sx={{ textTransform: "none", fontWeight: 600, color: "text.primary" }} />
                <Tab label="Following" sx={{ textTransform: "none", fontWeight: 600, color: "text.primary" }} />
              </Tabs>
            </Box>

            <Box sx={{ mt: 2, overflowY: "auto", flex: 1 }}>
              {tabValue === 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <AdminDashboard
                    users={users}
                    posts={postsState.posts}
                    isSmallScreen={isSmallScreen}
                    isMediumScreen={isMediumScreen}
                  />
                </Box>
              )}

              {tabValue === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <TextField
                    placeholder="Search users by username"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{
                      mb: 2,
                      width: "100%",
                      maxWidth: 500,
                      bgcolor: "rgba(255, 255, 255, 0.1)",
                      "& .MuiInputBase-input": { color: "text.primary" },
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                        "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.4)" },
                        "&.Mui-focused fieldset": { borderColor: "primary.main" },
                      },
                    }}
                  />
                  {fetchingUsers ? (
                    <CircularProgress sx={{ color: "primary.main" }} />
                  ) : filteredUsers.length === 0 ? (
                    <Typography color="text.primary">No users found</Typography>
                  ) : (
                    <Box
                      sx={{
                        width: "100%",
                        maxWidth: 1400,
                        display: "grid",
                        gridTemplateColumns: getGridColumns(),
                        gap: 2,
                        px: isSmallScreen ? 1 : 2,
                      }}
                    >
                      {filteredUsers.map((user) => (
                        <Card
                          key={user._id}
                          sx={{
                            bgcolor: "background.paper",
                            borderRadius: "12px",
                            border: "1px solid rgba(255, 255, 255, 0.2)",
                            width: "100%",
                            position: "relative",
                          }}
                        >
                          <CardContent
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              p: isSmallScreen ? 1.5 : 2,
                            }}
                          >
                            <Avatar
                              src={user.profilePic}
                              alt={user.username}
                              sx={{
                                width: isSmallScreen ? 50 : 60,
                                height: isSmallScreen ? 50 : 60,
                                mr: isSmallScreen ? 1.5 : 2,
                              }}
                            />
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant={isSmallScreen ? "body2" : "body1"}
                                sx={{
                                  color: "text.primary",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                onClick={() => navigate(`/${user.username}`)}
                              >
                                {user.username}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis" }}
                              >
                                ID: {user._id}
                              </Typography>
                              <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 2 }}>
                                <Typography
                                  variant="body2"
                                  sx={{ color: user.isBanned ? "error.main" : "success.main" }}
                                >
                                  Status: {user.isBanned ? "Banned" : "Active"}
                                </Typography>
                                <Button
                                  variant="contained"
                                  color={user.isBanned ? "success" : "error"}
                                  onClick={() => handleBanUnbanUser(user._id, user.isBanned)}
                                  disabled={user.isAdmin}
                                  size={isSmallScreen ? "small" : "medium"}
                                  sx={{ fontSize: isSmallScreen ? "0.75rem" : "0.875rem" }}
                                >
                                  {user.isBanned ? "Unban" : "Ban"}
                                </Button>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {tabValue === 2 && (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  {fetchingPosts ? (
                    <Card sx={{ bgcolor: "background.paper", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.2)", width: "100%", maxWidth: 600, mx: "auto" }}>
                      <CardContent sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <CircularProgress size={24} sx={{ color: "primary.main" }} />
                      </CardContent>
                    </Card>
                  ) : postsState.posts.filter((p) => p.isBanned).length === 0 ? (
                    <Card sx={{ bgcolor: "background.paper", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.2)", width: "100%", maxWidth: 600, mx: "auto" }}>
                      <CardContent sx={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Typography variant="body1" color="text.primary">No banned posts</Typography>
                      </CardContent>
                    </Card>
                  ) : (
                    postsState.posts
                      .filter((p) => p.isBanned)
                      .map((post) => (
                        <Box key={post._id} sx={{ width: "100%", maxWidth: 600, mb: 2, position: "relative" }}>
                          <Typography
                            sx={{
                              position: "absolute",
                              top: 10,
                              left: 10,
                              color: "red",
                              fontWeight: "bold",
                              background: "rgba(255, 255, 255, 0.7)",
                              p: 1,
                              borderRadius: 2,
                              zIndex: 10,
                            }}
                          >
                            Banned by Admin
                          </Typography>
                          <Post post={post} postedBy={post.postedBy} isAdminView={true} />
                          <Button
                            variant="contained"
                            color="success"
                            onClick={() => handleBanUnbanPost(post._id, true)}
                            sx={{ mt: 1 }}
                          >
                            Unban Post
                          </Button>
                        </Box>
                      ))
                  )}
                </Box>
              )}

              {tabValue === 3 && (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  {fetchingUsers ? (
                    <CircularProgress sx={{ color: "primary.main" }} />
                  ) : users.filter((u) => u.isBanned).length === 0 ? (
                    <Typography color="text.primary">No banned users</Typography>
                  ) : (
                    <Box
                      sx={{
                        width: "100%",
                        maxWidth: 1400,
                        display: "grid",
                        gridTemplateColumns: getGridColumns(),
                        gap: 2,
                        px: isSmallScreen ? 1 : 2,
                      }}
                    >
                      {users
                        .filter((u) => u.isBanned)
                        .map((user) => (
                          <Card
                            key={user._id}
                            sx={{
                              bgcolor: "background.paper",
                              borderRadius: "12px",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              width: "100%",
                              position: "relative",
                            }}
                          >
                            <CardContent
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                p: isSmallScreen ? 1.5 : 2,
                              }}
                            >
                              <Avatar
                                src={user.profilePic}
                                alt={user.username}
                                sx={{
                                  width: isSmallScreen ? 50 : 60,
                                  height: isSmallScreen ? 50 : 60,
                                  mr: isSmallScreen ? 1.5 : 2,
                                }}
                              />
                              <Box sx={{ flex: 1 }}>
                                <Typography
                                  variant={isSmallScreen ? "body2" : "body1"}
                                  sx={{
                                    color: "text.primary",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  onClick={() => navigate(`/${user.username}`)}
                                >
                                  {user.username}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis" }}
                                >
                                  ID: {user._id}
                                </Typography>
                                <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 2 }}>
                                  <Typography
                                    variant="body2"
                                    sx={{ color: "error.main" }}
                                  >
                                    Status: Banned
                                  </Typography>
                                  <Button
                                    variant="contained"
                                    color="success"
                                    onClick={() => handleBanUnbanUser(user._id, true)}
                                    disabled={user.isAdmin}
                                    size={isSmallScreen ? "small" : "medium"}
                                    sx={{ fontSize: isSmallScreen ? "0.75rem" : "0.875rem" }}
                                  >
                                    Unban
                                  </Button>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                    </Box>
                  )}
                </Box>
              )}

              {tabValue === 4 && (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  {user.followers?.length === 0 ? (
                    <Card sx={{ bgcolor: "background.paper", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.2)", width: "100%", maxWidth: 500, mx: "auto" }}>
                      <CardContent sx={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Typography variant="body1" color="text.primary">No followers yet</Typography>
                      </CardContent>
                    </Card>
                  ) : (
                    user.followers.map((followerId) => (
                      <Box key={followerId} sx={{ width: "100%", maxWidth: 500, mb: 1 }}>
                        <FollowerCard followerId={followerId} currentUser={currentUser} navigate={navigate} />
                      </Box>
                    ))
                  )}
                </Box>
              )}

              {tabValue === 5 && (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  {user.following?.length === 0 ? (
                    <Card sx={{ bgcolor: "background.paper", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.2)", width: "100%", maxWidth: 500, mx: "auto" }}>
                      <CardContent sx={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Typography variant="body1" color="text.primary">Not following anyone yet</Typography>
                      </CardContent>
                    </Card>
                  ) : (
                    user.following.map((followingId) => (
                      <Box key={followingId} sx={{ width: "100%", maxWidth: 500, mb: 1 }}>
                        <FollowingCard followingId={followingId} currentUser={currentUser} navigate={navigate} />
                      </Box>
                    ))
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </motion.div>
      </App>
    </ConfigProvider>
  );
};

const FollowerCard = ({ followerId, currentUser, navigate }) => {
  const [follower, setFollower] = useState(null);

  useEffect(() => {
    const fetchFollower = async () => {
      try {
        const res = await fetch(`/api/users/profile/${followerId}`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (res.ok) setFollower(data);
      } catch (error) {
        console.error("Error fetching follower:", error);
      }
    };
    fetchFollower();
  }, [followerId]);

  if (!follower) return null;

  return (
    <Card
      sx={{
        bgcolor: "background.paper",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        width: "100%",
        position: "relative",
      }}
    >
      {follower.isBanned && (
        <Typography
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            color: "red",
            fontWeight: "bold",
            background: "rgba(255, 255, 255, 0.7)",
            p: 0.5,
            borderRadius: 2,
            fontSize: "0.75rem",
          }}
        >
          Banned
        </Typography>
      )}
      <CardContent sx={{ display: "flex", alignItems: "center", p: 1 }}>
        <Avatar src={follower.profilePic} sx={{ width: 44, height: 44, mr: 2 }} />
        <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
          <Typography
            variant="body2"
            sx={{ color: "text.primary", cursor: "pointer", mr: 1 }}
            onClick={() => navigate(`/${follower.username}`)}
          >
            {follower.username}
          </Typography>
          {follower.isVerified && (
            <VerifiedIcon color="primary" fontSize="small" />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const FollowingCard = ({ followingId, currentUser, navigate }) => {
  const [followingUser, setFollowingUser] = useState(null);

  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        const res = await fetch(`/api/users/profile/${followingId}`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (res.ok) setFollowingUser(data);
      } catch (error) {
        console.error("Error fetching following user:", error);
      }
    };
    fetchFollowing();
  }, [followingId]);

  if (!followingUser) return null;

  return (
    <Card
      sx={{
        bgcolor: "background.paper",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        width: "100%",
        position: "relative",
      }}
    >
      {followingUser.isBanned && (
        <Typography
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            color: "red",
            fontWeight: "bold",
            background: "rgba(255, 255, 255, 0.7)",
            p: 0.5,
            borderRadius: 2,
            fontSize: "0.75rem",
          }}
        >
          Banned
        </Typography>
      )}
      <CardContent sx={{ display: "flex", alignItems: "center", p: 1 }}>
        <Avatar src={followingUser.profilePic} sx={{ width: 44, height: 44, mr: 2 }} />
        <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
          <Typography
            variant="body2"
            sx={{ color: "text.primary", cursor: "pointer", mr: 1 }}
            onClick={() => navigate(`/${followingUser.username}`)}
          >
            {followingUser.username}
          </Typography>
          {followingUser.isVerified && (
            <VerifiedIcon color="primary" fontSize="small" />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default AdminProfilePage;