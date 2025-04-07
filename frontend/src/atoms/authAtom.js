import { atom } from "recoil";

const authScreenAtom = atom({
	key: "authScreenAtom",
	default: "login", // Possible values: "login", "signup", "adminLogin"
});

export default authScreenAtom;