import {
	Avatar, Box, Flex, Tab, TabList, TabPanel, TabPanels, Tabs, Text, VStack, Button,
	useMediaQuery, Stat, StatLabel, StatNumber,
  } from "@chakra-ui/react";
  import { useEffect, useState } from "react";
  import { useParams, useNavigate } from "react-router-dom";
  import Post from "../components/Post";
  import UserHeader from "../components/UserHeader";
  import useShowToast from "../hooks/useShowToast";
  import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
  import postsAtom from "../atoms/postsAtom";
  import userAtom from "../atoms/userAtom";
  import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, BarChart, Bar, Tooltip, Legend } from "recharts";
  
  const UserPage = () => {
	const { username } = useParams();
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [fetchingPosts, setFetchingPosts] = useState(true);
	const [postsState, setPostsState] = useRecoilState(postsAtom);
	const currentUser = useRecoilValue(userAtom);
	const setCurrentUser = useSetRecoilState(userAtom);
	const showToast = useShowToast();
	const navigate = useNavigate();
	const [isBelow500px] = useMediaQuery("(max-width: 500px)");
  
	useEffect(() => {
	  const getUserAndStats = async () => {
		try {
		  const userRes = await fetch(`/api/users/profile/${username}`);
		  const userData = await userRes.json();
  
		  if (!userRes.ok) {
			throw new Error(userData.error || "User profile not found");
		  }
  
		  let statsData = {};
		  try {
			const statsRes = await fetch(`/api/users/stats/${username}`);
			if (statsRes.ok) {
			  statsData = await statsRes.json();
			} else {
			  console.warn(`Stats endpoint returned ${statsRes.status}, using default stats`);
			  statsData = { totalLikes: 0, totalPosts: 0, totalComments: 0, growthData: [], activityData: [] };
			}
		  } catch (statsError) {
			console.warn("Stats endpoint not available:", statsError.message);
			statsData = { totalLikes: 0, totalPosts: 0, totalComments: 0, growthData: [], activityData: [] };
		  }
  
		  setUser({ ...userData, stats: statsData });
		} catch (error) {
		  showToast("Error", error.message, "error");
		  navigate("/");
		} finally {
		  setLoading(false);
		}
	  };
  
	  const getPosts = async () => {
		try {
		  const res = await fetch(`/api/posts/user/${username}`);
		  const data = await res.json();
		  if (data.error) {
			showToast("Error", data.error, "error");
			return;
		  }
		  setPostsState((prev) => ({ ...prev, posts: data }));
		} catch (error) {
		  showToast("Error", error.message, "error");
		} finally {
		  setFetchingPosts(false);
		}
	  };
  
	  getUserAndStats();
	  getPosts();
	}, [username, showToast, navigate, setPostsState]);
  
	const handleLogout = () => {
		localStorage.removeItem("user-threads");
		setCurrentUser(null);
		navigate("/auth");
		showToast("Success", "Logged out successfully", "success");
	  };
  
	if (loading) return <Flex justifyContent="center" alignItems="center" h="200px"><Text>Loading...</Text></Flex>;
	if (!user) return <Flex justifyContent="center" alignItems="center" h="200px"><Text>User not found</Text></Flex>;
  
	const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
	const pieData = [
	  { name: 'Likes', value: user.stats?.totalLikes || 0 },
	  { name: 'Posts', value: user.stats?.totalPosts || 0 },
	  { name: 'Comments', value: user.stats?.totalComments || 0 },
	];
	const lineData = user.stats?.growthData || [];
	const barData = user.stats?.activityData || [];
  
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
			  {fetchingPosts ? (
				<Flex justifyContent="center" alignItems="center" h="100px"><Text>Loading posts...</Text></Flex>
			  ) : postsState.posts.length === 0 ? (
				<Text>No posts yet</Text>
			  ) : (
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
			  <VStack spacing={6}>
				<Text fontSize="lg" fontWeight="bold">Dashboard</Text>
				<Flex gap={6} flexWrap="wrap">
				  <Stat>
					<StatLabel>Total Likes</StatLabel>
					<StatNumber>{user.stats?.totalLikes || 0}</StatNumber>
				  </Stat>
				  <Stat>
					<StatLabel>Total Posts</StatLabel>
					<StatNumber>{user.stats?.totalPosts || 0}</StatNumber>
				  </Stat>
				  <Stat>
					<StatLabel>Total Comments</StatLabel>
					<StatNumber>{user.stats?.totalComments || 0}</StatNumber>
				  </Stat>
				</Flex>
  
				<Box>
				  <Text fontSize="md" mb={2}>Engagement Distribution</Text>
				  <PieChart width={300} height={200}>
					<Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
					  {pieData.map((entry, index) => (
						<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
					  ))}
					</Pie>
					<Tooltip />
					<Legend />
				  </PieChart>
				</Box>
  
				<Box>
				  <Text fontSize="md" mb={2}>Growth Over Time</Text>
				  <LineChart width={300} height={200} data={lineData}>
					<XAxis dataKey="date" />
					<YAxis />
					<Tooltip />
					<Line type="monotone" dataKey="likes" stroke="#8884d8" />
					<Line type="monotone" dataKey="posts" stroke="#82ca9d" />
				  </LineChart>
				</Box>
  
				<Box>
				  <Text fontSize="md" mb={2}>Activity Breakdown</Text>
				  <BarChart width={300} height={200} data={barData}>
					<XAxis dataKey="month" />
					<YAxis />
					<Tooltip />
					<Bar dataKey="likes" fill="#8884d8" />
					<Bar dataKey="posts" fill="#82ca9d" />
				  </BarChart>
				</Box>
  
				{currentUser?._id === user._id && (
				  <Button colorScheme="red" onClick={handleLogout} alignSelf={isBelow500px ? "center" : "flex-start"}>
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