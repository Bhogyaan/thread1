import { Box, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import useShowToast from "../hooks/useShowToast";
import AnalyticsChart from "../components/AnalyticsChart";

const DashboardPage = () => {
	const user = useRecoilValue(userAtom);
	const [stats, setStats] = useState(null);
	const showToast = useShowToast();

	useEffect(() => {
		const fetchStats = async () => {
			try {
				const endpoint = user.isAdmin ? "/api/users/admin/dashboard" : "/api/users/dashboard";
				const res = await fetch(endpoint);
				const data = await res.json();
				if (data.error) {
					showToast("Error", data.error, "error");
					return;
				}
				setStats(data);
			} catch (error) {
				showToast("Error", error.message, "error");
			}
		};
		fetchStats();
	}, [showToast, user]);

	if (!stats) return <Text>Loading...</Text>;

	const userPieData = [
		{ name: "Likes", value: stats.totalLikes },
		{ name: "Comments", value: stats.totalComments },
		{ name: "Posts", value: stats.totalPosts },
	];
	const adminPieData = [
		{ name: "Users", value: stats.totalUsers },
		{ name: "Banned Users", value: stats.totalBannedUsers },
		{ name: "Posts", value: stats.totalPosts },
		{ name: "Banned Posts", value: stats.totalBannedPosts },
	];

	return (
		<VStack spacing={6} p={4}>
			<Heading>Dashboard</Heading>
			{user.isAdmin ? (
				<>
					<Text>Total Users: {stats.totalUsers}</Text>
					<Text>Banned Users: {stats.totalBannedUsers}</Text>
					<Text>Total Posts: {stats.totalPosts}</Text>
					<Text>Banned Posts: {stats.totalBannedPosts}</Text>
					<AnalyticsChart type="pie" data={adminPieData} />
				</>
			) : (
				<>
					<Text>Total Posts: {stats.totalPosts}</Text>
					<Text>Total Likes: {stats.totalLikes}</Text>
					<Text>Total Comments: {stats.totalComments}</Text>
					<Text>Total Interactions: {stats.totalInteractions}</Text>
					<AnalyticsChart type="pie" data={userPieData} />
					<AnalyticsChart type="bar" data={userPieData} />
				</>
			)}
		</VStack>
	);
};

export default DashboardPage;