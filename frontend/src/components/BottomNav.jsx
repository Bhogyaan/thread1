import { Flex, IconButton, useMediaQuery, Tooltip } from "@chakra-ui/react";
import { AiFillHome, AiOutlineSearch, AiOutlineUser } from "react-icons/ai";
import { MdSettings } from "react-icons/md";
import { BsPlusSquare } from "react-icons/bs";
import { useNavigate, useLocation } from "react-router-dom";
import { useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import useShowToast from "../hooks/useShowToast";

const BottomNav = ({ onOpenCreatePost }) => { // Added prop
  const [isBelow500px] = useMediaQuery("(max-width: 500px)");
  const navigate = useNavigate();
  const location = useLocation();
  const user = useRecoilValue(userAtom);
  const showToast = useShowToast();

  if (!isBelow500px) return null;

  const isActive = (path) => location.pathname === path;

  const handleProfileClick = () => {
    if (!user || !user.username) {
      showToast("Error", "You must be logged in to view your profile", "error");
      return;
    }
    navigate(`/${user.username}`);
  };

  const handleCreatePostClick = () => {
    if (!user) {
      showToast("Error", "You must be logged in to create a post", "error");
      return;
    }
    onOpenCreatePost(); // Use modal instead of navigation
    // navigate("/create-post"); // Uncomment if you prefer standalone page
  };

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
      <Tooltip label="Home" hasArrow>
        <IconButton
          aria-label="Home"
          icon={<AiFillHome />}
          variant="ghost"
          color={isActive("/") ? "blue.400" : "white"}
          onClick={() => navigate("/")}
          _hover={{ color: "blue.400" }}
        />
      </Tooltip>

      <Tooltip label="Create Post" hasArrow>
        <IconButton
          aria-label="Create Post"
          icon={<BsPlusSquare />}
          variant="ghost"
          color={isActive("/create-post") ? "blue.400" : "white"}
          onClick={handleCreatePostClick}
          _hover={{ color: "blue.400" }}
        />
      </Tooltip>

      <Tooltip label="Search" hasArrow>
        <IconButton
          aria-label="Search"
          icon={<AiOutlineSearch />}
          variant="ghost"
          color={isActive("/search") ? "blue.400" : "white"}
          onClick={() => navigate("/search")}
          _hover={{ color: "blue.400" }}
        />
      </Tooltip>

      <Tooltip label="Profile" hasArrow>
        <IconButton
          aria-label="Profile"
          icon={<AiOutlineUser />}
          variant="ghost"
          color={isActive(`/${user?.username || ""}`) ? "blue.400" : "white"}
          onClick={handleProfileClick}
          _hover={{ color: "blue.400" }}
        />
      </Tooltip>

      <Tooltip label="Settings" hasArrow>
        <IconButton
          aria-label="Settings"
          icon={<MdSettings />}
          variant="ghost"
          color={isActive("/settings") ? "blue.400" : "white"}
          onClick={() => navigate("/settings")}
          _hover={{ color: "blue.400" }}
        />
      </Tooltip>
    </Flex>
  );
};

export default BottomNav;