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
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";

const CommentModal = ({ isOpen, onClose, post }) => {
	const [commentText, setCommentText] = useState("");
	const [replyText, setReplyText] = useState("");
	const [replyTo, setReplyTo] = useState(null);
	const showToast = useShowToast();
	const user = useRecoilValue(userAtom);

	const handleComment = async () => {
		try {
			const res = await fetch(`/api/posts/comment/${post._id}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: commentText }),
			});
			const data = await res.json();
			if (data.error) {
				showToast("Error", data.error, "error");
				return;
			}
			post.comments.push(data);
			setCommentText("");
		} catch (error) {
			showToast("Error", error.message, "error");
		}
	};

	const handleReply = async (commentId) => {
		try {
			const res = await fetch(`/api/posts/reply/${post._id}/${commentId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: replyText }),
			});
			const data = await res.json();
			if (data.error) {
				showToast("Error", data.error, "error");
				return;
			}
			const comment = post.comments.find((c) => c._id === commentId);
			comment.replies.push(data);
			setReplyText("");
			setReplyTo(null);
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
						{post.comments.map((comment, idx) => (
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
								placeholder={`Reply to ${post.comments.find((c) => c._id === replyTo)?.username}`}
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