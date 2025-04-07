import {
	Avatar,
	Box,
	Flex,
	Tab,
	TabList,
	TabPanel,
	TabPanels,
	Tabs,
	Text,
	VStack,
	Button,
	useMediaQuery,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Post from "../components/Post";
import UserHeader from "../components/UserHeader";
import useShowToast from "../hooks/useShowToast";
import { useRecoilState, useSetRecoilState, useRecoilValue } from "recoil";
import postsAtom from "../atoms/postsAtom";
import userAtom from "../atoms/userAtom";

const UserPage = () => {
	const { username } = useParams();
	const [user, setUser] = useState(null);
	const showToast = useShowToast();
	const [loading, setLoading] = useState(true);
	const [fetchingPosts, setFetchingPosts] = useState(true);
	const [postsState, setPostsState] = useRecoilState(postsAtom);
	const currentUser = useRecoilValue(userAtom);
	const setCurrentUser = useSetRecoilState(userAtom);
	const navigate = useNavigate();
	const [isBelow500px] = useMediaQuery("(max-width: 500px)");

	useEffect(() => {
		const getUser = async () => {
			setLoading(true);
			try {
				const res = await fetch(`/api/users/profile/${username}`);
				const data = await res.json();
				if (data.error) {
					showToast("Error", data.error, "error");
					navigate("/");
					return;
				}
				setUser(data);
			} catch (error) {
				showToast("Error", error.message, "error");
				navigate("/");
			} finally {
				setLoading(false);
			}
		};

		const getPosts = async () => {
			setFetchingPosts(true);
			try {
				const res = await fetch(`/api/posts/user/${username}`);
				const data = await res.json();
				if (data.error) {
					showToast("Error", data.error, "error");
					return;
				}
				setPostsState((prev) => ({
					...prev,
					posts: data,
				}));
			} catch (error) {
				showToast("Error", error.message, "error");
			} finally {
				setFetchingPosts(false);
			}
		};

		getUser();
		getPosts();
	}, [username, showToast, setPostsState, navigate]);

	const handleLogout = () => {
		localStorage.removeItem("user-threads");
		setCurrentUser(null);
		navigate("/auth");
		showToast("Success", "Logged out successfully", "success");
	};

	if (loading) {
		return (
			<Flex justifyContent={"center"} alignItems={"center"} h={"200px"}>
				<Text>Loading...</Text>
			</Flex>
		);
	}

	if (!user && !loading) {
		return (
			<Flex justifyContent={"center"} alignItems={"center"} h={"200px"}>
				<Text>User not found</Text>
			</Flex>
		);
	}

	return (
		<VStack spacing={4} align="stretch">
			<UserHeader user={user} />
			<Tabs isFitted variant="enclosed">
				<TabList>
					<Tab>Posts</Tab>
					<Tab>Replies</Tab>
					<Tab>Dashboard</Tab>
				</TabList>
				<TabPanels>
					<TabPanel>
						{!fetchingPosts && postsState.posts.length === 0 && (
							<Text>No posts yet</Text>
						)}
						{fetchingPosts && (
							<Flex justifyContent={"center"} alignItems={"center"} h={"100px"}>
								<Text>Loading posts...</Text>
							</Flex>
						)}
						{!fetchingPosts && postsState.posts && (
							<VStack spacing={4}>
								{postsState.posts.map((post) => (
									<Post key={post._id} post={post} postedBy={post.postedBy} />
								))}
							</VStack>
						)}
					</TabPanel>
					<TabPanel>
						<Text>Replies feature coming soon!</Text>
					</TabPanel>
					<TabPanel>
						<VStack spacing={4}>
							<Text fontSize="lg" fontWeight="bold">
								Dashboard
							</Text>
							<Text>Welcome to your dashboard, {user.username}!</Text>
							<Text>Here you can view analytics or manage your account.</Text>
							{isBelow500px && currentUser?._id === user._id && (
								<Button colorScheme="red" onClick={handleLogout}>
									Logout
								</Button>
							)}
						</VStack>
					</TabPanel>
				</TabPanels>
			</Tabs>
		</VStack>
	);
};

export default UserPage;