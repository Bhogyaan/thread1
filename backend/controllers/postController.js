import Post from "../models/postModel.js";
import Story from "../models/storyModel.js";
import User from "../models/userModel.js";
import { v2 as cloudinary } from "cloudinary";

const createPost = async (req, res) => {
  try {
    const { postedBy, text, media, mediaType } = req.body;
    let previewUrl;

    if (!postedBy || !text) {
      return res.status(400).json({ error: "PostedBy and text fields are required" });
    }

    const user = await User.findById(postedBy);
    if (!user || user.isBanned) {
      return res.status(404).json({ error: "User not found or banned" });
    }

    if (user._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: "Unauthorized to create post" });
    }

    const maxLength = 500;
    if (text.length > maxLength) {
      return res.status(400).json({ error: `Text must be less than ${maxLength} characters` });
    }

    if (media) {
      const uploadedResponse = await cloudinary.uploader.upload(media, {
        resource_type: mediaType === "video" || mediaType === "audio" ? "video" : "image",
      });
      const mediaUrl = uploadedResponse.secure_url;

      if (mediaType === "video" && uploadedResponse.duration > 180) {
        await cloudinary.uploader.destroy(uploadedResponse.public_id);
        return res.status(400).json({ error: "Video must be less than 3 minutes" });
      }

      if (uploadedResponse.bytes > (mediaType === "document" ? 2 * 1024 * 1024 * 1024 : 16 * 1024 * 1024)) {
        await cloudinary.uploader.destroy(uploadedResponse.public_id);
        return res.status(400).json({ error: "File size exceeds limit" });
      }

      previewUrl = mediaType === "video" || mediaType === "image" ? uploadedResponse.thumbnail_url : null;

      const newPost = new Post({ postedBy, text, media: mediaUrl, mediaType, previewUrl });
      await newPost.save();
      res.status(201).json(newPost);
    } else {
      const newPost = new Post({ postedBy, text });
      await newPost.save();
      res.status(201).json(newPost);
    }
  } catch (err) {
    console.error("Error in createPost:", err);
    res.status(500).json({ error: err.message });
  }
};

const createStory = async (req, res) => {
  try {
    const { media, mediaType } = req.body;
    const postedBy = req.user._id;

    if (!media || !mediaType) {
      return res.status(400).json({ error: "Media and mediaType are required" });
    }

    const user = await User.findById(postedBy);
    if (!user || user.isBanned) {
      return res.status(404).json({ error: "User not found or banned" });
    }

    const uploadedResponse = await cloudinary.uploader.upload(media, {
      resource_type: mediaType === "video" || mediaType === "audio" ? "video" : "image",
    });
    const mediaUrl = uploadedResponse.secure_url;

    if (mediaType === "video" && uploadedResponse.duration > 30) {
      await cloudinary.uploader.destroy(uploadedResponse.public_id);
      return res.status(400).json({ error: "Story video must be less than 30 seconds" });
    }

    if (uploadedResponse.bytes > 16 * 1024 * 1024) {
      await cloudinary.uploader.destroy(uploadedResponse.public_id);
      return res.status(400).json({ error: "Story size must be less than 16MB" });
    }

    const newStory = new Story({
      postedBy,
      media: mediaUrl,
      mediaType,
      duration: mediaType === "video" ? uploadedResponse.duration : 0,
    });
    await newStory.save();

    res.status(201).json(newStory);
  } catch (err) {
    console.error("Error in createStory:", err);
    res.status(500).json({ error: err.message });
  }
};

const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate("postedBy", "username profilePic");
    if (!post || post.isBanned) {
      return res.status(404).json({ error: "Post not found or banned" });
    }
    res.status(200).json(post);
  } catch (err) {
    console.error("Error in getPost:", err);
    res.status(500).json({ error: err.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.postedBy.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(401).json({ error: "Unauthorized to delete post" });
    }

    if (post.media) {
      const mediaId = post.media.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(mediaId);
    }

    await Post.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("Error in deletePost:", err);
    res.status(500).json({ error: err.message });
  }
};

const likeUnlikePost = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const userLikedPost = post.likes.includes(userId);

    if (userLikedPost) {
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      res.status(200).json({ message: "Post unliked successfully" });
    } else {
      post.likes.push(userId);
      await post.save();
      res.status(200).json({ message: "Post liked successfully" });
    }
  } catch (err) {
    console.error("Error in likeUnlikePost:", err);
    res.status(500).json({ error: err.message });
  }
};

const commentOnPost = async (req, res) => {
  try {
    const { text } = req.body;
    const { postId } = req.params; // Updated to match route parameter
    const userId = req.user._id;
    const userProfilePic = req.user.profilePic || "";
    const username = req.user.username || "";

    if (!text) {
      return res.status(400).json({ error: "Text field is required" });
    }

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const comment = {
      userId,
      text,
      userProfilePic,
      username,
      likes: [], // Initialize likes array
      replies: [], // Initialize replies array
      createdAt: new Date(), // Add timestamp
    };
    post.comments = post.comments || []; // Ensure comments is initialized
    post.comments.push(comment);
    await post.save();

    res.status(200).json(comment); // Return the full comment object
  } catch (err) {
    console.error("Error in commentOnPost:", err);
    res.status(500).json({ error: err.message });
  }
};

const replyToComment = async (req, res) => {
  try {
    const { text } = req.body;
    const { postId, commentId } = req.params;
    const userId = req.user._id;
    const userProfilePic = req.user.profilePic || "";
    const username = req.user.username || "";

    if (!text) {
      return res.status(400).json({ error: "Text field is required" });
    }

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const reply = {
      userId,
      text,
      userProfilePic,
      username,
      createdAt: new Date(), // Add timestamp
    };
    comment.replies = comment.replies || []; // Ensure replies is initialized
    comment.replies.push(reply);
    await post.save();

    res.status(200).json(reply); // Return the full reply object
  } catch (err) {
    console.error("Error in replyToComment:", err);
    res.status(500).json({ error: err.message });
  }
};

const likeUnlikeComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const userLikedComment = comment.likes.includes(userId);

    if (userLikedComment) {
      comment.likes.pull(userId);
      await post.save();
      res.status(200).json({ message: "Comment unliked successfully", likes: comment.likes });
    } else {
      comment.likes.push(userId);
      await post.save();
      res.status(200).json({ message: "Comment liked successfully", likes: comment.likes });
    }
  } catch (err) {
    console.error("Error in likeUnlikeComment:", err);
    res.status(500).json({ error: err.message });
  }
};

const banPost = async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: "Admin access required" });

    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.isBanned = true;
    post.bannedBy = req.user._id;
    await post.save();

    res.status(200).json({ message: "Post banned successfully" });
  } catch (err) {
    console.error("Error in banPost:", err);
    res.status(500).json({ error: err.message });
  }
};

const unbanPost = async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: "Admin access required" });

    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.isBanned = false;
    post.bannedBy = null;
    await post.save();

    res.status(200).json({ message: "Post unbanned successfully" });
  } catch (err) {
    console.error("Error in unbanPost:", err);
    res.status(500).json({ error: err.message });
  }
};

const getFeedPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const following = user.following || [];
    const feedPosts = await Post.find({
      postedBy: { $in: [userId, ...following] },
      isBanned: false,
    })
      .sort({ createdAt: -1 })
      .populate("postedBy", "username profilePic");

    const sanitizedPosts = feedPosts.map((post) => ({
      ...post._doc,
      replies: post.replies || [],
      comments: post.comments || [],
      likes: post.likes || [],
    }));

    res.status(200).json(sanitizedPosts);
  } catch (error) {
    console.error("Error in getFeedPosts:", error);
    res.status(500).json({ error: error.message });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const posts = await Post.find({ postedBy: user._id, isBanned: false })
      .sort({ createdAt: -1 })
      .populate("postedBy", "username profilePic");

    res.status(200).json(posts);
  } catch (error) {
    console.error("Error in getUserPosts:", error);
    res.status(500).json({ error: error.message });
  }
};

const getStories = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const following = user.following || [];
    const stories = await Story.find({ postedBy: { $in: [...following, userId] } }).sort({
      createdAt: -1,
    });

    res.status(200).json(stories);
  } catch (err) {
    console.error("Error in getStories:", err);
    res.status(500).json({ error: err.message });
  }
};

const replyToPost = async (req, res) => {
  try {
    const { text } = req.body;
    const { postId } = req.params; // Updated to match route parameter
    const userId = req.user._id;
    const userProfilePic = req.user.profilePic || "";
    const username = req.user.username || "";

    if (!text) {
      return res.status(400).json({ error: "Text field is required" });
    }

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const reply = { userId, text, userProfilePic, username, createdAt: new Date() };
    post.replies = post.replies || []; // Ensure replies is an array
    post.replies.push(reply);

    await post.save();
    res.status(200).json(reply);
  } catch (err) {
    console.error("Error in replyToPost:", err);
    res.status(500).json({ error: err.message });
  }
};

const repostPost = async (req, res) => {
  try {
    const { postId } = req.params; // Updated to match route parameter
    const userId = req.user._id;

    const originalPost = await Post.findById(postId);
    if (!originalPost || originalPost.isBanned) {
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const repost = new Post({
      postedBy: userId,
      text: originalPost.text,
      media: originalPost.media,
      mediaType: originalPost.mediaType,
      originalPost: postId,
      isRepost: true,
    });
    await repost.save();

    res.status(201).json(repost);
  } catch (error) {
    console.error("Error in repostPost:", error);
    res.status(500).json({ error: error.message });
  }
};

export {
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
  replyToPost,
  repostPost,
};