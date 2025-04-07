import { Button, Flex, Image, Link, useColorMode, Text } from "@chakra-ui/react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import userAtom from "../atoms/userAtom";
import { AiFillHome } from "react-icons/ai";
import { RxAvatar } from "react-icons/rx";
import { Link as RouterLink } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import useLogout from "../hooks/useLogout";
import authScreenAtom from "../atoms/authAtom";
import { BsFillChatQuoteFill } from "react-icons/bs";
import { MdOutlineSettings, MdOutlineDashboard } from "react-icons/md";

const Header = () => {
	const { colorMode, toggleColorMode } = useColorMode();
	const user = useRecoilValue(userAtom);
	const logout = useLogout();
	const setAuthScreen = useSetRecoilState(authScreenAtom);

	return (
		<Flex justifyContent={"space-between"} mt={6} mb="12" alignItems="center">
			{user && (
				<Flex alignItems="center" gap={2}>
					<Link as={RouterLink} to="/">
						<AiFillHome size={24} />
					</Link>
					<Link as={RouterLink} to="/dashboard">
						<MdOutlineDashboard size={24} />
					</Link>
				</Flex>
			)}
			{!user && (
				<Link as={RouterLink} to={"/auth"} onClick={() => setAuthScreen("login")}>
					Login
				</Link>
			)}

			<Image
				cursor={"pointer"}
				alt="logo"
				w={6}
				src={colorMode === "dark" ? "/light-logo.svg" : "/dark-logo.svg"}
				onClick={toggleColorMode}
			/>

			{user && (
				<Flex alignItems={"center"} gap={4}>
					<Flex alignItems="center" gap={1}>
						<Text fontWeight="bold">{user.username}</Text>
						{user.isAdmin && <Image src="/verified.png" w={4} h={4} />}
					</Flex>
					<Link as={RouterLink} to={`/${user.username}`}>
						<RxAvatar size={24} />
					</Link>
					<Link as={RouterLink} to={`/chat`}>
						<BsFillChatQuoteFill size={20} />
					</Link>
					<Link as={RouterLink} to={`/settings`}>
						<MdOutlineSettings size={20} />
					</Link>
					<Button size={"xs"} onClick={logout}>
						<FiLogOut size={20} />
					</Button>
				</Flex>
			)}

			{!user && (
				<Link as={RouterLink} to={"/auth"} onClick={() => setAuthScreen("signup")}>
					Sign up
				</Link>
			)}
		</Flex>
	);
};

export default Header;