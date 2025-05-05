import { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Typography,
  TextField,
  IconButton,
  Collapse,
} from "@mui/material";
import { Favorite, FavoriteBorder, Reply, ExpandMore, ExpandLess, Edit, Delete } from "@mui/icons-material";
import { message, App as AntdApp } from "antd"; // Wrap the application with Ant Design's App
import { formatDistanceToNow } from "date-fns";

const CommentItem = ({
  comment,
  depth = 0,
  currentUser,
  postId,
  postOwnerId,
  topLevelCommentId,
  onReply,
  onEdit,
  onDelete,
  onLike,
  fetchComments,
}) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  const isCommentOwner = currentUser?._id === comment.userId?._id?.toString();
  const isPostOwner = currentUser?._id === postOwnerId?.toString();
  const isAdmin = currentUser?.isAdmin;
  const canEdit = isCommentOwner || isAdmin;
  const canDelete = isCommentOwner || isPostOwner || isAdmin;
  const isLiked = comment.likes?.includes(currentUser?._id);

  const handleToggleReplies = () => {
    setExpanded(!expanded);
  };

  const handleReply = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      message.error("You must be logged in to reply to comments.");
      return;
    }
    setShowReplyForm(true);
    onReply?.({
      _id: comment._id,
      commentId: topLevelCommentId || comment._id,
      username: comment.username || comment.userId?.username,
    });
  };
  
  const handleSubmitReply = async () => {
    if (!replyText.trim()) {
      message.error("Reply cannot be empty");
      return;
    }
    if (!postId || !comment._id) {
      console.error("Invalid props in CommentItem:", { postId, commentId: comment._id, topLevelCommentId });
      message.error("Invalid post or comment data");
      return;
    }
  
    const token = localStorage.getItem("token");
    if (!token) {
      message.error("You must be logged in to reply to comments.");
      return;
    }
  
    setIsReplying(true);
    try {
      const endpoint = `/api/posts/post/${postId}/comment/${topLevelCommentId || comment._id}/reply`;
      console.log("handleSubmitReply:", {
        postId,
        topLevelCommentId,
        commentId: comment._id,
        endpoint,
        token: token ? `${token.slice(0, 10)}...` : "No token",
        body: { text: replyText, parentId: comment._id },
      });
  
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ text: replyText, parentId: comment._id }),
      });
  
      const data = await res.json();
      console.log("handleSubmitReply response:", { status: res.status, data });
  
      if (!res.ok) {
        console.error("handleSubmitReply error:", data);
        throw new Error(data.error || `HTTP error ${res.status}`);
      }
  
      message.success("Reply added");
      setReplyText("");
      setShowReplyForm(false);
      onReply?.(null);
      await fetchComments();
    } catch (error) {
      console.error("handleSubmitReply error:", error);
      message.error(error.message || "An error occurred while adding the reply");
    } finally {
      setIsReplying(false);
    }
  };

  const handleEdit = async () => {
    if (!editText.trim()) {
      message.error("Comment text cannot be empty");
      return;
    }
    try {
      await onEdit(comment._id, editText, !!comment.parentId, topLevelCommentId || comment._id);
      setIsEditing(false);
      message.success("Comment updated");
    } catch (error) {
      message.error(error.message || "An error occurred while updating the comment");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await onDelete(comment._id, !!comment.parentId, topLevelCommentId || comment._id);
      message.success("Comment deleted");
    } catch (error) {
      message.error(error.message || "An error occurred while deleting the comment");
    }
  };

  const handleLike = async () => {
    try {
      await onLike(comment._id, !!comment.parentId, topLevelCommentId || comment._id);
    } catch (error) {
      message.error(error.message || "An error occurred while liking the comment");
    }
  };

  return (
    <Box
      sx={{
        ml: depth * 2,
        mb: 1,
        p: 1,
        borderRadius: "16px",
        bgcolor: depth % 2 === 0 ? "background.paper" : "grey.50",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        backdropFilter: depth % 2 === 0 ? "blur(10px)" : "none",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <Avatar
          src={comment.userProfilePic || comment.userId?.profilePic || "/default-avatar.png"}
          alt={comment.username || comment.userId?.username}
          sx={{ width: 32, height: 32 }}
        />
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography variant="subtitle2" fontWeight="bold" color="text.primary">
              {comment.username || comment.userId?.username || "Unknown"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(new Date(comment.createdAt))} ago
              {comment.isEdited && " • Edited"}
            </Typography>
          </Box>

          {isEditing ? (
            <Box sx={{ mt: 1 }}>
              <TextField
                fullWidth
                size="small"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                multiline
                maxRows={4}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "rgba(255, 255, 255, 0.3)" },
                    "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.5)" },
                    "&.Mui-focused fieldset": { borderColor: "primary.main" },
                  },
                  "& .MuiInputBase-input": { color: "text.primary" },
                  "& .MuiInputBase-input::placeholder": { color: "text.secondary" },
                }}
              />
              <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleEdit}
                  disabled={!editText.trim()}
                  sx={{ bgcolor: "primary.main", "&:hover": { bgcolor: "primary.dark" } }}
                >
                  Save
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(comment.text);
                  }}
                  sx={{ color: "text.secondary" }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.primary" sx={{ mt: 0.5, wordBreak: "break-word" }}>
              {comment.text}
            </Typography>
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
            <IconButton size="small" onClick={handleLike}>
              {isLiked ? <Favorite sx={{ color: "primary.main" }} /> : <FavoriteBorder sx={{ color: "text.secondary" }} />}
            </IconButton>
            <Typography variant="caption" color="text.secondary">{comment.likes?.length || 0}</Typography>
            <Button
              size="small"
              startIcon={<Reply sx={{ color: "text.secondary" }} />}
              onClick={handleReply}
              sx={{ color: "text.secondary", textTransform: "none" }}
            >
              Reply
            </Button>
            {canEdit && (
              <Button
                size="small"
                startIcon={<Edit sx={{ color: "text.secondary" }} />}
                onClick={() => setIsEditing(true)}
                sx={{ color: "text.secondary", textTransform: "none" }}
              >
                Edit
              </Button>
            )}
            {canDelete && (
              <Button
                size="small"
                startIcon={<Delete sx={{ color: "error.main" }} />}
                onClick={handleDelete}
                sx={{ color: "error.main", textTransform: "none" }}
              >
                Delete
              </Button>
            )}
          </Box>

          {showReplyForm && (
            <Box sx={{ mt: 1, ml: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                multiline
                maxRows={4}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "rgba(255, 255, 255, 0.3)" },
                    "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.5)" },
                    "&.Mui-focused fieldset": { borderColor: "primary.main" },
                  },
                  "& .MuiInputBase-input": { color: "text.primary" },
                  "& .MuiInputBase-input::placeholder": { color: "text.secondary" },
                }}
              />
              <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleSubmitReply}
                  disabled={!replyText.trim() || isReplying}
                  sx={{ bgcolor: "primary.main", "&:hover": { bgcolor: "primary.dark" } }}
                >
                  Post
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyText("");
                    onReply?.(null);
                  }}
                  sx={{ color: "text.secondary" }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {comment.replies?.length > 0 && (
        <Box sx={{ ml: 2 }}>
          <Button
            size="small"
            onClick={handleToggleReplies}
            startIcon={expanded ? <ExpandLess sx={{ color: "text.secondary" }} /> : <ExpandMore sx={{ color: "text.secondary" }} />}
            sx={{ color: "text.secondary", textTransform: "none" }}
          >
            {expanded ? "Hide" : "Show"} {comment.replies.length} repl{comment.replies.length === 1 ? "y" : "ies"}
          </Button>
          <Collapse in={expanded}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply._id}
                comment={reply}
                depth={depth + 1}
                currentUser={currentUser}
                postId={postId}
                postOwnerId={postOwnerId}
                topLevelCommentId={topLevelCommentId || comment._id}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onLike={onLike}
                fetchComments={fetchComments}
              />
            ))}
          </Collapse>
        </Box>
      )}
    </Box>
  );
};

const AppWrapper = () => (
  <AntdApp>
    <CommentItem />
  </AntdApp>
);

export default CommentItem;