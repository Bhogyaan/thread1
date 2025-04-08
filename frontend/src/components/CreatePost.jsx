import {
	Button, CloseButton, Flex, FormControl, Image, Input, Modal, ModalBody,
	ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay,
	Text, Textarea, useColorModeValue, Select, Box, useToast
  } from "@chakra-ui/react";
  import { useRef, useState } from "react";
  import usePreviewImg from "../hooks/usePreviewImg";
  import { BsFillImageFill, BsFillCameraVideoFill, BsFillMicFill, BsFileEarmarkTextFill } from "react-icons/bs";
  import { useRecoilState, useRecoilValue } from "recoil";
  import userAtom from "../atoms/userAtom";
  import useShowToast from "../hooks/useShowToast";
  import postsAtom from "../atoms/postsAtom";
  import { useNavigate } from "react-router-dom";
  
  const MAX_CHAR = 500;
  const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB for most files
  const MAX_DOC_SIZE = 2 * 1024 * 1024 * 1024; // 2GB for documents
  const MAX_VIDEO_DURATION = 180; // 3 minutes for posts
  const MAX_STORY_DURATION = 30; // 30 seconds for stories
  
  const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/heic'];
  const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/x-matroska', 'video/avi', 'video/3gpp', 'video/quicktime'];
  const SUPPORTED_AUDIO_TYPES = ['audio/mpeg', 'audio/aac', 'audio/x-m4a', 'audio/opus', 'audio/wav'];
  const SUPPORTED_DOC_TYPES = [
	'application/pdf', 
	'application/msword', 
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.ms-powerpoint',
	'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'text/plain',
	'application/rtf',
	'application/zip'
  ];
  
  const CreatePost = ({ onPostCreated }) => {
	const [postText, setPostText] = useState("");
	const { handleImageChange, mediaUrl, setMediaUrl, mediaType } = usePreviewImg();
	const imageRef = useRef(null);
	const [remainingChar, setRemainingChar] = useState(MAX_CHAR);
	const user = useRecoilValue(userAtom);
	const showToast = useShowToast();
	const [loading, setLoading] = useState(false);
	const [posts, setPosts] = useRecoilState(postsAtom);
	const [postType, setPostType] = useState("post");
	const navigate = useNavigate();
	const toast = useToast();
	const [selectedFile, setSelectedFile] = useState(null);
  
	const handleTextChange = (e) => {
	  const inputText = e.target.value;
	  if (inputText.length > MAX_CHAR) {
		setPostText(inputText.slice(0, MAX_CHAR));
		setRemainingChar(0);
	  } else {
		setPostText(inputText);
		setRemainingChar(MAX_CHAR - inputText.length);
	  }
	};
  
	const validateFile = (file) => {
	  if (!file) return true;
  
	  // Check file size based on type
	  const maxSize = SUPPORTED_DOC_TYPES.includes(file.type) ? MAX_DOC_SIZE : MAX_FILE_SIZE;
	  if (file.size > maxSize) {
		showToast("Error", `File size exceeds limit (${maxSize / (1024 * 1024)}MB)`, "error");
		return false;
	  }
  
	  // Check file type
	  const supportedTypes = [
		...SUPPORTED_IMAGE_TYPES,
		...SUPPORTED_VIDEO_TYPES,
		...SUPPORTED_AUDIO_TYPES,
		...SUPPORTED_DOC_TYPES
	  ];
  
	  if (!supportedTypes.includes(file.type)) {
		showToast("Error", "Unsupported file format", "error");
		return false;
	  }
  
	  return true;
	};
  
	const handleFileChange = async (e) => {
	  const file = e.target.files[0];
	  if (!file) return;
  
	  if (!validateFile(file)) {
		return;
	  }
  
	  setSelectedFile(file);
	  await handleImageChange(e);
	};
  
	const handleCreatePost = async () => {
	  if (!postText.trim() && !mediaUrl) {
		showToast("Error", "Post content or media is required", "error");
		return;
	  }
  
	  setLoading(true);
	  try {
		const endpoint = postType === "post" ? "/api/posts/create" : "/api/posts/story";
		const res = await fetch(endpoint, {
		  method: "POST",
		  headers: { "Content-Type": "application/json" },
		  body: JSON.stringify({
			postedBy: user._id,
			text: postText,
			media: mediaUrl,
			mediaType: mediaUrl ? mediaType : null,
		  }),
		});
  
		const data = await res.json();
		if (data.error) {
		  showToast("Error", data.error, "error");
		  return;
		}
		showToast("Success", `${postType} created successfully`, "success");
  
		if (postType === "post") {
		  setPosts((prev) => ({ ...prev, posts: [data, ...prev.posts] }));
		} else {
		  setPosts((prev) => ({ ...prev, stories: prev.stories ? [data, ...prev.stories] : [data] }));
		}
  
		setPostText("");
		setMediaUrl("");
		setSelectedFile(null);
		if (onPostCreated) onPostCreated();
		navigate("/");
	  } catch (error) {
		showToast("Error", error.message, "error");
	  } finally {
		setLoading(false);
	  }
	};
  
	return (
	  <Box p={4}>
		<Text fontSize="xl" fontWeight="bold" mb={4}>
		  Create {postType === "post" ? "Post" : "Story"}
		</Text>
		<FormControl>
		  <Select mb={2} value={postType} onChange={(e) => setPostType(e.target.value)}>
			<option value="post">Post</option>
			<option value="story">Story</option>
		  </Select>
		  <Textarea
			placeholder="Content goes here.."
			onChange={handleTextChange}
			value={postText}
		  />
		  <Text fontSize="xs" fontWeight="bold" textAlign="right" m={1} color="gray.800">
			{remainingChar}/{MAX_CHAR}
		  </Text>
		  
		  <Input 
			type="file" 
			hidden 
			ref={imageRef} 
			onChange={handleFileChange} 
			accept={[
			  ...SUPPORTED_IMAGE_TYPES,
			  ...SUPPORTED_VIDEO_TYPES,
			  ...SUPPORTED_AUDIO_TYPES,
			  ...SUPPORTED_DOC_TYPES
			].join(',')}
		  />
		  
		  <Flex gap={2} mb={4}>
			<BsFillImageFill 
			  style={{ cursor: "pointer" }} 
			  size={16} 
			  onClick={() => imageRef.current.click()} 
			  title="Image (JPG, PNG, GIF, HEIC)"
			/>
			<BsFillCameraVideoFill 
			  style={{ cursor: "pointer" }} 
			  size={16} 
			  onClick={() => imageRef.current.click()} 
			  title="Video (MP4, MKV, AVI, 3GP, MOV)"
			/>
			<BsFillMicFill 
			  style={{ cursor: "pointer" }} 
			  size={16} 
			  onClick={() => imageRef.current.click()} 
			  title="Audio (MP3, AAC, M4A, OPUS, WAV)"
			/>
			<BsFileEarmarkTextFill 
			  style={{ cursor: "pointer" }} 
			  size={16} 
			  onClick={() => imageRef.current.click()} 
			  title="Documents (PDF, DOC, XLS, PPT, TXT, etc.)"
			/>
		  </Flex>
		  
		  {selectedFile && (
			<Text fontSize="sm" color="gray.600">
			  Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
			</Text>
		  )}
		</FormControl>
		
		{mediaUrl && (
		  <Flex mt={5} w="full" position="relative">
			{mediaType === "image" && <Image src={mediaUrl} alt="Selected media" />}
			{mediaType === "video" && <video src={mediaUrl} controls style={{ width: "100%" }} />}
			{mediaType === "audio" && <audio src={mediaUrl} controls />}
			{mediaType === "document" && (
			  <Box p={4} border="1px" borderColor="gray.200" borderRadius="md">
				<Text fontWeight="bold">Document Preview</Text>
				<Text>{selectedFile?.name}</Text>
				<Text fontSize="sm">{Math.round(selectedFile?.size / 1024)} KB</Text>
			  </Box>
			)}
			<CloseButton 
			  onClick={() => {
				setMediaUrl("");
				setSelectedFile(null);
			  }} 
			  bg="gray.800" 
			  position="absolute" 
			  top={2} 
			  right={2} 
			/>
		  </Flex>
		)}
		
		<Button 
		  mt={4} 
		  colorScheme="blue" 
		  onClick={handleCreatePost} 
		  isLoading={loading}
		  isDisabled={!postText.trim() && !mediaUrl}
		>
		  {postType === "post" ? "Post" : "Share Story"}
		</Button>
	  </Box>
	);
  };
  
  export default CreatePost;