import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecoilState, useRecoilValue } from "recoil";
import { motion } from "framer-motion";
import {
  Avatar,
  Box,
  Button,
  Typography,
  Divider,
  Menu,
  MenuItem,
  IconButton,
  TextField,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  MoreVert,
  Download,
  Verified as VerifiedIcon,
} from "@mui/icons-material";
import { message } from "antd";
import { debounce } from "lodash";
import Actions from "../components/Actions";
import useGetUserProfile from "../hooks/useGetUserProfile";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";
import { useSocket } from "../contexts/SocketContext";
import CommentItem from "../components/CommentItem";
import useShowToast from "../hooks/useShowToast";
import {
  BsFileEarmarkTextFill,
  BsFileZipFill,
  BsFileWordFill,
  BsFileExcelFill,
  BsFilePptFill,
  BsFileTextFill,
} from "react-icons/bs";
import { formatDistanceToNow } from "date-fns";

const PostPage = () => {
  const { user, loading } = useGetUserProfile();
  const [posts, setPosts] = useRecoilState(postsAtom);
  const { pid } = useParams();
  const currentUser = useRecoilValue(userAtom);
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [dialogComment, setDialogComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [openCommentDialog, setOpenCommentDialog] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState(null);
  const commentInputRef = useRef(null);
  const dialogCommentInputRef = useRef(null);
  const { socket } = useSocket();
  const showToast = useShowToast();
  const [postUser, setPostUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const currentPost = posts.posts?.find((p) => p._id === pid);

  const debouncedSetNewComment = debounce((value) => {
    setNewComment(value);
  }, 100);

  const debouncedSetDialogComment = debounce((value) => {
    setDialogComment(value);
  }, 100);

  // Fetch user data for the post
  const fetchPostUser = useCallback(async () => {
    if (!currentPost?.postedBy) return;
    try {
      setIsLoadingUser(true);
      const query = typeof currentPost.postedBy === "string" ? currentPost.postedBy : currentPost.postedBy?._id;
      const res = await fetch(`/api/users/profile/${query}`, {
        credentials: "include",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", "User not found", "error");
        return;
      }
      setPostUser({
        ...data,
        username: data.username || "unknown",
        name: data.name || "Unknown User",
        profilePic: data.profilePic || "/default-avatar.png",
        isVerified: data.isVerified || false,
      });
    } catch (error) {
      showToast("Error", error.message, "error");
      setPostUser({
        username: "unknown",
        name: "Unknown User",
        profilePic: "/default-avatar.png",
        isVerified: false,
      });
    } finally {
      setIsLoadingUser(false);
    }
  }, [currentPost, showToast]);

  // Fetch post data
  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/posts/${pid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }
      setPosts((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => (p._id === pid ? data : p)),
      }));
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  useEffect(() => {
    if (currentUser?.isAdmin && currentPost) {
      fetchPostUser();
    }
    if (!currentPost) {
      fetchPost();
    }
  }, [currentPost, currentUser, fetchPostUser]);

  useEffect(() => {
    if (!socket || !pid) return;

    socket.emit("joinPostRoom", pid);

    const handleNewComment = ({ postId, comment, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? { ...p, ...post } : p)),
        }));
      }
    };

    const handleNewReply = ({ postId, commentId, reply, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? { ...p, ...post } : p)),
        }));
        setActiveReplyId(null);
      }
    };

    const handleLikeUnlikePost = ({ postId, userId, likes, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? { ...p, ...post } : p)),
        }));
      }
    };

    const handleLikeUnlikeComment = ({ postId, commentId, userId, likes, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? { ...p, ...post } : p)),
        }));
      }
    };

    const handleLikeUnlikeReply = ({ postId, commentId, replyId, userId, likes, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? { ...p, ...post } : p)),
        }));
      }
    };

    const handleEditComment = ({ postId, commentId, text, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? { ...p, ...post } : p)),
        }));
      }
    };

    const handleEditReply = ({ postId, commentId, replyId, text, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? { ...p, ...post } : p)),
        }));
      }
    };

    const handleDeleteComment = ({ postId, commentId, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? { ...p, ...post } : p)),
        }));
      }
    };

    const handleDeleteReply = ({ postId, commentId, replyId, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? { ...p, ...post } : p)),
        }));
      }
    };

    const handlePostDeleted = ({ postId }) => {
      if (postId === pid) {
        message.info("This post has been deleted");
        navigate(`/${user?.username || ""}`);
      }
    };

    const handlePostBanned = ({ postId, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? { ...p, ...post } : p)),
        }));
      }
    };

    const handlePostUnbanned = ({ postId, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? { ...p, ...post } : p)),
        }));
      }
    };

    socket.on("newComment", handleNewComment);
    socket.on("newReply", handleNewReply);
    socket.on("likeUnlikePost", handleLikeUnlikePost);
    socket.on("likeUnlikeComment", handleLikeUnlikeComment);
    socket.on("likeUnlikeReply", handleLikeUnlikeReply);
    socket.on("editComment", handleEditComment);
    socket.on("editReply", handleEditReply);
    socket.on("deleteComment", handleDeleteComment);
    socket.on("deleteReply", handleDeleteReply);
    socket.on("postDeleted", handlePostDeleted);
    socket.on("postBanned", handlePostBanned);
    socket.on("postUnbanned", handlePostUnbanned);

    return () => {
      socket.emit("leavePostRoom", pid);
      socket.off("newComment", handleNewComment);
      socket.off("newReply", handleNewReply);
      socket.off("likeUnlikePost", handleLikeUnlikePost);
      socket.off("likeUnlikeComment", handleLikeUnlikeComment);
      socket.off("likeUnlikeReply", handleLikeUnlikeReply);
      socket.off("editComment", handleEditComment);
      socket.off("editReply", handleEditReply);
      socket.off("deleteComment", handleDeleteComment);
      socket.off("deleteReply", handleDeleteReply);
      socket.off("postDeleted", handlePostDeleted);
      socket.off("postBanned", handlePostBanned);
      socket.off("postUnbanned", handlePostUnbanned);
    };
  }, [socket, pid, setPosts, navigate, user]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/posts/${pid}/comments?page=1&limit=20`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      setPosts((prev) => ({
        ...prev,
        posts: prev.posts.map((p) =>
          p._id === pid ? { ...p, comments: data.comments, commentCount: data.totalComments } : p
        ),
      }));
    } catch (error) {
      message.error(error.message);
    }
  };

  useEffect(() => {
    if (!currentPost && !currentUser?.isAdmin) {
      fetchComments();
    }
  }, [pid, setPosts, currentPost, currentUser]);

  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`/api/posts/${currentPost._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      message.success("Post deleted");
      if (socket) {
        socket.emit("postDeleted", { postId: currentPost._id, userId: currentUser._id });
      }
      navigate(`/${user?.username || ""}`);
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleEditPost = () => navigate(`/edit-post/${currentPost._id}`);

  const handleDownloadPost = () => {
    const content = currentPost.media || currentPost.text;
    const blob = new Blob([content], {
      type: currentPost.media ? "application/octet-stream" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = currentPost.originalFilename || `post_${currentPost._id}.${currentPost.mediaType || "txt"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBanUnbanPost = async (postId, isBanned) => {
    try {
      const res = await fetch(`/api/admin/posts/${postId}/${isBanned ? "unban" : "ban"}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) {
        showToast("Error", data.error, "error");
        return;
      }
      showToast("Success", isBanned ? "Post unbanned" : "Post banned", "success");
      fetchPost();
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const handleMoreClick = (event) => setAnchorEl(event.currentTarget);
  const handleMoreClose = () => setAnchorEl(null);

  const handleAddComment = async () => {
    const commentText = openCommentDialog ? dialogComment : newComment;
    if (!commentText.trim()) {
      message.error("Comment cannot be empty");
      return;
    }
    if (activeReplyId) {
      message.error("Please complete or cancel the reply before posting a comment");
      return;
    }
    setIsCommenting(true);
    try {
      const res = await fetch(`/api/posts/${currentPost._id}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ text: commentText }),
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      setNewComment("");
      setDialogComment("");
      setOpenCommentDialog(false);
      message.success("Comment added");
      fetchComments();
    } catch (error) {
      message.error(error.message);
    } finally {
      setIsCommenting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !activeReplyId) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleReply = async (replyData) => {
    try {
      const res = await fetch(`/api/posts/${currentPost._id}/comment/${replyData.parentId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          text: replyData.text,
          parentId: replyData.parentId,
        }),
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      message.success("Reply added");
      setActiveReplyId(null);
      fetchComments();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleEdit = async (commentId, text, isReply, parentCommentId) => {
    try {
      const endpoint = isReply
        ? `/api/posts/${currentPost._id}/comment/${parentCommentId}/reply/${commentId}`
        : `/api/posts/${currentPost._id}/comment/${commentId}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      message.success(isReply ? "Reply updated" : "Comment updated");
      fetchComments();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleDelete = async (id, isReply, parentId) => {
    try {
      const endpoint = isReply
        ? `/api/posts/${currentPost._id}/comment/${parentId}/reply/${id}`
        : `/api/posts/${currentPost._id}/comment/${id}`;
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      message.success(isReply ? "Reply deleted" : "Comment deleted");
      fetchComments();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleLike = async (id, isReply, parentId) => {
    if (!currentUser) return message.error("You must be logged in to like");
    try {
      const endpoint = isReply
        ? `/api/posts/${currentPost._id}/comment/${parentId}/reply/${id}/like`
        : `/api/posts/${currentPost._id}/comment/${id}/like`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (data.error) {
        message.error(data.error);
        return;
      }
      message.success(data.likes.includes(currentUser._id) ? "Liked" : "Unliked");
      fetchComments();
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleCommentClick = () => {
    if (!currentUser) {
      message.error("Please log in to comment");
      navigate("/login");
      return;
    }
    if (activeReplyId) {
      message.error("Please complete or cancel the reply before adding a new comment");
      return;
    }
    setOpenCommentDialog(true);
  };

  const handleCloseCommentDialog = () => {
    setOpenCommentDialog(false);
    setDialogComment("");
  };

  const handleReplyFocus = (commentId) => {
    setActiveReplyId(commentId);
    setTimeout(() => {
      if (commentInputRef.current) {
        commentInputRef.current.focus();
      }
    }, 100);
  };

  const handleReplyCancel = () => {
    setActiveReplyId(null);
  };

  const getDocumentIcon = (filename) => {
    const ext = filename?.split(".").pop()?.toLowerCase() || "";
    switch (ext) {
      case "pdf": return <BsFileEarmarkTextFill size={24} />;
      case "zip": return <BsFileZipFill size={24} />;
      case "doc": case "docx": return <BsFileWordFill size={24} />;
      case "xls": case "xlsx": return <BsFileExcelFill size={24} />;
      case "ppt": case "pptx": return <BsFilePptFill size={24} />;
      case "txt": case "rtf": return <BsFileTextFill size={24} />;
      default: return <BsFileEarmarkTextFill size={24} />;
    }
  };

  const getFileName = () => {
    return currentPost.originalFilename || currentPost.media?.split("/").pop() || "Unnamed Document";
  };

  // Admin view
  const renderAdminPost = () => {
    if (isLoadingUser || !postUser) {
      return (
        <Box
          sx={{
            width: { xs: "100%", sm: "90%", md: "600px" },
            maxWidth: "600px",
            mx: { xs: 0, sm: "auto" },
            p: 2,
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: 2,
            backdropFilter: "blur(10px)",
          }}
        >
          <Typography>Loading...</Typography>
        </Box>
      );
    }

    return (
      <Box
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
        <Typography variant="caption" color="text.primary" mb={1}>
          Post ID: {currentPost._id}
        </Typography>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar
              sx={{ width: 48, height: 48, cursor: "pointer" }}
              alt={postUser.name || "User"}
              src={postUser.profilePic}
              onClick={() => navigate(`/${postUser.username}`)}
            />
            <Box>
              <Typography
                variant="body2"
                fontWeight="bold"
                color="text.primary"
                sx={{ cursor: "pointer", fontSize: "14px" }}
                onClick={() => navigate(`/${postUser.username}`)}
              >
                {postUser.name}
              </Typography>
              <Typography
                variant="caption"
                color="#8E8E8E"
                sx={{ fontSize: "12px" }}
              >
                @{postUser.username} • {formatDistanceToNow(new Date(currentPost.createdAt))} ago
                {currentPost.isEdited && " (Edited)"}
              </Typography>
            </Box>
            {postUser.isVerified && (
              <VerifiedIcon color="primary" fontSize="small" sx={{ ml: 0.5 }} />
            )}
          </Box>
          <IconButton onClick={handleMoreClick} size="small">
            <MoreVert sx={{ color: "text.primary", fontSize: 20 }} />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMoreClose}
          >
            <MenuItem
              onClick={() => {
                handleBanUnbanPost(currentPost._id, currentPost.isBanned);
                handleMoreClose();
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
            <MenuItem onClick={handleDownloadPost}>
              <Download sx={{ mr: 1 }} /> Download
            </MenuItem>
          </Menu>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: 2, flex: 1 }}>
          <Typography
            variant="body2"
            color="text.primary"
            sx={{ fontSize: "14px", wordBreak: "break-word" }}
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
                        fontSize: "12px",
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
                <Box sx={{ width: "100%", px: 2, py: 1, display: "flex", justifyContent: "center" }}>
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
                      sx={{ fontSize: "14px", wordBreak: "break-word", textAlign: "center" }}
                    >
                      {getFileName()}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ mt: "auto", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="caption" color="text.secondary">
              {currentPost.likes.length} Likes
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentPost.comments.length} Comments
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentPost.shares.length} Shares
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  // Normal user view
  const renderNormalUserPost = () => {
    return (
      <Paper
        elevation={0}
        sx={{
          maxWidth: 600,
          mx: "auto",
          bgcolor: "white",
          borderRadius: "0",
          boxShadow: "none",
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar src={user.profilePic} alt={user.username} sx={{ width: 32, height: 32 }} />
            <Typography fontWeight="600" fontSize="14px">{user.username}</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="caption" color="text.secondary" fontSize="12px">
              {new Date(currentPost.createdAt).toLocaleString()}
            </Typography>
            <IconButton onClick={handleMoreClick} size="small">
              <MoreVert fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMoreClose}
            >
              {currentUser?._id === user._id && [
                <MenuItem key="edit" onClick={handleEditPost}>
                  <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
                </MenuItem>,
                <MenuItem key="delete" onClick={handleDeletePost}>
                  <Delete fontSize="small" sx={{ mr: 1 }} /> Delete
                </MenuItem>,
              ]}
              <MenuItem onClick={handleDownloadPost}>
                <Download fontSize="small" sx={{ mr: 1 }} /> Download
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {currentPost.media && (
          <Box borderRadius={0} overflow="hidden">
            {currentPost.mediaType === "image" && (
              <img
                src={currentPost.media}
                alt="Post media"
                style={{ width: "100%", objectFit: "cover" }}
              />
            )}
            {currentPost.mediaType === "video" && (
              <video
                controls
                src={currentPost.media}
                style={{ width: "100%" }}
              />
            )}
            {currentPost.mediaType === "audio" && (
              <audio
                controls
                src={currentPost.media}
                style={{ width: "100%" }}
              />
            )}
            {currentPost.mediaType === "document" && (
              <a
                href={currentPost.media}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outlined" sx={{ m: 2, fontSize: "12px" }}>
                  View Document
                </Button>
              </a>
            )}
          </Box>
        )}

        <Box p={2}>
          <Actions post={currentPost} onCommentClick={handleCommentClick} />
          <Typography fontWeight="600" fontSize="14px" mb={1}>
            {currentPost.commentCount || 0} comments
          </Typography>
          <Typography fontSize="14px" sx={{ wordBreak: "break-word" }} mb={2}>
            <strong>{user.username}</strong> {currentPost.text}
          </Typography>

          <Divider sx={{ my: 1 }} />

          {currentUser && (
            <Box display="flex" gap={1} mb={2} alignItems="center">
              <Avatar
                src={currentUser.profilePic}
                alt={currentUser.username}
                sx={{ width: 28, height: 28 }}
              />
              <TextField
                inputRef={commentInputRef}
                fullWidth
                variant="outlined"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => debouncedSetNewComment(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!!activeReplyId}
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "20px",
                    bgcolor: "#FAFAFA",
                    "& fieldset": { border: "1px solid #E0E0E0" },
                    "&:hover fieldset": { border: "1px solid #B0B0B0" },
                    "&.Mui-focused fieldset": { border: "1px solid #0095F6" },
                  },
                  "& .MuiInputBase-input": { fontSize: "14px", py: 1 },
                }}
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || isCommenting || !!activeReplyId}
                sx={{ color: "#0095F6", fontWeight: 600, fontSize: "14px" }}
              >
                {isCommenting ? "Posting..." : "Post"}
              </Button>
            </Box>
          )}

          <Box>
            {currentPost.comments?.length > 0 ? (
              currentPost.comments.map((comment) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  depth={0}
                  currentUser={currentUser}
                  postId={currentPost._id}
                  onReply={handleReply}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onLike={handleLike}
                  onReplyFocus={handleReplyFocus}
                  onReplyCancel={handleReplyCancel}
                  activeReplyId={activeReplyId}
                  fetchComments={fetchComments}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" fontSize="14px">
                No comments yet.
              </Typography>
            )}
          </Box>
        </Box>

        <Dialog
          open={openCommentDialog}
          onClose={handleCloseCommentDialog}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Add a Comment</DialogTitle>
          <DialogContent>
            <TextField
              inputRef={dialogCommentInputRef}
              autoFocus
              fullWidth
              variant="outlined"
              placeholder="Write your comment..."
              value={dialogComment}
              onChange={(e) => debouncedSetDialogComment(e.target.value)}
              onKeyPress={handleKeyPress}
              multiline
              rows={4}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "rgba(0,0,0,0.1)" },
                  "&:hover fieldset": { borderColor: "rgba(0,0,0,0.2)" },
                  "& .MuiInputBase-input": { fontSize: "14px" },
                },
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCommentDialog} sx={{ fontSize: "14px" }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddComment}
              disabled={!dialogComment.trim() || isCommenting}
              variant="contained"
              sx={{ fontSize: "14px" }}
            >
              {isCommenting ? "Posting..." : "Post"}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    );
  };

  if (!user && loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!currentPost) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Typography>Post not found</Typography>
      </Box>
    );
  }

  return (
    <motion.div
      key={currentUser?.isAdmin ? "admin" : "normal"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        backgroundColor: currentUser?.isAdmin ? "#1a1a1a" : "#FAFAFA",
        minHeight: "100vh",
        padding: "16px",
      }}
    >
      {currentUser?.isAdmin ? renderAdminPost() : renderNormalUserPost()}
    </motion.div>
  );
};

export default PostPage;