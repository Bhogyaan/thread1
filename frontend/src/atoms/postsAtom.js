import { atom } from "recoil";

const postsAtom = atom({
	key: "postsAtom",
	default: {
		posts: [],
		stories: [],
	},
});

export default postsAtom;