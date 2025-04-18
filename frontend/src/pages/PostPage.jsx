// PostPage.jsx
import { useEffect, useState, useRef } from "react";
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
} from "@mui/material";
import {
  MoreVert,
  Edit,
  Delete,
  Download,
  Favorite,
  FavoriteBorder,
  Reply,
} from "@mui/icons-material";
import { message } from "antd";
import Actions from "../components/Actions";
import useGetUserProfile from "../hooks/useGetUserProfile";
import userAtom from "../atoms/userAtom";
import postsAtom from "../atoms/postsAtom";
import { useSocket } from "../contexts/SocketContext";

const PostPage = () => {
  const { user, loading } = useGetUserProfile();
  const [posts, setPosts] = useRecoilState(postsAtom);
  const { pid } = useParams();
  const currentUser = useRecoilValue(userAtom);
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedText, setEditedText] = useState("");
  const commentInputRef = useRef(null);
  const { socket } = useSocket();

  const currentPost = posts.posts?.find((p) => p._id === pid);

  useEffect(() => {
    if (!socket || !pid) return;

    socket.emit("joinPostRoom", pid);
    console.log(`Joined post room: post:${pid}`);

    socket.on("newComment", ({ postId, comment, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? post : p)),
        }));
      }
    });

    socket.on("newReply", ({ postId, commentId, reply, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? post : p)),
        }));
      }
    });

    socket.on("likeUnlikePost", ({ postId, userId, likes, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? { ...p, likes } : p)),
        }));
      }
    });

    socket.on("likeUnlikeComment", ({ postId, commentId, userId, likes, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? post : p)),
        }));
      }
    });

    socket.on("likeUnlikeReply", ({ postId, commentId, replyId, userId, likes, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? post : p)),
        }));
      }
    });

    socket.on("editComment", ({ postId, commentId, text, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? post : p)),
        }));
      }
    });

    socket.on("deleteComment", ({ postId, commentId, post }) => {
      if (postId === pid) {
        setPosts((prev) => ({
          ...prev,
          posts: prev.posts.map((p) => (p._id === postId ? post : p)),
        }));
      }
    });

    socket.on("postDeleted", ({ postId }) => {
      if (postId === pid) {
        message.info("This post has been deleted");
        navigate(`/${user.username}`);
      }
    });

    return () => {
      socket.emit("leavePostRoom", pid);
      socket.off("newComment");
      socket.off("newReply");
      socket.off("likeUnlikePost");
      socket.off("likeUnlikeComment");
      socket.off("likeUnlikeReply");
      socket.off("editComment");
      socket.off("deleteComment");
      socket.off("postDeleted");
      console.log(`Left post room: post:${pid}`);
    };
  }, [socket, pid, setPosts, navigate, user]);

  useEffect(() => {
    const getPost = async () => {
      setPosts((prev) => ({ ...prev, posts: [] }));
      try {
        const res = await fetch(`/api/posts/${pid}`);
        const data = await res.json();
        if (data.error) {
          message.error(data.error);
          return;
        }
        setPosts((prev) => ({ ...prev, posts: [data] }));
      } catch (error) {
        message.error(error.message);
      }
    };
    if (!currentPost) getPost();
  }, [pid, setPosts, currentPost]);

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
      navigate(`/${user.username}`);
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
    link.download = currentPost.media
      ? `post_${currentPost._id}.${currentPost.mediaType}`
      : `post_${currentPost._id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMoreClick = (event) => setAnchorEl(event.currentTarget);
  const handleMoreClose = () => setAnchorEl(null);

  const handleAddComment = async () => {
    if (!newComment.trim()) return message.error("Comment cannot be empty");
    try {
      const res = await fetch(
        `/api/posts/post/${currentPost._id}/comment${replyTo ? `/${replyTo._id}/reply` : ""}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ text: newComment }),
        }
      );
      const data = await res.json();
      if (data.error) return message.error(data.error);

      setNewComment("");
      setReplyTo(null);
      message.success(replyTo ? "Reply added" : "Comment added");
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editedText.trim()) return message.error("Comment text cannot be empty");
    try {
      const res = await fetch(`/api/posts/post/${currentPost._id}/comment/${commentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ text: editedText }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.error) return message.error(data.error);

      message.success("Comment updated");
      setEditingCommentId(null);
      setEditedText("");
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const res = await fetch(`/api/posts/post/${currentPost._id}/comment/${commentId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (data.error) return message.error(data.error);

      message.success("Comment deleted successfully");
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleLikeComment = async (commentId, replyId = null) => {
    if (!currentUser) return message.error("You must be logged in to like a comment");
    try {
      const endpoint = replyId
        ? `/api/posts/post/${currentPost._id}/comment/${commentId}/reply/${replyId}/like`
        : `/api/posts/post/${currentPost._id}/comment/${commentId}/like`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (data.error) return message.error(data.error);
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleCommentClick = () => {
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };

  const renderComments = (comments, depth = 0) => {
    return comments.map((comment) => (
      <Paper
        elevation={2}
        key={comment._id}
        sx={{
          p: 2,
          mb: 2,
          ml: depth * 4,
          bgcolor: "rgba(255, 255, 255, 0.2)",
          backdropFilter: "blur(6px)",
          borderRadius: "8px",
        }}
      >
        <Box display="flex" gap={2}>
          <Avatar
            src={comment.userProfilePic}
            alt={comment.username}
            sx={{ width: 32, height: 32 }}
          />
          <Box flex={1}>
            <Typography fontWeight="bold" color="#000000">
              {comment.username}
            </Typography>
            {editingCommentId === comment._id ? (
              <Box display="flex" gap={1} mt={1}>
                <TextField
                  fullWidth
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  size="small"
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.3)",
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: "rgba(255, 255, 255, 0.3)" },
                      "&:hover fieldset": {
                        borderColor: "rgba(255, 255, 255, 0.5)",
                      },
                    },
                  }}
                />
                <Button
                  size="small"
                  onClick={() => handleEditComment(comment._id)}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  onClick={() => setEditingCommentId(null)}
                >
                  Cancel
                </Button>
              </Box>
            ) : (
              <Typography sx={{ wordBreak: "break-word" }}>
                {comment.text}
              </Typography>
            )}
            <Box display="flex" gap={1} mt={1} flexWrap="wrap">
              <IconButton
                size="small"
                onClick={() => handleLikeComment(comment._id)}
              >
                {comment.likes?.includes(currentUser?._id) ? (
                  <Favorite color="error" fontSize="small" />
                ) : (
                  <FavoriteBorder fontSize="small" />
                )}
                <Typography variant="caption" ml={0.5}>
                  {comment.likes?.length || 0}
                </Typography>
              </IconButton>
              <Button
                size="small"
                onClick={() => setReplyTo(comment)}
                startIcon={<Reply />}
                sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
              >
                Reply
              </Button>
              {(comment.userId === currentUser?._id ||
                currentPost?.postedBy === currentUser?._id) && (
                <>
                  <Button
                    size="small"
                    onClick={() => {
                      setEditingCommentId(comment._id);
                      setEditedText(comment.text);
                    }}
                    sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleDeleteComment(comment._id)}
                    sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                  >
                    Delete
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Box>
        {comment.replies?.length > 0 &&
          comment.replies.map((reply) => (
            <Paper
              elevation={1}
              key={reply._id}
              sx={{
                p: 2,
                mt: 1,
                ml: (depth + 1) * 4,
                bgcolor: "rgba(255, 255, 255, 0.15)",
                borderRadius: "8px",
              }}
            >
              <Box display="flex" gap={2}>
                <Avatar
                  src={reply.userProfilePic}
                  alt={reply.username}
                  sx={{ width: 28, height: 28 }}
                />
                <Box flex={1}>
                  <Typography
                    fontWeight="bold"
                    fontSize="0.875rem"
                    color="#000000"
                  >
                    {reply.username}
                  </Typography>
                  <Typography
                    fontSize="0.875rem"
                    sx={{ wordBreak: "break-word" }}
                  >
                    {reply.text}
                  </Typography>
                  <Box display="flex" gap={1} mt={1}>
                    <IconButton
                      size="small"
                      onClick={() => handleLikeComment(comment._id, reply._id)}
                    >
                      {reply.likes?.includes(currentUser?._id) ? (
                        <Favorite color="error" fontSize="small" />
                      ) : (
                        <FavoriteBorder fontSize="small" />
                      )}
                      <Typography variant="caption" ml={0.5}>
                        {reply.likes?.length || 0}
                      </Typography>
                    </IconButton>
                    <Button
                      size="small"
                      onClick={() => setReplyTo({ ...reply, _id: comment._id })}
                      startIcon={<Reply />}
                      sx={{ fontSize: "0.75rem" }}
                    >
                      Reply
                    </Button>
                    {(reply.userId === currentUser?._id ||
                      currentPost?.postedBy === currentUser?._id) && (
                      <Button
                        size="small"
                        onClick={() => handleDeleteComment(reply._id)}
                        sx={{ fontSize: "0.75rem" }}
                      >
                        Delete
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>
            </Paper>
          ))}
      </Paper>
    ));
  };

  if (!user && loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!currentPost) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ backgroundColor: "#F1F3F5", minHeight: "100vh", padding: "24px" }}
    >
      <Paper
        elevation={3}
        sx={{
          maxWidth: 800,
          mx: "auto",
          p: 3,
          bgcolor: "rgba(255, 255, 255, 0.2)",
          backdropFilter: "blur(6px)",
          borderRadius: "12px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar src={user.profilePic} alt={user.username} />
            <Typography fontWeight="bold">{user.username}</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="caption">
              {new Date(currentPost.createdAt).toLocaleString()}
            </Typography>
            <IconButton onClick={handleMoreClick}>
              <MoreVert />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMoreClose}
            >
              {(currentUser?._id === user._id || currentUser?.isAdmin) && [
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

        <Typography my={2} sx={{ wordBreak: "break-word" }}>
          {currentPost.text}
        </Typography>

        {currentPost.media && (
          <Box
            my={2}
            borderRadius={1}
            overflow="hidden"
            border="1px solid rgba(255, 255, 255, 0.3)"
          >
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
                <Button variant="outlined" sx={{ m: 2 }}>
                  View Document
                </Button>
              </a>
            )}
          </Box>
        )}

        <Actions post={currentPost} onCommentClick={handleCommentClick} />

        <Divider sx={{ my: 2 }} />

        {currentUser && (
          <Box display="flex" gap={2} mb={2}>
            <Avatar
              src={currentUser.profilePic}
              alt={currentUser.username}
              sx={{ width: 32, height: 32 }}
            />
            <Box flex={1}>
              {replyTo && (
                <Typography variant="caption" mb={1}>
                  Replying to {replyTo.username}
                </Typography>
              )}
              <TextField
                inputRef={commentInputRef}
                fullWidth
                variant="outlined"
                placeholder={replyTo ? "Add a reply..." : "Add a comment..."}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.3)",
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "rgba(255, 255, 255, 0.3)" },
                    "&:hover fieldset": {
                      borderColor: "rgba(255, 255, 255, 0.5)",
                    },
                  },
                }}
              />
            </Box>
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              variant="contained"
            >
              Post
            </Button>
          </Box>
        )}

        <Box>
          {currentPost.comments?.length > 0 ? (
            renderComments(currentPost.comments.filter((c) => !c.replyTo))
          ) : (
            <Typography>No comments yet.</Typography>
          )}
        </Box>
      </Paper>
    </motion.div>
  );
};

export default PostPage;