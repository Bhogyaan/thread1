import {
	Button,
	CloseButton,
	Flex,
	FormControl,
	Image,
	Input,
	Modal,
	ModalBody,
	ModalCloseButton,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	Text,
	Textarea,
	useColorModeValue,
	useDisclosure,
	Select,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import { useRef, useState } from "react";
import usePreviewImg from "../hooks/usePreviewImg";
import { BsFillImageFill, BsFillCameraVideoFill, BsFillMicFill, BsFileEarmarkTextFill } from "react-icons/bs";
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import useShowToast from "../hooks/useShowToast";
import postsAtom from "../atoms/postsAtom";
import { useNavigate, useParams } from "react-router-dom";

const MAX_CHAR = 500;

const CreatePost = () => {
	const { isOpen, onOpen, onClose } = useDisclosure();
	const [postText, setPostText] = useState("");
	const { handleImageChange, mediaUrl, setMediaUrl, mediaType } = usePreviewImg();
	const imageRef = useRef(null);
	const [remainingChar, setRemainingChar] = useState(MAX_CHAR);
	const user = useRecoilValue(userAtom);
	const showToast = useShowToast();
	const [loading, setLoading] = useState(false);
	const [posts, setPosts] = useRecoilState(postsAtom);
	const { username } = useParams();
	const [postType, setPostType] = useState("post");
	const navigate = useNavigate(); // Added for redirection

	const handleTextChange = (e) => {
		const inputText = e.target.value;

		if (inputText.length > MAX_CHAR) {
			const truncatedText = inputText.slice(0, MAX_CHAR);
			setPostText(truncatedText);
			setRemainingChar(0);
		} else {
			setPostText(inputText);
			setRemainingChar(MAX_CHAR - inputText.length);
		}
	};

	const handleCreatePost = async () => {
		setLoading(true);
		try {
			const endpoint = postType === "post" ? "/api/posts/create" : "/api/posts/story";
			const res = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
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

			// Update postsAtom based on postType
			if (postType === "post") {
				setPosts((prev) => ({
					...prev,
					posts: [data, ...prev.posts], // Add new post to the posts array
				}));
			} else if (postType === "story") {
				setPosts((prev) => ({
					...prev,
					stories: [data, ...prev.stories], // Add new story to the stories array
				}));
			}

			// Reset form and redirect to home page
			onClose();
			setPostText("");
			setMediaUrl("");
			navigate("/"); // Redirect to home page
		} catch (error) {
			showToast("Error", error.message, "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Button
				position={"fixed"}
				bottom={10}
				right={5}
				bg={useColorModeValue("gray.300", "gray.dark")}
				onClick={onOpen}
				size={{ base: "sm", sm: "md" }}
			>
				<AddIcon />
			</Button>

			<Modal isOpen={isOpen} onClose={onClose}>
				<ModalOverlay />
				<ModalContent>
					<ModalHeader>Create {postType === "post" ? "Post" : "Story"}</ModalHeader>
					<ModalCloseButton />
					<ModalBody pb={6}>
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
							<Text fontSize="xs" fontWeight="bold" textAlign={"right"} m={"1"} color={"gray.800"}>
								{remainingChar}/{MAX_CHAR}
							</Text>

							<Input type="file" hidden ref={imageRef} onChange={handleImageChange} />
							<Flex gap={2}>
								<BsFillImageFill
									style={{ marginLeft: "5px", cursor: "pointer" }}
									size={16}
									onClick={() => imageRef.current.click()}
								/>
								<BsFillCameraVideoFill
									style={{ cursor: "pointer" }}
									size={16}
									onClick={() => imageRef.current.click()}
								/>
								<BsFillMicFill
									style={{ cursor: "pointer" }}
									size={16}
									onClick={() => imageRef.current.click()}
								/>
								<BsFileEarmarkTextFill
									style={{ cursor: "pointer" }}
									size={16}
									onClick={() => imageRef.current.click()}
								/>
							</Flex>
						</FormControl>

						{mediaUrl && (
							<Flex mt={5} w={"full"} position={"relative"}>
								{mediaType === "image" && <Image src={mediaUrl} alt="Selected media" />}
								{mediaType === "video" && <video src={mediaUrl} controls style={{ width: "100%" }} />}
								{mediaType === "audio" && <audio src={mediaUrl} controls />}
								{mediaType === "document" && <Text>Document Preview (Unsupported)</Text>}
								<CloseButton
									onClick={() => setMediaUrl("")}
									bg={"gray.800"}
									position={"absolute"}
									top={2}
									right={2}
								/>
							</Flex>
						)}
					</ModalBody>

					<ModalFooter>
						<Button colorScheme="blue" mr={3} onClick={handleCreatePost} isLoading={loading}>
							{postType === "post" ? "Post" : "Share Story"}
						</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	);
};

export default CreatePost;