import {
	Avatar,
	Box,
	Button,
	Divider,
	Flex,
	Image,
	Spinner,
	Text,
	useMediaQuery,
} from "@chakra-ui/react"; 
import Actions from "../components/Actions";
import { useEffect, useState } from "react";
import Comment from "../components/Comment";
import CommentModal from "../components/CommentModal";
import useGetUserProfile from "../hooks/useGetUserProfile";
import useShowToast from "../hooks/useShowToast";
import { useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import { DeleteIcon } from "@chakra-ui/icons";
import postsAtom from "../atoms/postsAtom";

const PostPage = () => {
	const { user, loading } = useGetUserProfile();
	const [posts, setPosts] = useRecoilState(postsAtom);
	const showToast = useShowToast();
	const { pid } = useParams();
	const currentUser = useRecoilValue(userAtom);
	const navigate = useNavigate();
	const [isSmallScreen] = useMediaQuery("(max-width: 768px)");
	const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

	const currentPost = posts[0];

	useEffect(() => {
		const getPost = async () => {
			setPosts([]);
			try {
				const res = await fetch(`/api/posts/${pid}`);
				const data = await res.json();
				if (data.error) {
					showToast("Error", data.error, "error");
					return;
				}
				setPosts([data]);
			} catch (error) {
				showToast("Error", error.message, "error");
			}
		};
		getPost();
	}, [showToast, pid, setPosts]);

	const handleDeletePost = async () => {
		try {
			if (!window.confirm("Are you sure you want to delete this post?")) return;

			const res = await fetch(`/api/posts/${currentPost._id}`, {
				method: "DELETE",
			});
			const data = await res.json();
			if (data.error) {
				showToast("Error", data.error, "error");
				return;
			}
			showToast("Success", "Post deleted", "success");
			navigate(`/${user.username}`);
		} catch (error) {
			showToast("Error", error.message, "error");
		}
	};

	if (!user && loading) {
		return (
			<Flex justifyContent={"center"}>
				<Spinner size={"xl"} />
			</Flex>
		);
	}

	if (!currentPost) return null;

	return (
		<>
			<Flex position="relative">
				{currentPost.isBanned && (
					<Box
						position="absolute"
						top={0}
						left={0}
						w="full"
						h="full"
						bg="rgba(0,0,0,0.5)"
						display="flex"
						alignItems="center"
						justifyContent="center"
						zIndex={1}
					>
						<Text color="white" fontWeight="bold">
							This is banned by the admin
						</Text>
					</Box>
				)}
				<Flex w={"full"} alignItems={"center"} gap={3}>
					<Avatar src={user.profilePic} size={"md"} name="Mark Zuckerberg" />
					<Flex>
						<Text fontSize={"sm"} fontWeight={"bold"}>
							{user.username}
						</Text>
						{user.isAdmin && <Image src="/verified.png" w="4" h={4} ml={4} />}
					</Flex>
				</Flex>
				<Flex gap={4} alignItems={"center"}>
					<Text fontSize={"xs"} width={36} textAlign={"right"} color={"gray.light"}>
						{formatDistanceToNow(new Date(currentPost.createdAt))} ago
					</Text>
					{(currentUser?._id === user._id || currentUser?.isAdmin) && (
						<DeleteIcon size={20} cursor={"pointer"} onClick={handleDeletePost} />
					)}
				</Flex>
			</Flex>

			<Text my={3}>{currentPost.text}</Text>

			{currentPost.media && (
				<Box borderRadius={6} overflow={"hidden"} border={"1px solid"} borderColor={"gray.light"}>
					{currentPost.mediaType === "image" && <Image src={currentPost.media} w={"full"} />}
					{currentPost.mediaType === "video" && (
						<video controls src={currentPost.media} style={{ width: "100%" }} />
					)}
					{currentPost.mediaType === "audio" && <audio controls src={currentPost.media} />}
					{currentPost.mediaType === "document" && (
						<Link href={currentPost.media} target="_blank">
							<Text>View Document</Text>
						</Link>
					)}
					{currentPost.previewUrl && <Image src={currentPost.previewUrl} w="100px" h="100px" />}
				</Box>
			)}

			<Flex gap={3} my={3}>
				<Actions post={currentPost} onCommentClick={isSmallScreen ? () => setIsCommentModalOpen(true) : null} />
			</Flex>

			<Divider my={4} />

			{!isSmallScreen && (
				<>
					<Flex justifyContent={"space-between"}>
						<Flex gap={2} alignItems={"center"}>
							<Text fontSize={"2xl"}>👋</Text>
							<Text color={"gray.light"}>Get the app to like, reply and post.</Text>
						</Flex>
						<Button>Get</Button>
					</Flex>
					<Divider my={4} />
					{currentPost.comments.map((comment, idx) => (
						<Comment
							key={comment._id}
							comment={comment}
							lastComment={idx === currentPost.comments.length - 1}
							postId={currentPost._id}
							onReply={(commentId) => console.log("Reply to", commentId)}
						/>
					))}
				</>
			)}

			{isSmallScreen && (
				<CommentModal
					isOpen={isCommentModalOpen}
					onClose={() => setIsCommentModalOpen(false)}
					post={currentPost}
				/>
			)}
		</>
	);
};

export default PostPage;