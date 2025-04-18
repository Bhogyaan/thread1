import React, { useEffect, useState, useCallback } from "react";
import {
  Avatar,
  Box,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Modal,
  Button,
  TextField,
  Skeleton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  MoreVert,
  Edit,
  Delete,
  Download,
  Favorite,
  FavoriteBorder,
  Reply,
  Verified as VerifiedIcon,
} from "@mui/icons-material";
import { formatDistanceToNow } from "date-fns";
import useShowToast from "../hooks/useShowToast";
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";
import Actions from "./Actions";
import { motion } from "framer-motion";
import {
  BsFileEarmarkTextFill,
  BsFileZipFill,
  BsFileWordFill,
  BsFileExcelFill,
  BsFilePptFill,
  BsFileTextFill,
} from "react-icons/bs";

const Post = ({ post, postedBy, isAdminView = false, onBanUnbanPost }) => {
  const [user, setUser] = useState(null);
  const [allPostsUsers, setAllPostsUsers] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedText, setEditedText] = useState("");
  const showToast = useShowToast();
  const currentUser = useRecoilValue(userAtom);
  const [posts, setPosts] = useRecoilState(postsAtom);
  const navigate = useNavigate();

  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      if (isAdminView && currentUser?.isAdmin) {
        const res = await fetch("/api/users/all", {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.error) {
          showToast("Error", data.error, "error");
          setAllPostsUsers({});
          return;
        }
        // Ensure _id is used as the key for consistency with postedBy
        const usersMap = data.reduce((acc, user) => {
          acc[user._id] = { ...user, username: user.username || "Unknown User", profilePic: user.profilePic || "/default-avatar.png", name: user.name || "Unknown" };
          return acc;
        }, {});
        setAllPostsUsers(usersMap);
        console.log("Fetched users:", usersMap); // Debug log
      } else {
        const query = typeof postedBy === "string" ? postedBy : postedBy?._id || postedBy?.username;
        if (!query) {
          showToast("Error", "Invalid user data for post", "error");
          return;
        }
        const res = await fetch(`/api/users/profile/${query}`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.error) {
          showToast("Error", "User not found", "error");
          return;
        }
        setUser({ ...data, username: data.username || "Unknown User", profilePic: data.profilePic || "/default-avatar.png", name: data.name || "Unknown" });
      }
    } catch (error) {
      showToast("Error", error.message, "error");
      setAllPostsUsers({});
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [postedBy, showToast, isAdminView, currentUser?.isAdmin]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`/api/posts/${post._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }
      showToast("Success", "Post deleted", "success");
      setPosts((prev) => ({
        ...prev,
        posts: (prev.posts || []).filter((p) => p._id !== post._id),
        bookmarks: (prev.bookmarks || []).filter((p) => p._id !== post._id),
        suggestedPosts: (prev.suggestedPosts || []).filter((p) => p._id !== post._id),
      }));
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const handleEditPost = () => navigate(`/edit-post/${post._id}`);
  const handleDownloadPost = () => {
    const content = post.media || post.text;
    const blob = new Blob([content], { type: post.media ? "application/octet-stream" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = post.originalFilename || `post_${post._id}.${post.mediaType || "txt"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMoreClick = (event) => setAnchorEl(event.currentTarget);
  const handleMoreClose = () => setAnchorEl(null);

  const handleAddComment = async () => {
    if (!newComment.trim()) return showToast("Error", "Comment cannot be empty", "error");
    if (replyTo && !replyTo._id) {
      showToast("Error", "Invalid reply target", "error");
      setReplyTo(null);
      return;
    }
    try {
      const endpoint = replyTo
        ? `/api/posts/post/${post._id}/comment/${replyTo._id}/reply`
        : `/api/posts/post/${post._id}/comment`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
        body: JSON.stringify({ text: newComment }),
      });
      const data = await res.json();
      if (data.error) return showToast("Error", data.error, "error");

      setPosts((prev) => ({
        ...prev,
        posts: (prev.posts || []).map((p) =>
          p._id === post._id
            ? {
                ...p,
                comments: replyTo
                  ? p.comments.map((c) =>
                      c._id === replyTo._id
                        ? { ...c, replies: [...(c.replies || []), data] }
                        : c
                    )
                  : [...(p.comments || []), data],
              }
            : p
        ),
        bookmarks: (prev.bookmarks || []).map((p) =>
          p._id === post._id
            ? {
                ...p,
                comments: replyTo
                  ? p.comments.map((c) =>
                      c._id === replyTo._id
                        ? { ...c, replies: [...(c.replies || []), data] }
                        : c
                    )
                  : [...(p.comments || []), data],
              }
            : p
        ),
        suggestedPosts: (prev.suggestedPosts || []).map((p) =>
          p._id === post._id
            ? {
                ...p,
                comments: replyTo
                  ? p.comments.map((c) =>
                      c._id === replyTo._id
                        ? { ...c, replies: [...(c.replies || []), data] }
                        : c
                    )
                  : [...(p.comments || []), data],
              }
            : p
        ),
      }));
      setNewComment("");
      setReplyTo(null);
      showToast("Success", replyTo ? "Reply added" : "Comment added", "success");
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editedText.trim()) return showToast("Error", "Comment text cannot be empty", "error");
    try {
      const res = await fetch(`/api/posts/post/${post._id}/comment/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
        body: JSON.stringify({ text: editedText }),
      });
      const data = await res.json();
      if (data.error) return showToast("Error", data.error, "error");

      setPosts((prev) => ({
        ...prev,
        posts: (prev.posts || []).map((p) =>
          p._id === post._id
            ? {
                ...p,
                comments: p.comments.map((c) =>
                  c._id === commentId ? { ...c, text: editedText } : c
                ),
              }
            : p
        ),
        bookmarks: (prev.bookmarks || []).map((p) =>
          p._id === post._id
            ? {
                ...p,
                comments: p.comments.map((c) =>
                  c._id === commentId ? { ...c, text: editedText } : c
                ),
              }
            : p
        ),
        suggestedPosts: (prev.suggestedPosts || []).map((p) =>
          p._id === post._id
            ? {
                ...p,
                comments: p.comments.map((c) =>
                  c._id === commentId ? { ...c, text: editedText } : c
                ),
              }
            : p
        ),
      }));
      showToast("Success", "Comment updated", "success");
      setEditingCommentId(null);
      setEditedText("");
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const res = await fetch(`/api/posts/post/${post._id}/comment/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) return showToast("Error", data.error, "error");

      setPosts((prev) => ({
        ...prev,
        posts: (prev.posts || []).map((p) =>
          p._id === post._id
            ? { ...p, comments: p.comments.filter((c) => c._id !== commentId) }
            : p
        ),
        bookmarks: (prev.bookmarks || []).map((p) =>
          p._id === post._id
            ? { ...p, comments: p.comments.filter((c) => c._id !== commentId) }
            : p
        ),
        suggestedPosts: (prev.suggestedPosts || []).map((p) =>
          p._id === post._id
            ? { ...p, comments: p.comments.filter((c) => c._id !== commentId) }
            : p
        ),
      }));
      showToast("Success", "Comment deleted successfully", "success");
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const handleLikeComment = async (commentId, isReply = false, parentCommentId) => {
    if (!commentId) return showToast("Error", "Invalid comment ID", "error");
    try {
      const endpoint = isReply
        ? `/api/posts/post/${post._id}/comment/${parentCommentId}/reply/${commentId}/like`
        : `/api/posts/post/${post._id}/comment/${commentId}/like`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) return showToast("Error", data.error, "error");

      setPosts((prev) => ({
        ...prev,
        posts: (prev.posts || []).map((p) =>
          p._id === post._id
            ? {
                ...p,
                comments: isReply
                  ? p.comments.map((c) =>
                      c._id === parentCommentId
                        ? {
                            ...c,
                            replies: c.replies.map((r) =>
                              r._id === commentId ? { ...r, likes: data.likes } : r
                            ),
                          }
                        : c
                    )
                  : p.comments.map((c) =>
                      c._id === commentId ? { ...c, likes: data.likes } : c
                    ),
              }
            : p
        ),
        bookmarks: (prev.bookmarks || []).map((p) =>
          p._id === post._id
            ? {
                ...p,
                comments: isReply
                  ? p.comments.map((c) =>
                      c._id === parentCommentId
                        ? {
                            ...c,
                            replies: c.replies.map((r) =>
                              r._id === commentId ? { ...r, likes: data.likes } : r
                            ),
                          }
                        : c
                    )
                  : p.comments.map((c) =>
                      c._id === commentId ? { ...c, likes: data.likes } : c
                    ),
              }
            : p
        ),
        suggestedPosts: (prev.suggestedPosts || []).map((p) =>
          p._id === post._id
            ? {
                ...p,
                comments: isReply
                  ? p.comments.map((c) =>
                      c._id === parentCommentId
                        ? {
                            ...c,
                            replies: c.replies.map((r) =>
                              r._id === commentId ? { ...r, likes: data.likes } : r
                            ),
                          }
                        : c
                    )
                  : p.comments.map((c) =>
                      c._id === commentId ? { ...c, likes: data.likes } : c
                    ),
              }
            : p
        ),
      }));
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const renderPost = (currentPost, postUser) => {
    if (!postUser) return null;

    const getDocumentIcon = (filename) => {
      const ext = filename?.split(".").pop()?.toLowerCase() || "";
      switch (ext) {
        case "pdf":
          return <BsFileEarmarkTextFill size={24} />;
        case "zip":
          return <BsFileZipFill size={24} />;
        case "doc":
        case "docx":
          return <BsFileWordFill size={24} />;
        case "xls":
        case "xlsx":
          return <BsFileExcelFill size={24} />;
        case "ppt":
        case "pptx":
          return <BsFilePptFill size={24} />;
        case "txt":
        case "rtf":
          return <BsFileTextFill size={24} />;
        default:
          return <BsFileEarmarkTextFill size={24} />;
      }
    };

    const getFileName = () => {
      return currentPost.originalFilename || currentPost.media.split("/").pop() || "Unnamed Document";
    };

    return (
      <Box
        key={currentPost._id}
        mb={isAdminView ? 4 : 2}
        sx={{
          width: { xs: "100%", sm: "90%", md: "600px" },
          maxWidth: "600px",
          minHeight: { xs: "auto", sm: "350px", md: "400px" },
          mx: { xs: 0, sm: "auto" },
          background: "rgba(255, 255, 255, 0.2)",
          backdropFilter: "blur(10px)",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          padding: { xs: 1, sm: 2, md: 2.5 },
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {currentPost.isBanned && (
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
        )}
        {isAdminView && (
          <Typography variant="caption" color="text.primary" mb={1}>
            Post ID: {currentPost._id}
          </Typography>
        )}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{ width: { xs: 32, sm: 40, md: 48 }, height: { xs: 32, sm: 40, md: 48 }, cursor: "pointer" }}
              alt={postUser.name || "User"}
              src={postUser.profilePic || "/default-avatar.png"}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/${postUser.username}`);
              }}
            />
            <Box display="flex" alignItems="center">
              <Typography
                variant="body2"
                fontWeight="bold"
                color="text.primary"
                sx={{ cursor: "pointer" }}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/${postUser.username}`);
                }}
              >
                {postUser.username || "Unknown User"}
              </Typography>
              {postUser.isVerified && (
                <VerifiedIcon
                  color="primary"
                  fontSize="small"
                  sx={{ ml: 1 }}
                />
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.7rem", sm: "0.875rem" }, ml: 1 }}
              >
                {formatDistanceToNow(new Date(currentPost.createdAt))} ago
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleMoreClick} size="small">
            <MoreVert sx={{ color: "text.primary", fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMoreClose}>
            {(currentUser?._id === postUser._id || currentUser?.isAdmin) && [
              <MenuItem key="edit" onClick={handleEditPost}>
                <Edit sx={{ mr: 1 }} /> Edit
              </MenuItem>,
              <MenuItem key="delete" onClick={handleDeletePost}>
                <Delete sx={{ mr: 1 }} /> Delete
              </MenuItem>,
            ]}
            <MenuItem onClick={handleDownloadPost}>
              <Download sx={{ mr: 1 }} /> Download
            </MenuItem>
            {currentUser?.isAdmin && (
              <MenuItem
                key="ban-unban"
                onClick={() => {
                  handleMoreClose();
                  onBanUnbanPost?.(currentPost._id, currentPost.isBanned);
                }}
              >
                {currentPost.isBanned ? (
                  <>
                    <Edit sx={{ mr: 1 }} /> Unban
                  </>
                ) : (
                  <>
                    <Delete sx={{ mr: 1 }} /> Ban
                  </>
                )}
              </MenuItem>
            )}
          </Menu>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 2, flex: 1 }}>
          <Typography
            variant="body2"
            color="text.primary"
            sx={{ fontSize: { xs: "0.875rem", sm: "1rem" }, wordBreak: "break-word" }}
          >
            {currentPost.text}
          </Typography>

          {currentPost.media && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                mt: 2,
                width: "100%",
                height: {
                  xs: currentPost.mediaType === "audio" || currentPost.mediaType === "document" ? "auto" : "180px",
                  sm: currentPost.mediaType === "audio" || currentPost.mediaType === "document" ? "auto" : "250px",
                  md: currentPost.mediaType === "audio" || currentPost.mediaType === "document" ? "auto" : "300px",
                },
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              {currentPost.mediaType === "image" && (
                <>
                  <img
                    src={currentPost.media}
                    alt="Post"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {currentPost.isEdited && (
                    <Typography
                      sx={{
                        position: "absolute",
                        bottom: 10,
                        right: 10,
                        bgcolor: "rgba(0, 0, 0, 0.6)",
                        color: "white",
                        p: "2px 8px",
                        borderRadius: 2,
                        fontSize: { xs: "0.65rem", sm: "0.75rem" },
                      }}
                    >
                      Edited
                    </Typography>
                  )}
                </>
              )}
              {currentPost.mediaType === "video" && (
                <video
                  src={currentPost.media}
                  controls
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
              {currentPost.mediaType === "audio" && (
                <Box sx={{ width: "100%", px: { xs: 1, sm: 2 }, py: 1, display: "flex", justifyContent: "center" }}>
                  <audio
                    src={currentPost.media}
                    controls
                    style={{ width: "100%", maxWidth: "400px" }}
                  />
                </Box>
              )}
              {currentPost.mediaType === "document" && (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2, width: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getDocumentIcon(getFileName())}
                    <Typography
                      color="text.primary"
                      sx={{ fontSize: { xs: "0.875rem", sm: "1rem" }, wordBreak: "break-word", textAlign: "center" }}
                    >
                      {getFileName()}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ mt: "auto", width: "100%", display: "flex", justifyContent: "center" }}>
          <Actions post={currentPost} onCommentClick={() => setCommentModalOpen(true)} />
        </Box>

        <Modal
          open={commentModalOpen}
          onClose={() => setCommentModalOpen(false)}
          sx={{ display: "flex", alignItems: { xs: "flex-end", sm: "center" }, justifyContent: "center", px: { xs: 0, sm: 1 } }}
        >
          <Box
            sx={{
              width: { xs: "100%", sm: "90%", md: "600px" },
              maxWidth: "800px",
              maxHeight: { xs: "70vh", sm: "80vh" },
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(10px)",
              borderTopLeftRadius: { xs: 16, sm: 8 },
              borderTopRightRadius: { xs: 16, sm: 8 },
              borderBottomLeftRadius: { xs: 0, sm: 8 },
              borderBottomRightRadius: { xs: 0, sm: 8 },
              border: "1px solid rgba(255, 255, 255, 0.2)",
              p: { xs: 1.5, sm: 2, md: 3 },
              overflowY: "auto",
              boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" color="text.primary" sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
                Comments
              </Typography>
              <Button onClick={() => setCommentModalOpen(false)} sx={{ color: "text.primary", fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                Close
              </Button>
            </Box>

            {currentUser && (
              <Box display="flex" gap={{ xs: 1, sm: 2 }} mb={2} flexDirection={{ xs: "column", sm: "row" }}>
                <Avatar src={currentUser.profilePic} alt={currentUser.username} sx={{ width: { xs: 24, sm: 32 }, height: { xs: 24, sm: 32 } }} />
                <Box flex={1}>
                  {replyTo && <Typography variant="caption" color="text.primary" mb={1}>Replying to {replyTo.username}</Typography>}
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder={replyTo ? "Add a reply..." : "Add a comment..."}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    sx={{
                      bgcolor: "rgba(255, 255, 255, 0.3)",
                      backdropFilter: "blur(5px)",
                      input: { color: "text.primary" },
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: "rgba(255, 255, 255, 0.3)" },
                        "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.5)" },
                        "&.Mui-focused fieldset": { borderColor: "primary.main" },
                      },
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    }}
                  />
                </Box>
                <Button
                  onClick={handleAddComment}
                  sx={{
                    color: "primary.main",
                    bgcolor: "rgba(255, 255, 255, 0.3)",
                    backdropFilter: "blur(5px)",
                    "&:hover": { bgcolor: "rgba(255, 255, 255, 0.5)" },
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    px: { xs: 1, sm: 2 },
                  }}
                >
                  Post
                </Button>
              </Box>
            )}

            {(currentPost.comments || []).length > 0 ? (
              currentPost.comments.map((comment) => (
                <Box
                  key={comment._id}
                  display="flex"
                  gap={{ xs: 1, sm: 2 }}
                  mb={2}
                  sx={{
                    background: "rgba(255, 255, 255, 0.3)",
                    backdropFilter: "blur(5px)",
                    borderRadius: "8px",
                    p: { xs: 1, sm: 1.5 },
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                >
                  <Avatar src={comment.userProfilePic} alt={comment.username} sx={{ width: { xs: 24, sm: 32 }, height: { xs: 24, sm: 32 } }} />
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight="bold" color="text.primary" sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                      {comment.username}
                    </Typography>
                    {editingCommentId === comment._id ? (
                      <Box display="flex" gap={1} mt={1}>
                        <TextField
                          fullWidth
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          variant="outlined"
                          size="small"
                          sx={{
                            bgcolor: "rgba(255, 255, 255, 0.3)",
                            backdropFilter: "blur(5px)",
                            input: { color: "text.primary" },
                            "& .MuiOutlinedInput-root": {
                              "& fieldset": { borderColor: "rgba(255, 255, 255, 0.3)" },
                              "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.5)" },
                              "&.Mui-focused fieldset": { borderColor: "primary.main" },
                            },
                          }}
                        />
                        <Button size="small" onClick={() => handleEditComment(comment._id)} sx={{ color: "primary.main" }}>
                          Save
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.primary" sx={{ fontSize: { xs: "0.875rem", sm: "1rem" }, wordBreak: "break-word" }}>
                        {comment.text}
                      </Typography>
                    )}
                    <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                      <IconButton
                        size="small"
                        onClick={() => handleLikeComment(comment._id)}
                        sx={{ color: comment.likes?.includes(currentUser?._id) ? "#ED4956" : "text.primary" }}
                      >
                        {comment.likes?.includes(currentUser?._id) ? <Favorite /> : <FavoriteBorder />}
                        <Typography variant="caption" ml={0.5} color="text.primary" sx={{ fontSize: { xs: "0.7rem", sm: "0.875rem" } }}>
                          {comment.likes?.length || 0}
                        </Typography>
                      </IconButton>
                      <Button
                        size="small"
                        onClick={() => setReplyTo(comment)}
                        sx={{ color: "text.primary", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                        startIcon={<Reply />}
                      >
                        Reply
                      </Button>
                      {(comment.userId === currentUser?._id || currentPost.postedBy === currentUser?._id || currentUser?.isAdmin) && (
                        <>
                          <Button
                            size="small"
                            onClick={() => {
                              setEditingCommentId(comment._id);
                              setEditedText(comment.text);
                            }}
                            sx={{ color: "text.primary", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            onClick={() => handleDeleteComment(comment._id)}
                            sx={{ color: "text.primary", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </Box>
                    {(comment.replies || []).map((reply) => (
                      <Box
                        key={reply._id}
                        display="flex"
                        gap={{ xs: 1, sm: 2 }}
                        mt={1}
                        ml={4}
                        sx={{ background: "rgba(255, 255, 255, 0.4)", backdropFilter: "blur(5px)", borderRadius: "8px", p: { xs: 1, sm: 1.5 } }}
                      >
                        <Avatar src={reply.userProfilePic} alt={reply.username} sx={{ width: { xs: 20, sm: 28 }, height: { xs: 20, sm: 28 } }} />
                        <Box flex={1}>
                          <Typography variant="body2" fontWeight="bold" color="text.primary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                            {reply.username}
                          </Typography>
                          <Typography variant="body2" color="text.primary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, wordBreak: "break-word" }}>
                            {reply.text}
                          </Typography>
                          <Box display="flex" gap={1} mt={1}>
                            <IconButton
                              size="small"
                              onClick={() => handleLikeComment(reply._id, true, comment._id)}
                              sx={{ color: reply.likes?.includes(currentUser?._id) ? "#ED4956" : "text.primary" }}
                            >
                              {reply.likes?.includes(currentUser?._id) ? <Favorite /> : <FavoriteBorder />}
                              <Typography variant="caption" ml={0.5} color="text.primary" sx={{ fontSize: { xs: "0.7rem", sm: "0.875rem" } }}>
                                {reply.likes?.length || 0}
                              </Typography>
                            </IconButton>
                            {(reply.userId === currentUser?._id || currentPost.postedBy === currentUser?._id || currentUser?.isAdmin) && (
                              <>
                                <Button
                                  size="small"
                                  onClick={() => {
                                    setEditingCommentId(reply._id);
                                    setEditedText(reply.text);
                                  }}
                                  sx={{ color: "text.primary", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="small"
                                  onClick={() => handleDeleteComment(reply._id)}
                                  sx={{ color: "text.primary", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))
            ) : (
              <Typography color="text.primary" textAlign="center" sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                No comments yet.
              </Typography>
            )}
          </Box>
        </Modal>
      </Box>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {isLoading ? (
        <Box sx={{ width: { xs: "100%", sm: "90%", md: "600px" }, maxWidth: "600px", mx: { xs: 0, sm: "auto" }, p: { xs: 1, sm: 2 } }}>
          <Box display="flex" gap={2}>
            <Skeleton variant="circular" width={32} height={32} />
            <Box flex={1}>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="60%" />
            </Box>
          </Box>
          <Skeleton variant="rectangular" height={180} sx={{ mt: 2, borderRadius: "8px" }} />
          <Box display="flex" justifyContent="center" mt={2}>
            <Skeleton variant="text" width="50%" />
          </Box>
        </Box>
      ) : isAdminView && currentUser?.isAdmin ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", px: { xs: 1, sm: 2 }, py: 2 }}>
          {posts.posts.length > 0 ? (
            posts.posts.map((adminPost) => {
              const postUser = allPostsUsers[adminPost.postedBy] || { 
                username: "Unknown User", 
                profilePic: "/default-avatar.png", 
                name: "Unknown", 
                isVerified: false 
              };
              return renderPost(adminPost, postUser);
            })
          ) : (
            <Typography color="text.secondary">No posts available</Typography>
          )}
        </Box>
      ) : user ? (
        renderPost(post, user)
      ) : null}
    </motion.div>
  );
};

export default Post;