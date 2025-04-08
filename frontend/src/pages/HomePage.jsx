import {
	Box,
	Flex,
	Spinner,
	VStack,
	Button,
	useMediaQuery,
	Input,
	FormControl,
	Text,
	FormLabel,
  } from "@chakra-ui/react";
  import { useEffect, useState } from "react";
  import Post from "../components/Post";
  import { useRecoilState, useRecoilValue } from "recoil";
  import postsAtom from "../atoms/postsAtom";
  import userAtom from "../atoms/userAtom";
  import SuggestedUsers from "../components/SuggestedUsers";
  import Story from "../components/Story";
  import { AddIcon } from "@chakra-ui/icons";
  import { useNavigate } from "react-router-dom";
  import useShowToast from "../hooks/useShowToast";
  
  const HomePage = () => {
	const [postsState, setPostsState] = useRecoilState(postsAtom);
	const user = useRecoilValue(userAtom);
	const [loading, setLoading] = useState(true);
	const [isLargeScreen] = useMediaQuery("(min-width: 501px)");
	const [text, setText] = useState("");
	const [media, setMedia] = useState(null); // For file upload
	const [mediaType, setMediaType] = useState(""); // To track media type
	const [isPosting, setIsPosting] = useState(false); // Loading state for post creation
	const navigate = useNavigate();
	const showToast = useShowToast();
  
	useEffect(() => {
	  const getFeedPosts = async () => {
		setLoading(true);
		try {
		  const res = await fetch("/api/posts/feed");
		  const data = await res.json();
		  if (data.error) {
			showToast("Error", data.error, "error");
			return;
		  }
		  setPostsState((prev) => ({ ...prev, posts: data }));
		} catch (error) {
		  showToast("Error", error.message, "error");
		} finally {
		  setLoading(false);
		}
	  };
  
	  if (user) getFeedPosts();
	  else setLoading(false); // Stop loading if no user
	}, [user, setPostsState, showToast]);
  
	const handleMediaChange = (e) => {
	  const file = e.target.files[0];
	  if (!file) return;
  
	  const validImageTypes = ["image/jpeg", "image/png", "image/gif"];
	  const validVideoTypes = ["video/mp4", "video/webm"];
	  const validAudioTypes = ["audio/mpeg", "audio/wav"];
	  const validDocTypes = ["application/pdf", "text/plain"];
  
	  if (validImageTypes.includes(file.type)) {
		setMediaType("image");
	  } else if (validVideoTypes.includes(file.type)) {
		setMediaType("video");
	  } else if (validAudioTypes.includes(file.type)) {
		setMediaType("audio");
	  } else if (validDocTypes.includes(file.type)) {
		setMediaType("document");
	  } else {
		showToast("Error", "Unsupported file type", "error");
		return;
	  }
  
	  setMedia(file);
	};
  
	const handleCreatePost = async () => {
	  if (!user) {
		showToast("Error", "You must be logged in to create a post", "error");
		return;
	  }
	  if (!text.trim() && !media) {
		showToast("Error", "Text or media is required", "error");
		return;
	  }
  
	  setIsPosting(true);
	  try {
		const formData = new FormData();
		formData.append("postedBy", user._id);
		formData.append("text", text);
		if (media) {
		  formData.append("media", media);
		  formData.append("mediaType", mediaType);
		}
  
		const res = await fetch("/api/posts/create", {
		  method: "POST",
		  body: formData, // Use FormData for file uploads
		});
		const data = await res.json();
		if (data.error) {
		  showToast("Error", data.error, "error");
		  return;
		}
  
		setPostsState((prev) => ({ ...prev, posts: [data, ...(prev.posts || [])] }));
		setText("");
		setMedia(null);
		setMediaType("");
		showToast("Success", "Post created successfully", "success");
	  } catch (error) {
		showToast("Error", error.message, "error");
	  } finally {
		setIsPosting(false);
	  }
	};
  
	return (
	  <>
		{/* Post Creation Form - Only on Large Screens */}
		<Box bg="gray.800" p={2} position="sticky" top={0} zIndex={10}>
		  {isLargeScreen ? (
			<Flex justify="space-between" align="center">
			  <Text color="white" fontWeight="bold">Home</Text>
			  <VStack spacing={2} align="stretch" w="50%">
				<FormControl>
				  <Input
					placeholder="What's on your mind?"
					value={text}
					onChange={(e) => setText(e.target.value)}
					bg="white"
					color="black"
					size="sm"
				  />
				  <Flex gap={2} mt={2}>
					<FormLabel
					  htmlFor="media-upload"
					  bg="blue.500"
					  color="white"
					  p={2}
					  borderRadius="md"
					  cursor="pointer"
					  fontSize="sm"
					>
					  Add Media
					</FormLabel>
					<Input
					  id="media-upload"
					  type="file"
					  accept="image/*,video/*,audio/*,.pdf,.txt"
					  onChange={handleMediaChange}
					  display="none"
					/>
					<Button
					  leftIcon={<AddIcon />}
					  colorScheme="blue"
					  size="sm"
					  onClick={handleCreatePost}
					  isLoading={isPosting}
					>
					  Post
					</Button>
				  </Flex>
				  {media && (
					<Text fontSize="xs" color="gray.300" mt={1}>
					  Selected: {media.name} ({mediaType})
					</Text>
				  )}
				</FormControl>
			  </VStack>
			</Flex>
		  ) : (
			<Flex justify="center">
			  <Text color="white" fontWeight="bold">Home</Text>
			</Flex>
		  )}
		</Box>
  
		<Flex gap="10" alignItems="flex-start" mt={isLargeScreen ? 4 : 0}>
		  <Box flex={70}>
			{/* Stories */}
			{!loading && postsState.stories?.length > 0 && (
			  <Flex gap={4} mb={6} overflowX="auto">
				{postsState.stories.map((story) => (
				  <Story key={story._id} story={story} />
				))}
			  </Flex>
			)}
  
			{/* Posts */}
			{!loading && postsState.posts?.length === 0 && <h1>No posts available.</h1>}
			{loading && (
			  <Flex justify="center">
				<Spinner size="xl" />
			  </Flex>
			)}
			{!loading && postsState.posts && (
			  <VStack spacing={4}>
				{postsState.posts.map((post) => (
				  <Post key={post._id} post={post} postedBy={post.postedBy} />
				))}
			  </VStack>
			)}
		  </Box>
  
		  {/* Suggested Users */}
		  {user && (
			<Box flex={30} display={{ base: "none", md: "block" }} position="sticky" top="10">
			  <SuggestedUsers />
			</Box>
		  )}
		</Flex>
	  </>
	);
  };
  
  export default HomePage;