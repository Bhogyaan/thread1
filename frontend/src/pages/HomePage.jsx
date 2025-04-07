import { Box, Flex, Spinner, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import Post from "../components/Post";
import { useRecoilState, useRecoilValue } from "recoil";
import postsAtom from "../atoms/postsAtom";
import userAtom from "../atoms/userAtom";
import SuggestedUsers from "../components/SuggestedUsers";
import Story from "../components/Story";

const HomePage = () => {
	const [postsState, setPostsState] = useRecoilState(postsAtom);
	const user = useRecoilValue(userAtom);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const getFeedPosts = async () => {
			setLoading(true);
			try {
				const res = await fetch("/api/posts/feed");
				const data = await res.json();
				if (data.error) {
					console.error(data.error);
					return;
				}
				// Update posts in the atom
				setPostsState((prev) => ({
					...prev,
					posts: data, // Assuming data is an array of posts
				}));
			} catch (error) {
				console.error(error);
			} finally {
				setLoading(false);
			}
		};

		if (user) {
			getFeedPosts();
		}
	}, [user, setPostsState]);

	return (
		<Flex gap="10" alignItems={"flex-start"}>
			<Box flex={70}>
				{!loading && postsState.stories.length > 0 && (
					<Flex gap={4} mb={6} overflowX="auto">
						{postsState.stories.map((story) => (
							<Story key={story._id} story={story} />
						))}
					</Flex>
				)}
				{!loading && postsState.posts.length === 0 && <h1>No posts available.</h1>}
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
			{user && (
				<Box flex={30} display={{ base: "none", md: "block" }} position="sticky" top="10">
					<SuggestedUsers />
				</Box>
			)}
		</Flex>
	);
};

export default HomePage;