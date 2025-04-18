import React, { useState, useCallback } from 'react';
import { Avatar, Box, Typography, Button, Divider } from '@mui/material';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { motion } from 'framer-motion';
import useShowToast from '../hooks/useShowToast';
import { useRecoilValue, useRecoilState } from 'recoil';
import userAtom from '../atoms/userAtom';
import postsAtom from '../atoms/postsAtom';

const Comment = ({ comment, lastComment, postId, onReply, isLoading }) => {
  const user = useRecoilValue(userAtom);
  const [postsState, setPostsState] = useRecoilState(postsAtom);
  const [liked, setLiked] = useState(() => comment.likes?.includes(user?._id));
  const showToast = useShowToast();

  const handleLikeComment = useCallback(async () => {
    if (!user) {
      showToast('Error', 'You must be logged in to like a comment', 'error');
      return;
    }

    try {
      const res = await fetch(`/api/posts/post/${postId}/comment/${comment._id}/like`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.error) {
        showToast('Error', data.error, 'error');
        return;
      }

      setPostsState((prev) => {
        const updatedPosts = prev.posts.map((p) => {
          if (p._id !== postId) return p;

          const updatedComments = (p.comments || []).map((c) => {
            if (c._id !== comment._id) return c;

            const updatedLikes = liked
              ? c.likes.filter((id) => id !== user._id)
              : [...c.likes, user._id];

            return {
              ...c,
              likes: updatedLikes,
            };
          });

          return {
            ...p,
            comments: updatedComments,
          };
        });

        return {
          ...prev,
          posts: updatedPosts,
        };
      });

      setLiked((prevLiked) => !prevLiked);
      showToast('Success', `Comment ${liked ? 'unliked' : 'liked'} successfully`, 'success');
    } catch (error) {
      showToast('Error', 'An error occurred while liking the comment', 'error');
    }
  }, [user, postId, comment._id, liked, showToast, setPostsState]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <Skeleton width={300} height={150} />
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box display="flex" gap={2} py={1} my={1} width="100%">
        <Avatar alt={`Avatar of ${comment.username}`} src={comment.userProfilePic} />
        <Box display="flex" flexDirection="column" gap={1} width="100%">
          <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
            <Typography variant="subtitle2" fontWeight="bold">
              {comment.username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {comment.likes?.length || 0} likes
            </Typography>
          </Box>
          <Typography variant="body2">{comment.text}</Typography>
          <Box display="flex" gap={1}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={handleLikeComment}
              aria-label={liked ? 'Unlike comment' : 'Like comment'}
            >
              {liked ? 'Unlike' : 'Like'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => onReply(comment._id)}
              aria-label="Reply to comment"
            >
              Reply
            </Button>
          </Box>
          {comment.replies?.length > 0 ? (
            comment.replies.map((reply) => (
              <Box key={reply._id} display="flex" gap={1} pl={3}>
                <Avatar alt={`Avatar of ${reply.username}`} src={reply.userProfilePic} sx={{ width: 24, height: 24 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>{reply.username}:</strong> {reply.text}
                </Typography>
              </Box>
            ))
          ) : (
            <Typography variant="caption" color="text.secondary" pl={3}>
              No replies yet.
            </Typography>
          )}
        </Box>
      </Box>
      {!lastComment && <Divider />}
    </motion.div>
  );
};

export default Comment;
