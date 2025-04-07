import { Flex, IconButton, useMediaQuery } from "@chakra-ui/react";
import { AiFillHome, AiOutlineSearch, AiOutlineUser } from "react-icons/ai";
import { MdSettings } from "react-icons/md";
import { BsPlusSquare } from "react-icons/bs";
import { useNavigate } from "react-router-dom";

const BottomNav = () => {
	const [isBelow500px] = useMediaQuery("(max-width: 500px)");
	const navigate = useNavigate();

	if (!isBelow500px) return null; // Hide on large screens

	return (
		<Flex
			position="fixed"
			bottom={0}
			left={0}
			right={0}
			bg="gray.800"
			color="white"
			justifyContent="space-around"
			py={2}
			zIndex={10}
		>
			<IconButton
				aria-label="Home"
				icon={<AiFillHome />}
				variant="ghost"
				color="white"
				onClick={() => navigate("/")}
			/>
			<IconButton
				aria-label="Create Post"
				icon={<BsPlusSquare />}
				variant="ghost"
				color="white"
				onClick={() => navigate("/create-post")} // Adjust route as needed
			/>
			<IconButton
				aria-label="Search"
				icon={<AiOutlineSearch />}
				variant="ghost"
				color="white"
				onClick={() => navigate("/search")}
			/>
			<IconButton
				aria-label="Profile"
				icon={<AiOutlineUser />}
				variant="ghost"
				color="white"
				onClick={() => navigate("/user")} // Adjust to current user's profile route
			/>
			<IconButton
				aria-label="Settings"
				icon={<MdSettings />}
				variant="ghost"
				color="white"
				onClick={() => navigate("/settings")}
			/>
		</Flex>
	);
};

export default BottomNav;