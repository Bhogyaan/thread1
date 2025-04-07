import { Box, Container, useMediaQuery } from "@chakra-ui/react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import UserPage from "./pages/UserPage";
import PostPage from "./pages/PostPage";
import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import { useRecoilValue } from "recoil";
import userAtom from "./atoms/userAtom";
import UpdateProfilePage from "./pages/UpdateProfilePage";
import CreatePost from "./components/CreatePost";
import ChatPage from "./pages/ChatPage";
import { SettingsPage } from "./pages/SettingsPage";
import DashboardPage from "./pages/DashboardPage";
import BottomNavigation from "./components/BottomNav";

function App() {
	const user = useRecoilValue(userAtom);
	const { pathname } = useLocation();
	const [isSmallScreen] = useMediaQuery("(max-width: 768px)");

	return (
		<Box position={"relative"} w="full" minH="100vh" pb={isSmallScreen ? "60px" : "0"}>
			<Container maxW={pathname === "/" ? { base: "620px", md: "900px" } : "620px"}>
				{!isSmallScreen && <Header />}
				<Routes>
					<Route path="/" element={user ? <HomePage /> : <Navigate to="/auth" />} />
					<Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/" />} />
					<Route path="/update" element={user ? <UpdateProfilePage /> : <Navigate to="/auth" />} />
					<Route
						path="/:username"
						element={
							user ? (
								<>
									<UserPage />
									<CreatePost />
								</>
							) : (
								<UserPage />
							)
						}
					/>
					<Route path="/:username/post/:pid" element={<PostPage />} />
					<Route path="/chat" element={user ? <ChatPage /> : <Navigate to="/auth" />} />
					<Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/auth" />} />
					<Route path="/dashboard" element={user ? <DashboardPage /> : <Navigate to="/auth" />} />
				</Routes>
			</Container>
			{isSmallScreen && <BottomNavigation />}
		</Box>
	);
}

export default App;