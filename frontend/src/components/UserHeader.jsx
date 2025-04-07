import { Avatar, Box, Flex, Link, Text, VStack, Button, Image } from "@chakra-ui/react"; 
import { Menu, MenuButton, MenuItem, MenuList } from "@chakra-ui/react"; 
import { Portal } from "@chakra-ui/react"; 
import { useToast } from "@chakra-ui/react"; 
import { BsInstagram } from "react-icons/bs";
import { CgMoreO } from "react-icons/cg";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import { Link as RouterLink } from "react-router-dom";
import useFollowUnfollow from "../hooks/useFollowUnfollow";
import useShowToast from "../hooks/useShowToast";

// ... (rest of the code remains unchanged, just update the imports above)

const UserHeader = ({ user }) => {
	const toast = useToast();
	const currentUser = useRecoilValue(userAtom);
	const { handleFollowUnfollow, following, updating } = useFollowUnfollow(user);
	const showToast = useShowToast();

	const copyURL = () => {
		const currentURL = window.location.href;
		navigator.clipboard.writeText(currentURL).then(() => {
			toast({
				title: "Success.",
				status: "success",
				description: "Profile link copied.",
				duration: 3000,
				isClosable: true,
			});
		});
	};

	const handleBanUnban = async (action) => {
		try {
			const res = await fetch(`/api/users/${action}/${user._id}`, {
				method: "PUT",
			});
			const data = await res.json();
			if (data.error) {
				showToast("Error", data.error, "error");
				return;
			}
			showToast("Success", `User ${action}ned successfully`, "success");
		} catch (error) {
			showToast("Error", error.message, "error");
		}
	};

	const handlePromoteToAdmin = async () => {
		try {
			const res = await fetch(`/api/users/promote/${user._id}`, {
				method: "PUT",
			});
			const data = await res.json();
			if (data.error) {
				showToast("Error", data.error, "error");
				return;
			}
			showToast("Success", "User promoted to admin successfully", "success");
		} catch (error) {
			showToast("Error", error.message, "error");
		}
	};

	return (
		<VStack gap={4} alignItems={"start"}>
			<Flex justifyContent={"space-between"} w={"full"}>
				<Box>
					<Flex alignItems="center" gap={2}>
						<Text fontSize={"2xl"} fontWeight={"bold"}>
							{user.name}
						</Text>
						{user.isAdmin && <Image src="/verified.png" w={4} h={4} />}
					</Flex>
					<Flex gap={2} alignItems={"center"}>
						<Text fontSize={"sm"}>{user.username}</Text>
						<Text fontSize={"xs"} bg={"gray.dark"} color={"gray.light"} p={1} borderRadius={"full"}>
							threads.net
						</Text>
					</Flex>
				</Box>
				<Box>
					{user.profilePic && (
						<Avatar
							name={user.name}
							src={user.profilePic}
							size={{
								base: "md",
								md: "xl",
							}}
						/>
					)}
					{!user.profilePic && (
						<Avatar
							name={user.name}
							src="https://bit.ly/broken-link"
							size={{
								base: "md",
								md: "xl",
							}}
						/>
					)}
				</Box>
			</Flex>

			<Text>{user.bio}</Text>

			{currentUser?._id === user._id && (
				<Link as={RouterLink} to="/update">
					<Button size={"sm"}>Update Profile</Button>
				</Link>
			)}
			{currentUser?._id !== user._id && (
				<Flex gap={2}>
					<Button size={"sm"} onClick={handleFollowUnfollow} isLoading={updating}>
						{following ? "Unfollow" : "Follow"}
					</Button>
					{currentUser?.isAdmin && (
						<Button size="sm" onClick={() => handleBanUnban(user.isBanned ? "unban" : "ban")}>
							{user.isBanned ? "Unban" : "Ban"}
						</Button>
					)}
					{currentUser?.username === "adminblog" && !user.isAdmin && (
						<Button size="sm" onClick={handlePromoteToAdmin}>
							Promote to Admin
						</Button>
					)}
				</Flex>
			)}
			<Flex w={"full"} justifyContent={"space-between"}>
				<Flex gap={2} alignItems={"center"}>
					<Text color={"gray.light"}>{user.followers.length} followers</Text>
					<Box w="1" h="1" bg={"gray.light"} borderRadius={"full"}></Box>
					<Link color={"gray.light"}>instagram.com</Link>
				</Flex>
				<Flex>
					<Box className="icon-container">
						<BsInstagram size={24} cursor={"pointer"} />
					</Box>
					<Box className="icon-container">
						<Menu>
							<MenuButton>
								<CgMoreO size={24} cursor={"pointer"} />
							</MenuButton>
							<Portal>
								<MenuList bg={"gray.dark"}>
									<MenuItem bg={"gray.dark"} onClick={copyURL}>
										Copy link
									</MenuItem>
								</MenuList>
							</Portal>
						</Menu>
					</Box>
				</Flex>
			</Flex>

			<Flex w={"full"}>
				<Flex flex={1} borderBottom={"1.5px solid white"} justifyContent={"center"} pb="3" cursor={"pointer"}>
					<Text fontWeight={"bold"}>Threads</Text>
				</Flex>
				<Flex
					flex={1}
					borderBottom={"1px solid gray"}
					justifyContent={"center"}
					color={"gray.light"}
					pb="3"
					cursor={"pointer"}
				>
					<Text fontWeight={"bold"}>Replies</Text>
				</Flex>
			</Flex>
		</VStack>
	);
};

export default UserHeader;