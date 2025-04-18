import { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import {
  Box,
  Typography,
  useMediaQuery,
  CircularProgress,
} from "@mui/material";
import { motion } from "framer-motion";
import useShowToast from "../hooks/useShowToast";
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
  ScatterChart,
  Scatter,
  ResponsiveContainer,
} from "recharts";
import ReactHeatmap from "react-heatmap-grid";

const COLORS = ["#1976D2", "#4CAF50", "#D32F2F"]; // primary.main, success.main, error.main

const AdminDashboard = () => {
  const currentUser = useRecoilValue(userAtom);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const showToast = useShowToast();
  const isSmallScreen = useMediaQuery("(max-width: 600px)");
  const isMediumScreen = useMediaQuery("(max-width: 960px)");

  useEffect(() => {
    if (!currentUser?.isAdmin) return;

    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/stats/admin", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          credentials: "include",
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setAnalytics(data);
      } catch (error) {
        showToast("Error", error.message, "error");
      } finally {
        setLoadingAnalytics(false);
      }
    };

    fetchAnalytics();
  }, [currentUser, showToast]);

  if (!currentUser?.isAdmin) {
    return (
      <Box sx={{ p: 3, textAlign: "center", m: 4 }}>
        <Typography variant="h6" color="text.primary">
          Admin access required
        </Typography>
      </Box>
    );
  }

  // Existing data for Pie, Bar, and Line Charts
  const pieData = analytics
    ? [
        { name: "Likes", value: analytics.totalLikes || 0 },
        { name: "Posts", value: analytics.totalPosts || 0 },
        { name: "Comments", value: analytics.totalComments || 0 },
      ]
    : [];
  const barData = analytics?.activityData || [];
  const lineData = analytics?.activityData || [];

  // Mock data for Scatter Plot (posts vs. likes per user)
  const scatterData = analytics
    ? (analytics.userActivity || []).map((user, index) => ({
        userId: index,
        posts: user.posts || Math.floor(Math.random() * 50),
        likes: user.likes || Math.floor(Math.random() * 200),
      }))
    : [];

  // Mock data for Heatmap (activity by day/hour)
  const heatmapData = analytics
    ? Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => Math.floor(Math.random() * 100)))
    : Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => Math.floor(Math.random() * 100)));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Box sx={{ m: 2, minHeight: "100vh", width: "100%", overflowX: "hidden" }}>
        <Typography
          variant="h4"
          sx={{
            mb: 3,
            color: "text.primary",
            fontWeight: 600,
            p: isSmallScreen ? 1 : 2,
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
        >
          Admin Dashboard
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            width: "90%",
            maxWidth: 1200,
            mx: "auto",
            overflowX: "hidden",
          }}
        >
          {loadingAnalytics ? (
            <CircularProgress sx={{ color: "primary.main", p: isSmallScreen ? 1 : 2, m: "auto" }} />
          ) : (
            <>
              {/* Pie Chart: Platform Engagement */}
              <Box
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  width: "100%",
                  p: isSmallScreen ? 1.5 : 2,
                  boxSizing: "border-box",
                  maxWidth: isSmallScreen ? "100%" : isMediumScreen ? "90%" : "80%",
                  height: isSmallScreen ? 250 : isMediumScreen ? 300 : 350,
                  m: 1,
                }}
              >
                <Typography
                  variant={isSmallScreen ? "body2" : "h6"}
                  sx={{ mb: 2, color: "text.primary", fontWeight: 600, p: isSmallScreen ? 1 : 2 }}
                >
                  Platform Engagement
                </Typography>
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={isSmallScreen ? 60 : 100} label>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>

              {/* Bar Chart: Activity Breakdown */}
              <Box
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  width: "100%",
                  p: isSmallScreen ? 1.5 : 2,
                  boxSizing: "border-box",
                  maxWidth: isSmallScreen ? "100%" : isMediumScreen ? "90%" : "80%",
                  height: isSmallScreen ? 250 : isMediumScreen ? 300 : 350,
                  m: 1,
                }}
              >
                <Typography
                  variant={isSmallScreen ? "body2" : "h6"}
                  sx={{ mb: 2, color: "text.primary", fontWeight: 600, p: isSmallScreen ? 1 : 2 }}
                >
                  Activity Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height="80%">
                  <BarChart data={barData}>
                    <XAxis dataKey="month" stroke="text.primary" />
                    <YAxis stroke="text.primary" />
                    <Tooltip />
                    <Bar dataKey="likes" fill={COLORS[0]} />
                    <Bar dataKey="posts" fill={COLORS[1]} />
                    <Bar dataKey="comments" fill={COLORS[2]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              {/* Line Chart: Activity Trend */}
              <Box
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  width: "100%",
                  p: isSmallScreen ? 1.5 : 2,
                  boxSizing: "border-box",
                  maxWidth: isSmallScreen ? "100%" : isMediumScreen ? "90%" : "80%",
                  height: isSmallScreen ? 250 : isMediumScreen ? 300 : 350,
                  m: 1,
                }}
              >
                <Typography
                  variant={isSmallScreen ? "body2" : "h6"}
                  sx={{ mb: 2, color: "text.primary", fontWeight: 600, p: isSmallScreen ? 1 : 2 }}
                >
                  Activity Trend
                </Typography>
                <ResponsiveContainer width="100%" height="80%">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" stroke="text.primary" />
                    <YAxis stroke="text.primary" />
                    <Tooltip />
                    <Line type="monotone" dataKey="likes" stroke={COLORS[0]} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="posts" stroke={COLORS[1]} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="comments" stroke={COLORS[2]} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>

              {/* Scatter Plot: User Engagement */}
              <Box
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  width: "100%",
                  p: isSmallScreen ? 1.5 : 2,
                  boxSizing: "border-box",
                  maxWidth: isSmallScreen ? "100%" : isMediumScreen ? "90%" : "80%",
                  height: isSmallScreen ? 250 : isMediumScreen ? 300 : 350,
                  m: 1,
                }}
              >
                <Typography
                  variant={isSmallScreen ? "body2" : "h6"}
                  sx={{ mb: 2, color: "text.primary", fontWeight: 600, p: isSmallScreen ? 1 : 2 }}
                >
                  User Engagement (Posts vs. Likes)
                </Typography>
                <ResponsiveContainer width="100%" height="80%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="posts" name="Posts" stroke="text.primary" />
                    <YAxis dataKey="likes" name="Likes" stroke="text.primary" />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Scatter name="Users" data={scatterData} fill={COLORS[0]} />
                  </ScatterChart>
                </ResponsiveContainer>
              </Box>

              {/* Heatmap: Activity Heatmap */}
              <Box
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  width: "100%",
                  p: isSmallScreen ? 1.5 : 2,
                  boxSizing: "border-box",
                  maxWidth: isSmallScreen ? "100%" : isMediumScreen ? "90%" : "80%",
                  height: isSmallScreen ? 250 : isMediumScreen ? 300 : 350,
                  m: 1,
                }}
              >
                <Typography
                  variant={isSmallScreen ? "body2" : "h6"}
                  sx={{ mb: 2, color: "text.primary", fontWeight: 600, p: isSmallScreen ? 1 : 2 }}
                >
                  Activity Heatmap (Day vs. Hour)
                </Typography>
                <Box sx={{ width: "100%", height: "80%" }}>
                  <ReactHeatmap
                    xLabels={Array.from({ length: 24 }, (_, i) => i.toString())}
                    yLabels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]}
                    data={heatmapData}
                    cellStyle={(value) => ({
                      background: value > 80 ? COLORS[0] : value > 60 ? COLORS[1] : value > 40 ? "#ffeb3b" : "#e0f7fa",
                      fontSize: isSmallScreen ? "0.6rem" : "0.8rem",
                      border: "1px solid #ccc",
                    })}
                    cellRender={(value) => value && <div>{value}</div>}
                    onClick={(x, y) => alert(`Clicked ${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][y]} ${x}`)}
                  />
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </motion.div>
  );
};

export default AdminDashboard;