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
} from "@mui/material";
import { ConfigProvider, App, message } from "antd";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";
import { useSocket } from "../context/SocketContext";
import useBookmark from "../hooks/useBookmark";
import useFollowUnfollow from "../hooks/useFollowUnfollow";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";
import Post from "../components/Post";
import AdminProfilePage from "./AdminProfilePage";

const COLORS = ["#009688", "#4CAF50", "#FF9800"];

const UserPage = () => {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingPosts, setFetchingPosts] = useState(true);
  const [fetchingBookmarks, setFetchingBookmarks] = useState(true);
  const [postsState, setPostsState] = useRecoilState(postsAtom);
  const currentUser = useRecoilValue(userAtom);
  const setCurrentUser = useSetRecoilState(userAtom);
  const navigate = useNavigate();
  const isSmallScreen = useMediaQuery("(max-width: 600px)");
  const [tabValue, setTabValue] = useState(0);
  const { handleBookmark } = useBookmark();
  const { handleFollowUnfollow, updating, following } = useFollowUnfollow(user);
  const socketContext = useSocket();
  const socket = socketContext?.socket;

  // Redirect admin to AdminProfilePage if viewing their own profile
  if (currentUser?.isAdmin && currentUser?.username === username) {
    return <AdminProfilePage />;
  }

  useEffect(() => {
    if (!socket) {
      console.warn("Socket is not initialized in UserPage");
    } else {
      socket.on("newPost", (post) => {
        if (post.postedBy._id === user?._id || currentUser.following.includes(post.postedBy._id)) {
          setPostsState((prev) => ({
            ...prev,
            posts: [post, ...prev.posts],
          }));
        }
      });

      socket.on("postDeleted", ({ postId, userId }) => {
        if (userId === user?._id) {
          setPostsState((prev) => ({
            ...prev,
            posts: prev.posts.filter((p) => p._id !== postId),
            bookmarks: prev.bookmarks.filter((p) => p._id !== postId),
          }));
        }
      });

      return () => {
        socket.off("newPost");
        socket.off("postDeleted");
      };
    }
  }, [socket, user, currentUser, setPostsState]);

  useEffect(() => {
    const getUserAndStats = async () => {
      try {
        let userData;
        if (currentUser && currentUser.username === username) {
          userData = currentUser;
        } else {
          const userRes = await fetch(`/api/users/profile/${username}`, {
            credentials: "include",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          if (!userRes.ok) throw new Error("User profile not found");
          userData = await userRes.json();
        }

        let statsData = {};
        try {
          const statsRes = await fetch(`/api/users/stats/${username}`, {
            credentials: "include",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          statsData = statsRes.ok ? await statsRes.json() : { totalLikes: 0, totalPosts: 0, totalComments: 0, activityData: [] };
        } catch (statsError) {
          console.warn("Stats endpoint not available:", statsError.message);
          statsData = { totalLikes: 0, totalPosts: 0, totalComments: 0, activityData: [] };
        }

        setUser({ ...userData, stats: statsData });
      } catch (error) {
        console.error("Error fetching user and stats:", error.stack);
        message.error(error.message || "Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    const getPosts = async () => {
      try {
        const endpoint = currentUser?.isAdmin ? "/api/posts/all" : `/api/posts/user/${username}`;
        const res = await fetch(endpoint, {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        // Ensure postedBy contains full user data if possible
        const enrichedPosts = data.map(post => ({
          ...post,
          postedBy: post.postedBy._id ? post.postedBy : { _id: post.postedBy, username: user?.username, profilePic: user?.profilePic },
        }));
        setPostsState((prev) => ({ ...prev, posts: enrichedPosts }));
      } catch (error) {
        console.error("Error fetching posts:", error.stack);
        message.error(error.message || "Failed to load posts");
      } finally {
        setFetchingPosts(false);
      }
    };

    const getBookmarks = async () => {
      try {
        const res = await fetch(`/api/posts/bookmarks/${username}`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (res.ok) {
          const enrichedBookmarks = data.map(post => ({
            ...post,
            postedBy: post.postedBy._id ? post.postedBy : { _id: post.postedBy, username: user?.username, profilePic: user?.profilePic },
          }));
          setPostsState((prev) => ({ ...prev, bookmarks: enrichedBookmarks || [] }));
        } else {
          throw new Error(data.error || "Failed to fetch bookmarks");
        }
      } catch (error) {
        console.error("Error fetching bookmarks:", error.stack);
        message.error(error.message || "Failed to load bookmarks");
      } finally {
        setFetchingBookmarks(false);
      }
    };

    getUserAndStats();
    getPosts();
    getBookmarks();
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

  const pieData = [
    { name: "Likes", value: user.stats?.totalLikes || 0 },
    { name: "Posts", value: user.stats?.totalPosts || 0 },
    { name: "Comments", value: user.stats?.totalComments || 0 },
  ];

  const barData = user.stats?.activityData || [];
  const lineData = user.stats?.activityData || [];
  const areaData = user.stats?.activityData || [];

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
              <Box sx={{ display: "flex", alignItems: "center", flexDirection: isSmallScreen ? "column" : "row", height: "100%", m: 2 }}>
                <Avatar
                  src={user.profilePic || undefined}
                  alt={user.username}
                  sx={{
                    width: isSmallScreen ? 77 : 150,
                    height: isSmallScreen ? 77 : 150,
                    border: "2px solid #fff",
                    mb: isSmallScreen ? 2 : 0,
                    mr: !isSmallScreen ? 3 : 0,
                  }}
                />
                <Box sx={{ flex: 1, textAlign: isSmallScreen ? "center" : "left", overflow: "hidden" }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1, justifyContent: isSmallScreen ? "center" : "flex-start" }}>
                    <Typography variant="h6" sx={{ fontWeight: 400, mr: 2, color: "text.primary" }}>{user.username}</Typography>
                    {currentUser?._id === user._id ? (
                      <>
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
                      </>
                    ) : (
                      <Button
                        variant={following ? "outlined" : "contained"}
                        size="small"
                        onClick={handleFollowUnfollow}
                        disabled={updating}
                        sx={{
                          borderRadius: 20,
                          textTransform: "none",
                          bgcolor: following ? "transparent" : "primary.main",
                          color: "text.primary",
                          borderColor: following ? "primary.main" : "transparent",
                          "&:hover": { bgcolor: following ? "rgba(255, 255, 255, 0.1)" : "primary.dark" },
                        }}
                      >
                        {following ? "Unfollow" : "Follow"}
                      </Button>
                    )}
                  </Box>
                  <Box sx={{ display: "flex", gap: isSmallScreen ? 2 : 4, mb: 2, justifyContent: isSmallScreen ? "center" : "flex-start" }}>
                    <Card sx={{ p: 1, minWidth: 80, textAlign: "center", bgcolor: "transparent", border: "none" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>{postsState.posts.length}</Typography>
                      <Typography variant="caption" color="text.secondary">Posts</Typography>
                    </Card>
                    <Card sx={{ p: 1, minWidth: 80, textAlign: "center", bgcolor: "transparent", border: "none" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>{user.followers?.length || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Followers</Typography>
                    </Card>
                    <Card sx={{ p: 1, minWidth: 80, textAlign: "center", bgcolor: "transparent", border: "none" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>{user.following?.length || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Following</Typography>
                    </Card>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>{user.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.bio}</Typography>
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
                borderRadius: "12px",
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
                <Tab label="Posts" sx={{ textTransform: "none", fontWeight: 600, color: "text.primary" }} />
                <Tab label="Bookmarked Posts" sx={{ textTransform: "none", fontWeight: 600, color: "text.primary" }} />
                <Tab label="Followers" sx={{ textTransform: "none", fontWeight: 600, color: "text.primary" }} />
                <Tab label="Following" sx={{ textTransform: "none", fontWeight: 600, color: "text.primary" }} />
                {currentUser?._id === user._id && (
                  <Tab label="Dashboard" sx={{ textTransform: "none", fontWeight: 600, color: "text.primary" }} />
                )}
              </Tabs>
            </Box>

            <Box sx={{ mt: 2, overflowY: "auto", flex: 1 }}>
              {tabValue === 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  {fetchingPosts ? (
                    <Card sx={{ bgcolor: "background.paper", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.2)", width: "100%", maxWidth: 600, mx: "auto" }}>
                      <CardContent sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                        <CircularProgress size={24} sx={{ color: "primary.main" }} />
                      </CardContent>
                    </Card>
                  ) : postsState.posts.length === 0 ? (
                    <Card sx={{ bgcolor: "background.paper", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.2)", width: "100%", maxWidth: 600, mx: "auto" }}>
                      <CardContent sx={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", height: "auto" }}>
                        <Typography variant="body1" color="text.primary">No posts yet</Typography>
                      </CardContent>
                    </Card>
                  ) : (
                    postsState.posts.map((post, index) => (
                      <Box key={post._id} sx={{ width: "100%", maxWidth: 600, pt: 2 }}>
                        <Post
                          post={post}
                          postedBy={post.postedBy}
                          isAdminView={currentUser?.isAdmin}
                          onBookmark={handleBookmark}
                        />
                      </Box>
                    ))
                  )}
                </Box>
              )}

              {tabValue === 1 && (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  {fetchingBookmarks ? (
                    <Card sx={{ bgcolor: "background.paper", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.2)", width: "100%", maxWidth: 500, mx: "auto" }}>
                      <CardContent sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                        <CircularProgress size={24} sx={{ color: "primary.main" }} />
                      </CardContent>
                    </Card>
                  ) : (postsState.bookmarks || []).length === 0 ? (
                    <Card sx={{ bgcolor: "background.paper", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.2)", width: "100%", maxWidth: 500, mx: "auto" }}>
                      <CardContent sx={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                        <Typography variant="body1" color="text.primary">No bookmarked posts yet</Typography>
                      </CardContent>
                    </Card>
                  ) : (
                    (postsState.bookmarks || []).map((post) => (
                      <Box key={post._id} sx={{ width: "100%", maxWidth: 500, mb: 2 }}>
                        <Post
                          post={post}
                          postedBy={post.postedBy}
                          isAdminView={currentUser?.isAdmin}
                          onBookmark={handleBookmark}
                        />
                      </Box>
                    ))
                  )}
                </Box>
              )}

              {tabValue === 2 && (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 2 }}>
                  {user.followers?.length === 0 ? (
                    <Card sx={{ bgcolor: "background.paper", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.2)", width: "100%", maxWidth: 500, mx: "auto" }}>
                      <CardContent sx={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                        <Typography variant="body1" color="text.primary">No followers yet</Typography>
                      </CardContent>
                    </Card>
                  ) : (
                    user.followers.map((followerId) => (
                      <Box key={followerId} sx={{ width: "100%", maxWidth: 500, mb: 1 }}>
                        <FollowerCard
                          followerId={followerId}
                          currentUser={currentUser}
                          navigate={navigate}
                        />
                      </Box>
                    ))
                  )}
                </Box>
              )}

              {tabValue === 3 && (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 2 }}>
                  {user.following?.length === 0 ? (
                    <Card sx={{ bgcolor: "background.paper", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.2)", width: "100%", maxWidth: 500, mx: "auto" }}>
                      <CardContent sx={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                        <Typography variant="body1" color="text.primary">Not following anyone yet</Typography>
                      </CardContent>
                    </Card>
                  ) : (
                    user.following.map((followingId) => (
                      <Box key={followingId} sx={{ width: "100%", maxWidth: 500, mb: 1 }}>
                        <FollowingCard
                          followingId={followingId}
                          currentUser={currentUser}
                          navigate={navigate}
                        />
                      </Box>
                    ))
                  )}
                </Box>
              )}

              {tabValue === 4 && currentUser?._id === user._id && (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 2, gap: 1 }}>
                  <Card sx={{ bgcolor: "background.paper", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.2)", width: "100%", maxWidth: 500, mx: "auto" }}>
                    <CardContent sx={{ height: "100%" }}>
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: "text.primary" }}>
                        Engagement Distribution
                      </Typography>
                      <Box sx={{ display: "flex", justifyContent: "center", height: "calc(100% - 32px)" }}>
                        <PieChart width={isSmallScreen ? 250 : 350} height={250}>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </Box>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: "background.paper", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.2)", width: "100%", maxWidth: 500, mx: "auto" }}>
                    <CardContent sx={{ height: "100%" }}>
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: "text.primary" }}>
                        Activity Breakdown
                      </Typography>
                      <Box sx={{ display: "flex", justifyContent: "center", height: "calc(100% - 32px)" }}>
                        <BarChart width={isSmallScreen ? 250 : 350} height={250} data={barData}>
                          <XAxis dataKey="month" stroke="text.primary" />
                          <YAxis stroke="text.primary" />
                          <Tooltip />
                          <Bar dataKey="likes" fill="#009688" />
                          <Bar dataKey="posts" fill="#4CAF50" />
                        </BarChart>
                      </Box>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: "background.paper", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.2)", width: "100%", maxWidth: 500, mx: "auto" }}>
                    <CardContent sx={{ height: "100%" }}>
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: "text.primary" }}>
                        Activity Trend
                      </Typography>
                      <Box sx={{ display: "flex", justifyContent: "center", height: "calc(100% - 32px)" }}>
                        <LineChart width={isSmallScreen ? 250 : 350} height={250} data={lineData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" stroke="text.primary" />
                          <YAxis stroke="text.primary" />
                          <Tooltip />
                          <Line type="monotone" dataKey="likes" stroke="#009688" activeDot={{ r: 8 }} />
                          <Line type="monotone" dataKey="posts" stroke="#4CAF50" activeDot={{ r: 8 }} />
                        </LineChart>
                      </Box>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: "background.paper", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.2)", width: "100%", maxWidth: 500, mx: "auto" }}>
                    <CardContent sx={{ height: "100%" }}>
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: "text.primary" }}>
                        Reach Over Time
                      </Typography>
                      <Box sx={{ display: "flex", justifyContent: "center", height: "calc(100% - 32px)" }}>
                        <ResponsiveContainer width="100%" height={250}>
                          <AreaChart data={areaData}>
                            <defs>
                              <linearGradient id="reachColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="month" stroke="text.primary" />
                            <YAxis stroke="text.primary" />
                            <CartesianGrid strokeDasharray="3 3" />
                            <Tooltip />
                            <Area type="monotone" dataKey="reach" stroke="#8884d8" fill="url(#reachColor)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
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
  const { handleFollowUnfollow, updating, following } = useFollowUnfollow(follower);

  useEffect(() => {
    const fetchFollower = async () => {
      try {
        const res = await fetch(`/api/users/profile/${followerId}`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (res.ok) setFollower(data);
        else throw new Error(data.error || "Failed to fetch follower");
      } catch (error) {
        console.error("Error fetching follower:", error.stack);
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
        height: "100%",
      }}
    >
      <CardContent sx={{ display: "flex", alignItems: "center", p: 1, height: "100%" }}>
        <Avatar src={follower.profilePic || undefined} sx={{ width: 44, height: 44, mr: 2 }} />
        <Typography
          variant="body2"
          sx={{ flex: 1, color: "text.primary", cursor: "pointer" }}
          onClick={() => navigate(`/${follower.username}`)}
        >
          {follower.username}
        </Typography>
        {currentUser?._id !== follower._id && (
          <Button
            variant={following ? "outlined" : "contained"}
            size="small"
            onClick={handleFollowUnfollow}
            disabled={updating}
            sx={{
              borderRadius: 20,
              textTransform: "none",
              bgcolor: following ? "transparent" : "primary.main",
              color: "text.primary",
              borderColor: following ? "primary.main" : "transparent",
              "&:hover": { bgcolor: following ? "rgba(255, 255, 255, 0.1)" : "primary.dark" },
            }}
          >
            {following ? "Unfollow" : "Follow"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const FollowingCard = ({ followingId, currentUser, navigate }) => {
  const [followingUser, setFollowingUser] = useState(null);
  const { handleFollowUnfollow, updating, following } = useFollowUnfollow(followingUser);

  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        const res = await fetch(`/api/users/profile/${followingId}`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (res.ok) setFollowingUser(data);
        else throw new Error(data.error || "Failed to fetch following user");
      } catch (error) {
        console.error("Error fetching following user:", error.stack);
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
        height: "100%",
      }}
    >
      <CardContent sx={{ display: "flex", alignItems: "center", p: 1, height: "100%" }}>
        <Avatar src={followingUser.profilePic || undefined} sx={{ width: 44, height: 44, mr: 2 }} />
        <Typography
          variant="body2"
          sx={{ flex: 1, color: "text.primary", cursor: "pointer" }}
          onClick={() => navigate(`/${followingUser.username}`)}
        >
          {followingUser.username}
        </Typography>
        {currentUser?._id !== followingUser._id && (
          <Button
            variant={following ? "outlined" : "contained"}
            size="small"
            onClick={handleFollowUnfollow}
            disabled={updating}
            sx={{
              borderRadius: 20,
              textTransform: "none",
              bgcolor: following ? "transparent" : "primary.main",
              color: "text.primary",
              borderColor: following ? "primary.main" : "transparent",
              "&:hover": { bgcolor: following ? "rgba(255, 255, 255, 0.1)" : "primary.dark" },
            }}
          >
            {following ? "Unfollow" : "Follow"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default UserPage;