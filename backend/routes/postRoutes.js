// postRoutes.js
import express from "express";
import multer from "multer";
import {
  getAllPosts,
  createPost,
  createStory,
  getPost,
  deletePost,
  likeUnlikePost,
  commentOnPost,
  addReply,
  likeUnlikeComment,
  likeUnlikeReply,
  banPost,
  unbanPost,
  getFeedPosts,
  getUserPosts,
  getStories,
  editPost,
  editComment,
  editReply,
  deleteComment,
  deleteReply,
  getBookmarks,
  bookmarkUnbookmarkPost,
  getSuggestedPosts,
  getPaginatedComments,
// Add import
} from "../controllers/postController.js";
import protectRoute from "../middlewares/protectRoute.js";
import rateLimit from "express-rate-limit";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit to 100 comments per IP
});

// GET Routes
router.get("/all", protectRoute, getAllPosts);
router.get("/feed", protectRoute, getFeedPosts);
router.get("/stories", protectRoute, getStories);
router.get("/user/:username", getUserPosts);
router.get("/:id", getPost);
router.get("/bookmarks/:username", protectRoute, getBookmarks);
router.get("/suggested", protectRoute, getSuggestedPosts);
router.get("/post/:postId/comments", protectRoute, getPaginatedComments);

// POST Routes
router.post("/create", protectRoute, upload.single("media"), createPost);
router.post('/story', protectRoute, upload.single('media'), (req, res, next) => {
  console.log('POST /api/story route hit');
  createStory(req, res, next);
});
router.post("/post/:postId/comment", protectRoute, commentLimiter, commentOnPost);
router.post("/post/:postId/comment/:commentId/reply", protectRoute, commentLimiter, addReply);

// PUT Routes
router.put("/like/:id", protectRoute, likeUnlikePost);
router.put("/bookmark/:id", protectRoute, bookmarkUnbookmarkPost);
router.put("/:id", protectRoute, editPost);
router.put("/post/:postId/comment/:commentId/like", protectRoute, likeUnlikeComment);
router.put("/post/:postId/comment/:commentId/reply/:replyId/like", protectRoute, likeUnlikeReply);
router.put("/ban/:id", protectRoute, banPost);
router.put("/unban/:id", protectRoute, unbanPost);
router.put("/post/:postId/comment/:commentId", protectRoute, editComment);
router.put("/post/:postId/comment/:commentId/reply/:replyId", protectRoute, editReply);

// DELETE Routes
router.delete("/:id", protectRoute, deletePost);
// router.delete("/story/:id", protectRoute, deleteStory); 
router.delete("/post/:postId/comment/:commentId", protectRoute, deleteComment);
router.delete("/post/:postId/comment/:commentId/reply/:replyId", protectRoute, deleteReply);

export default router;