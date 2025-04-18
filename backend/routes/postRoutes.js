import express from "express";
import multer from "multer";
import {
  getAllPosts, // Added
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
  getFeedPosts,
  getUserPosts,
  getStories,
  likeUnlikeReply,
  editPost,
  editComment,
  deleteComment,
  getBookmarks,
  bookmarkUnbookmarkPost,
  getSuggestedPosts,
} from "../controllers/postController.js";

import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// GET Routes
router.get("/all", protectRoute, getAllPosts); // Added
router.get("/feed", protectRoute, getFeedPosts);
router.get("/stories", protectRoute, getStories);
router.get("/user/:username", getUserPosts);
router.get("/:id", getPost);
router.get("/bookmarks/:username", protectRoute, getBookmarks);
router.get("/suggested", protectRoute, getSuggestedPosts);
router.get("/all", protectRoute, getAllPosts);
// POST Routes
router.post("/create", protectRoute, upload.single("media"), createPost);
router.post("/story", protectRoute, upload.single("media"), createStory);
router.post("/post/:postId/comment", protectRoute, commentOnPost);
router.post("/post/:postId/comment/:commentId/reply", protectRoute, replyToComment);

// PUT Routes
router.put("/like/:id", protectRoute, likeUnlikePost);
router.put("/bookmark/:id", protectRoute, bookmarkUnbookmarkPost);
router.put("/:id", protectRoute, editPost);
router.put("/post/:postId/comment/:commentId/like", protectRoute, likeUnlikeComment);
router.put("/post/:postId/comment/:commentId/reply/:replyId/like", protectRoute, likeUnlikeReply);
router.put("/ban/:id", protectRoute, banPost);
router.put("/unban/:id", protectRoute, unbanPost);
router.put("/post/:postId/comment/:commentId", protectRoute, editComment);

// DELETE Routes
router.delete("/:id", protectRoute, deletePost);
router.delete("/post/:postId/comment/:commentId", protectRoute, deleteComment);

export default router;