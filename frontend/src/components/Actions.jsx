import {
	Box, Button, Flex, FormControl, Input, Modal, ModalBody, ModalCloseButton,
	ModalContent, ModalFooter, ModalHeader, ModalOverlay, Text, useDisclosure,
	VStack, useMediaQuery, Avatar,
  } from "@chakra-ui/react";
  import { useState } from "react";
  import { useRecoilState, useRecoilValue } from "recoil";
  import userAtom from "../atoms/userAtom";
  import useShowToast from "../hooks/useShowToast";
  import postsAtom from "../atoms/postsAtom";
  import { FaHeart, FaRegHeart, FaComment, FaRetweet, FaShare } from "react-icons/fa";
  
  const Actions = ({ post }) => {
	const user = useRecoilValue(userAtom);
	const [liked, setLiked] = useState(post?.likes?.includes(user?._id) || false);
	const [postsState, setPostsState] = useRecoilState(postsAtom);
	const [isLiking, setIsLiking] = useState(false);
	const [isReplying, setIsReplying] = useState(false);
	const [isCommenting, setIsCommenting] = useState(false);
	const [reply, setReply] = useState("");
	const [comment, setComment] = useState("");
	const showToast = useShowToast();
	const { isOpen, onOpen, onClose } = useDisclosure();
	const [isSmallScreen] = useMediaQuery("(max-width: 500px)");
  
	const handleLikeAndUnlike = async () => {
	  if (!user) return showToast("Error", "You must be logged in to like a post", "error");
	  if (isLiking) return;
	  setIsLiking(true);
	  try {
		const res = await fetch(`/api/posts/like/${post._id}`, {
		  method: "PUT",
		  headers: { "Content-Type": "application/json" },
		});
		const data = await res.json();
		if (data.error) return showToast("Error", data.error, "error");
		setPostsState((prev) => ({
		  ...prev,
		  posts: prev.posts.map((p) =>
			p._id === post._id
			  ? { ...p, likes: liked ? p.likes.filter((id) => id !== user._id) : [...p.likes, user._id] }
			  : p
		  ),
		}));
		setLiked(!liked);
	  } catch (error) {
		showToast("Error", error.message, "error");
	  } finally {
		setIsLiking(false);
	  }
	};
  
	const handleReply = async () => {
	  if (!user) return showToast("Error", "You must be logged in to reply", "error");
	  if (isReplying || !reply.trim()) return;
	  setIsReplying(true);
	  try {
		const res = await fetch(`/api/posts/post/${post._id}/reply`, {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({ text: reply, postedBy: user._id }),
		});
		const data = await res.json();
		if (data.error) return showToast("Error", data.error, "error");
		setPostsState((prev) => ({
		  ...prev,
		  posts: prev.posts.map((p) =>
			p._id === post._id ? { ...p, replies: [...p.replies, { ...data, username: user.username, userProfilePic: user.profilePic }] } : p
		  ),
		}));
		setReply("");
		showToast("Success", "Reply posted successfully", "success");
	  } catch (error) {
		showToast("Error", error.message, "error");
	  } finally {
		setIsReplying(false);
	  }
	};
  
	const handleComment = async () => {
		if (!user) return showToast("Error", "You must be logged in to comment", "error");
		if (isCommenting || !comment.trim()) return;
		setIsCommenting(true);
		try {
		  console.log("Posting comment to:", `/api/posts/post/${post._id}/comment`); // Debug log
		  const res = await fetch(`/api/posts/post/${post._id}/comment`, { // Corrected endpoint
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ text: comment }),
		  });
		  const data = await res.json();
		  console.log("Response:", data); // Debug log
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
		  showToast("Success", "Comment posted successfully", "success");
		  setComment("");
		} catch (error) {
		  showToast("Error", error.message, "error");
		  console.error("Comment error:", error); // Debug log
		} finally {
		  setIsCommenting(false);
		}
	  };
  
	const handleRepost = async () => {
	  if (!user) return showToast("Error", "You must be logged in to repost", "error");
	  try {
		const res = await fetch(`/api/posts/repost/${post._id}`, {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		});
		const data = await res.json();
		if (data.error) return showToast("Error", data.error, "error");
		setPostsState((prev) => ({ ...prev, posts: [data, ...prev.posts] }));
		showToast("Success", "Post reposted successfully", "success");
	  } catch (error) {
		showToast("Error", error.message, "error");
	  }
	};
  
	const handleShare = () => {
	  const shareUrl = `${window.location.origin}/${user.username}/post/${post._id}`;
	  navigator.clipboard.writeText(shareUrl);
	  showToast("Success", "Post URL copied to clipboard", "success");
	};
  
	return (
	  <Flex flexDirection="column">
		<Flex gap={3} my={2} onClick={(e) => e.preventDefault()}>
		  {liked ? (
			<FaHeart size={20} color="rgb(237, 73, 86)" onClick={handleLikeAndUnlike} cursor="pointer" />
		  ) : (
			<FaRegHeart size={20} onClick={handleLikeAndUnlike} cursor="pointer" />
		  )}
		  <FaComment size={20} onClick={onOpen} cursor="pointer" />
		  <FaRetweet size={20} onClick={handleRepost} cursor="pointer" />
		  <FaShare size={20} onClick={handleShare} cursor="pointer" />
		</Flex>
  
		<Flex gap={2} alignItems="center">
		  <Text color="gray.light" fontSize="sm">{post.comments?.length || 0} comments</Text>
		  <Box w={0.5} h={0.5} borderRadius="full" bg="gray.light" />
		  <Text color="gray.light" fontSize="sm">{post.replies?.length || 0} replies</Text>
		  <Box w={0.5} h={0.5} borderRadius="full" bg="gray.light" />
		  <Text color="gray.light" fontSize="sm">{post.likes?.length || 0} likes</Text>
		</Flex>
  
		{isSmallScreen && isOpen ? (
		  <Box mt={2} p={3} bg="white" borderRadius="lg" boxShadow="md" maxH="70vh" overflowY="auto">
			<Flex justify="space-between" align="center" mb={2}>
			  <Text fontSize="md" fontWeight="bold">Comments</Text>
			  <Button size="xs" onClick={onClose}>Close</Button>
			</Flex>
			<VStack spacing={3} align="stretch">
			  {(post.comments || []).map((c) => (
				<Flex key={c._id} gap={2} alignItems="flex-start">
				  <Avatar size="sm" src={c.userProfilePic} name={c.username} />
				  <Box>
					<Text fontSize="sm" fontWeight="bold">{c.username}</Text>
					<Text fontSize="sm">{c.text}</Text>
				  </Box>
				</Flex>
			  ))}
			  {(post.replies || []).map((r) => (
				<Flex key={r._id} gap={2} alignItems="flex-start" pl={4}>
				  <Avatar size="xs" src={r.userProfilePic} name={r.username} />
				  <Box>
					<Text fontSize="xs" fontWeight="bold">{r.username}</Text>
					<Text fontSize="xs">{r.text}</Text>
				  </Box>
				</Flex>
			  ))}
			</VStack>
			<FormControl mt={3}>
			  <Input
				placeholder="Add a comment..."
				value={comment}
				onChange={(e) => setComment(e.target.value)}
				size="sm"
			  />
			  <Button mt={2} size="sm" colorScheme="blue" onClick={handleComment} isLoading={isCommenting}>
				Post
			  </Button>
			</FormControl>
		  </Box>
		) : (
		  <Modal isOpen={isOpen} onClose={onClose}>
			<ModalOverlay />
			<ModalContent>
			  <ModalHeader>Comments & Replies</ModalHeader>
			  <ModalCloseButton />
			  <ModalBody>
				<VStack spacing={3}>
				  {(post.comments || []).map((c) => (
					<Flex key={c._id} gap={2}>
					  <Avatar size="sm" src={c.userProfilePic} name={c.username} />
					  <Box>
						<Text fontSize="sm" fontWeight="bold">{c.username}</Text>
						<Text fontSize="sm">{c.text}</Text>
					  </Box>
					</Flex>
				  ))}
				  {(post.replies || []).map((r) => (
					<Flex key={r._id} gap={2} pl={4}>
					  <Avatar size="xs" src={r.userProfilePic} name={r.username} />
					  <Box>
						<Text fontSize="xs" fontWeight="bold">{r.username}</Text>
						<Text fontSize="xs">{r.text}</Text>
					  </Box>
					</Flex>
				  ))}
				</VStack>
				<FormControl mt={4}>
				  <Input
					placeholder="Add a comment..."
					value={comment}
					onChange={(e) => setComment(e.target.value)}
				  />
				  <Button mt={2} colorScheme="blue" onClick={handleComment} isLoading={isCommenting}>
					Post
				  </Button>
				</FormControl>
			  </ModalBody>
			</ModalContent>
		  </Modal>
		)}
	  </Flex>
	);
  };
  
  export default Actions;