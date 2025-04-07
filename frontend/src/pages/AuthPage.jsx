import { useRecoilValue, useSetRecoilState } from "recoil";
import LoginCard from "../components/LoginCard";
import SignupCard from "../components/SignupCard";
import authScreenAtom from "../atoms/authAtom";
import { Button, VStack } from "@chakra-ui/react";

const AuthPage = () => {
	const authScreenState = useRecoilValue(authScreenAtom);
	const setAuthScreen = useSetRecoilState(authScreenAtom);

	return (
		<VStack spacing={4}>
			{authScreenState === "login" ? (
				<>
					<LoginCard />
					<Button onClick={() => setAuthScreen("adminLogin")}>Admin Login</Button>
				</>
			) : authScreenState === "adminLogin" ? (
				<LoginCard isAdmin />
			) : (
				<SignupCard />
			)}
		</VStack>
	);
};

export default AuthPage;