import {
	Avatar,
	Image,
	Box,
	Flex,
	Text,
	useMediaQuery,
  } from "@chakra-ui/react";
  import { Link, useNavigate } from "react-router-dom";
  import Actions from "./Actions";
  import { useEffect, useState } from "react";
  import useShowToast from "../hooks/useShowToast";
  import { formatDistanceToNow } from "date-fns";
  import { DeleteIcon } from "@chakra-ui/icons";
  import { useRecoilState, useRecoilValue } from "recoil";
  import userAtom from "../atoms/userAtom";
  import postsAtom from "../atoms/postsAtom";
  
  const Post = ({ post, postedBy }) => {
	const [user, setUser] = useState(null);
	const showToast = useShowToast();
	const currentUser = useRecoilValue(userAtom);
	const [posts, setPosts] = useRecoilState(postsAtom);
	const navigate = useNavigate();
	const [isBelow500px] = useMediaQuery("(max-width: 500px)");
  
	useEffect(() => {
	  const getUser = async () => {
		try {
		  const query = typeof postedBy === "string" ? postedBy : postedBy?._id || postedBy?.username;
		  if (!query) {
			showToast("Error", "Invalid user data for post", "error");
			return;
		  }
  
		  const res = await fetch(`/api/users/profile/${query}`);
		  const data = await res.json();
		  if (data.error) {
			showToast("Error", "User not found", "error");
			return;
		  }
		  setUser(data);
		} catch (error) {
		  showToast("Error", error.message, "error");
		  setUser(null);
		}
	  };
  
	  getUser();
	}, [postedBy, showToast]);
  
	const handleDeletePost = async (e) => {
	  e.preventDefault();
	  try {
		if (!window.confirm("Are you sure you want to delete this post?")) return;
  
		const res = await fetch(`/api/posts/${post._id}`, {
		  method: "DELETE",
		});
		const data = await res.json();
		if (data.error) {
		  showToast("Error", data.error, "error");
		  return;
		}
		showToast("Success", "Post deleted", "success");
		setPosts((prev) => ({
		  ...prev,
		  posts: prev.posts.filter((p) => p._id !== post._id),
		}));
	  } catch (error) {
		showToast("Error", error.message, "error");
	  }
	};
  
	if (!user) return null;
  
	// Ensure replies is always an array
	const replies = Array.isArray(post.replies) ? post.replies : [];
  
	return (
	  <Box mb={4} py={5}>
		<Link to={`/${user.username}/post/${post._id}`}>
		  <Flex gap={3}>
			<Flex flexDirection="column" alignItems="center">
			  <Avatar
				size="md"
				name={user.name}
				src={user.profilePic}
				onClick={(e) => {
				  e.preventDefault();
				  navigate(`/${user.username}`);
				}}
				cursor="pointer"
			  />
			  <Box w="1px" h="full" bg="gray.light" my={2}></Box>
			  <Box position="relative" w="full">
				{replies.length === 0 && <Text textAlign="center">🥱</Text>}
				{replies.slice(0, 3).map((reply, index) => (
				  <Avatar
					key={index}
					size="xs"
					name={reply.username || "Unknown"}
					src={reply.userProfilePic || ""}
					position="absolute"
					top={index === 0 ? "0px" : undefined}
					left={index === 0 ? "15px" : index === 2 ? "4px" : undefined}
					bottom={index !== 0 ? "0px" : undefined}
					right={index === 1 ? "-5px" : undefined}
					padding="2px"
				  />
				))}
			  </Box>
			</Flex>
  
			<Flex flex={1} flexDirection="column" gap={2}>
			  <Flex justifyContent="space-between" w="full">
				<Flex w="full" alignItems="center">
				  <Text
					fontSize={isBelow500px ? "xs" : "sm"}
					fontWeight="bold"
					cursor="pointer"
					onClick={(e) => {
					  e.preventDefault();
					  navigate(`/${user.username}`);
					}}
				  >
					{user.username}
				  </Text>
				  {user.isAdmin && <Image src="/verified.png" w={4} h={4} ml={1} />}
				</Flex>
				<Flex gap={4} alignItems="center">
				  <Text fontSize={isBelow500px ? "xs" : "sm"} color="gray.light">
					{formatDistanceToNow(new Date(post.createdAt))} ago
				  </Text>
				  {currentUser?._id === user._id && (
					<DeleteIcon boxSize={4} onClick={handleDeletePost} cursor="pointer" />
				  )}
				</Flex>
			  </Flex>
  
			  <Text fontSize={isBelow500px ? "xs" : "sm"}>{post.text}</Text>
  
			  {post.media && (
				<Box borderRadius={6} overflow="hidden" border="1px solid" borderColor="gray.light">
				  {post.mediaType === "image" && <Image src={post.media} w="full" />}
				  {post.mediaType === "video" && (
					<video src={post.media} controls style={{ width: "100%" }} />
				  )}
				  {post.mediaType === "audio" && <audio src={post.media} controls />}
				  {post.mediaType === "document" && (
					<Text p={2}>Document: {post.media.split("/").pop()}</Text>
				  )}
				</Box>
			  )}
			</Flex>
		  </Flex>
		</Link>
  
		{/* Actions and Replies Section */}
		<Flex flexDirection="column" gap={2} mt={2}>
		  <Actions post={post} />
		  {/* Optionally display replies inline on larger screens */}
		  {!isBelow500px && replies.length > 0 && (
			<Box mt={2}>
			  {replies.map((reply, index) => (
				<Flex key={index} gap={2} alignItems="center">
				  <Avatar size="xs" name={reply.username || "Unknown"} src={reply.userProfilePic || ""} />
				  <Text fontSize="sm" fontWeight="bold">{reply.username || "Unknown"}</Text>
				  <Text fontSize="sm">{reply.text}</Text>
				</Flex>
			  ))}
			</Box>
		  )}
		</Flex>
	  </Box>
	);
  };
  
  export default Post;