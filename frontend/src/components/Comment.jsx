import { Avatar, Divider, Flex, Text, Button } from "@chakra-ui/react";
import { useState } from "react";
import useShowToast from "../hooks/useShowToast";

const Comment = ({ comment, lastComment, postId, onReply }) => {
	const [liked, setLiked] = useState(comment.likes.includes(userAtom._id));
	const showToast = useShowToast();

	const handleLikeComment = async () => {
		try {
			const res = await fetch(`/api/posts/like-comment/${postId}/${comment._id}`, {
				method: "PUT",
			});
			const data = await res.json();
			if (data.error) {
				showToast("Error", data.error, "error");
				return;
			}
			setLiked(!liked);
		} catch (error) {
			showToast("Error", error.message, "error");
		}
	};

	return (
		<>
			<Flex gap={4} py={2} my={2} w={"full"}>
				<Avatar src={comment.userProfilePic} size={"sm"} />
				<Flex gap={1} w={"full"} flexDirection={"column"}>
					<Flex w={"full"} justifyContent={"space-between"} alignItems={"center"}>
						<Text fontSize="sm" fontWeight="bold">
							{comment.username}
						</Text>
						<Text fontSize="xs" color="gray.light">
							{comment.likes.length} likes
						</Text>
					</Flex>
					<Text>{comment.text}</Text>
					<Flex gap={2}>
						<Button size="xs" onClick={handleLikeComment}>
							{liked ? "Unlike" : "Like"}
						</Button>
						<Button size="xs" onClick={() => onReply(comment._id)}>
							Reply
						</Button>
					</Flex>
					{comment.replies.map((reply, idx) => (
						<Flex key={idx} gap={2} pl={6}>
							<Avatar src={reply.userProfilePic} size="xs" />
							<Text fontSize="sm">
								<Text as="span" fontWeight="bold">
									{reply.username}:{" "}
								</Text>
								{reply.text}
							</Text>
						</Flex>
					))}
				</Flex>
			</Flex>
			{!lastComment ? <Divider /> : null}
		</>
	);
};

export default Comment;