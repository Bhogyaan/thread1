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
  repostPost,
} from "../controllers/postController.js";
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();

// GET Routes
router.get("/feed", protectRoute, getFeedPosts);
router.get("/stories", protectRoute, getStories);
router.get("/user/:username", getUserPosts); // Moved up to avoid conflict with /:id
router.get("/:id", getPost);

// POST Routes
router.post("/create", protectRoute, createPost);
router.post("/story", protectRoute, createStory);
router.post("/post/:postId/comment", protectRoute, commentOnPost); // Matches frontend
router.post("/post/:postId/comment/:commentId/reply", protectRoute, replyToComment); // Matches frontend
router.post("/post/:postId/reply", protectRoute, replyToPost);
router.post("/repost/:postId", protectRoute, repostPost);

// PUT Routes
router.put("/like/:id", protectRoute, likeUnlikePost);
router.put("/post/:postId/comment/:commentId/like", protectRoute, likeUnlikeComment); // Matches frontend
router.put("/ban/:id", protectRoute, banPost);
router.put("/unban/:id", protectRoute, unbanPost);

// DELETE Routes
router.delete("/:id", protectRoute, deletePost);

export default router;