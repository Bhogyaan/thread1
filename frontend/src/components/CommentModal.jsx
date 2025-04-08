import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalCloseButton,
	ModalBody,
	ModalFooter,
	VStack,
	Input,
	Button,
  } from "@chakra-ui/react";
  import Comment from "./Comment";
  import { useState } from "react";
  import useShowToast from "../hooks/useShowToast";
  import { useRecoilValue, useRecoilState } from "recoil";
  import userAtom from "../atoms/userAtom";
  import postsAtom from "../atoms/postsAtom";
  
  const CommentModal = ({ isOpen, onClose, post }) => {
	const [commentText, setCommentText] = useState("");
	const [replyText, setReplyText] = useState("");
	const [replyTo, setReplyTo] = useState(null);
	const showToast = useShowToast();
	const user = useRecoilValue(userAtom);
	const [postsState, setPostsState] = useRecoilState(postsAtom);
  
	const handleComment = async () => {
	  if (!user) {
		showToast("Error", "You must be logged in to comment", "error");
		return;
	  }
	  if (!commentText.trim()) {
		showToast("Error", "Comment text is required", "error");
		return;
	  }
  
	  try {
		const res = await fetch(`/api/posts/post/${post._id}/comment`, { // Corrected endpoint
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({ text: commentText }),
		});
		const data = await res.json();
		if (data.error) {
		  showToast("Error", data.error, "error");
		  return;
		}
		setPostsState((prev) => ({
		  ...prev,
		  posts: prev.posts.map((p) =>
			p._id === post._id ? { ...p, comments: [...(p.comments || []), data] } : p
		  ),
		}));
		setCommentText("");
		showToast("Success", "Comment posted successfully", "success");
	  } catch (error) {
		showToast("Error", error.message, "error");
	  }
	};
  
	const handleReply = async (commentId) => {
	  if (!user) {
		showToast("Error", "You must be logged in to reply", "error");
		return;
	  }
	  if (!replyText.trim()) {
		showToast("Error", "Reply text is required", "error");
		return;
	  }
  
	  try {
		const res = await fetch(`/api/posts/post/${post._id}/comment/${commentId}/reply`, { // Corrected endpoint
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({ text: replyText }),
		});
		const data = await res.json();
		if (data.error) {
		  showToast("Error", data.error, "error");
		  return;
		}
		setPostsState((prev) => ({
		  ...prev,
		  posts: prev.posts.map((p) =>
			p._id === post._id
			  ? {
				  ...p,
				  comments: p.comments.map((c) =>
					c._id === commentId ? { ...c, replies: [...(c.replies || []), data] } : c
				  ),
				}
			  : p
		  ),
		}));
		setReplyText("");
		setReplyTo(null);
		showToast("Success", "Reply posted successfully", "success");
	  } catch (error) {
		showToast("Error", error.message, "error");
	  }
	};
  
	return (
	  <Modal isOpen={isOpen} onClose={onClose} motionPreset="slideInBottom">
		<ModalOverlay />
		<ModalContent maxH="80vh" borderRadius="md" position="fixed" bottom={0} left={0} right={0}>
		  <ModalHeader>Comments</ModalHeader>
		  <ModalCloseButton />
		  <ModalBody overflowY="auto">
			<VStack spacing={4}>
			  {(post.comments || []).map((comment, idx) => (
				<Comment
				  key={comment._id}
				  comment={comment}
				  lastComment={idx === post.comments.length - 1}
				  postId={post._id}
				  onReply={(commentId) => setReplyTo(commentId)}
				/>
			  ))}
			</VStack>
		  </ModalBody>
		  <ModalFooter flexDirection="column" gap={2}>
			{replyTo ? (
			  <>
				<Input
				  placeholder={`Reply to ${post.comments.find((c) => c._id === replyTo)?.username || "user"}`}
				  value={replyText}
				  onChange={(e) => setReplyText(e.target.value)}
				/>
				<Button colorScheme="blue" onClick={() => handleReply(replyTo)}>
				  Reply
				</Button>
			  </>
			) : (
			  <>
				<Input
				  placeholder="Add a comment..."
				  value={commentText}
				  onChange={(e) => setCommentText(e.target.value)}
				/>
				<Button colorScheme="blue" onClick={handleComment}>
				  Comment
				</Button>
			  </>
			)}
		  </ModalFooter>
		</ModalContent>
	  </Modal>
	);
  };
  
  export default CommentModal;