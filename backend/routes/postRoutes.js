import express from "express";
import {
	createPost,
	createStory,
	getPost,
	deletePost,
	likeUnlikePost,
	commentOnPost,
	replyToComment,
	likeUnlikeComment,
	banPost,
	unbanPost,
	replyToPost,
	getFeedPosts,
	getUserPosts,
	getStories,
} from "../controllers/postController.js";
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();

router.get("/feed", protectRoute, getFeedPosts);
router.get("/stories", protectRoute, getStories);
router.get("/:id", getPost);
router.get("/user/:username", getUserPosts);
router.post("/create", protectRoute, createPost);
router.post("/story", protectRoute, createStory);
router.post("/comment/:id", protectRoute, commentOnPost);
router.post("/reply/:postId/:commentId", protectRoute, replyToComment);
router.put("/like/:id", protectRoute, likeUnlikePost);
router.put("/like-comment/:postId/:commentId", protectRoute, likeUnlikeComment);
router.put("/ban/:id", protectRoute, banPost);
router.put("/unban/:id", protectRoute, unbanPost);
router.delete("/:id", protectRoute, deletePost);
router.post("/reply/:postId", protectRoute, replyToPost); 
export default router;