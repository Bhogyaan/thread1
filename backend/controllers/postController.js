import Post from "../models/postModel.js";
import Story from "../models/storyModel.js";
import User from "../models/userModel.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const SUPPORTED_FORMATS = {
  image: ["image/jpeg", "image/png", "image/gif", "image/heic"],
  video: ["video/mp4", "video/x-matroska", "video/avi", "video/3gpp", "video/quicktime"],
  audio: ["audio/mpeg", "audio/aac", "audio/x-m4a", "audio/opus", "audio/wav", "audio/ogg", "audio/mp3"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "application/rtf",
    "application/zip",
    "application/x-zip-compressed",
  ],
};

const MAX_SIZES = {
  image: 16 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  audio: 16 * 1024 * 1024,
  document: 2 * 1024 * 1024 * 1024,
};

const createPost = async (req, res) => {
  try {
    const { postedBy, text, mediaType } = req.body;
    const mediaFile = req.file;
    let mediaUrl, previewUrl, originalFilename;

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

    let detectedMediaType = mediaFile ? mediaType || Object.keys(SUPPORTED_FORMATS).find((key) => SUPPORTED_FORMATS[key].includes(mediaFile.mimetype)) : null;
    if (mediaFile && !detectedMediaType) {
      if (fs.existsSync(mediaFile.path)) fs.unlinkSync(mediaFile.path);
      return res.status(400).json({ error: `Unsupported file format: ${mediaFile.mimetype}. Please upload a valid file.` });
    }

    let newPost;
    if (mediaFile) {
      if (mediaFile.size > MAX_SIZES[detectedMediaType]) {
        if (fs.existsSync(mediaFile.path)) fs.unlinkSync(mediaFile.path);
        return res.status(400).json({
          error: `${detectedMediaType} size exceeds ${(MAX_SIZES[detectedMediaType] / (1024 * 1024)).toFixed(2)}MB limit`,
        });
      }

      const uploadOptions = {
        resource_type: detectedMediaType === "video" || detectedMediaType === "audio" ? "video" : detectedMediaType === "document" ? "raw" : "image",
      };

      try {
        if (detectedMediaType === "document") {
          const uploadResponse = await cloudinary.uploader.upload(mediaFile.path, {
            resource_type: "raw",
            use_filename: true,
            folder: "documents",
          });
          mediaUrl = uploadResponse.secure_url;
          originalFilename = mediaFile.originalname; // Store original filename

          if (mediaFile.mimetype === "application/pdf") {
            try {
              const previewResponse = await cloudinary.uploader.upload(mediaFile.path, {
                resource_type: "image",
                transformation: [{ page: 1, format: "jpg", width: 600, crop: "fit" }],
              });
              previewUrl = previewResponse.secure_url;
            } catch (previewError) {
              console.warn("Failed to generate PDF preview:", previewError.message);
              previewUrl = null;
            }
          } else if (mediaFile.mimetype === "application/zip") {
            previewUrl = null; // No preview for zip files
          }
        } else if (mediaFile.mimetype === "image/heic") {
          uploadOptions.transformation = [{ fetch_format: "jpg" }];
          detectedMediaType = "image";
        } else {
          const uploadedResponse = await cloudinary.uploader.upload(mediaFile.path, uploadOptions);
          mediaUrl = uploadedResponse.secure_url;
          previewUrl = (detectedMediaType === "image" || detectedMediaType === "video") ? uploadedResponse.thumbnail_url : null;
        }

        if (!mediaUrl) {
          throw new Error("Upload to Cloudinary failed");
        }

        newPost = new Post({
          postedBy,
          text,
          media: mediaUrl,
          mediaType: detectedMediaType,
          previewUrl,
          originalFilename: detectedMediaType === "document" ? originalFilename : undefined,
        });
        await newPost.save();
        if (fs.existsSync(mediaFile.path)) fs.unlinkSync(mediaFile.path);
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError.message, uploadError.response?.data);
        if (fs.existsSync(mediaFile.path)) fs.unlinkSync(mediaFile.path);
        return res.status(500).json({ error: `Failed to upload ${detectedMediaType} file: ${uploadError.message}` });
      }
    } else {
      newPost = new Post({ postedBy, text });
      await newPost.save();
    }

    const populatedPost = await Post.findById(newPost._id).populate("postedBy", "username profilePic");
    if (req.io) {
      const user = await User.findById(postedBy);
      const followerIds = [...(user.following || []), user._id.toString()];
      followerIds.forEach((followerId) => {
        const socketId = req.io.getRecipientSocketId(followerId);
        if (socketId) {
          req.io.to(socketId).emit("newPost", populatedPost);
        }
      });
      req.io.emit("newFeedPost", populatedPost);
    }

    res.status(201).json(populatedPost);
  } catch (err) {
    console.error("Error in createPost:", err.message, err.stack);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: `Failed to create post: ${err.message}` });
  }
};

const createStory = async (req, res) => {
  try {
    const mediaFile = req.file;
    const postedBy = req.user._id;

    if (!mediaFile) {
      return res.status(400).json({ error: "Media is required" });
    }

    const user = await User.findById(postedBy);
    if (!user || user.isBanned) {
      return res.status(404).json({ error: "User not found or banned" });
    }

    let mediaType = Object.keys(SUPPORTED_FORMATS).find((key) => SUPPORTED_FORMATS[key].includes(mediaFile.mimetype));
    if (!mediaType) {
      fs.unlinkSync(mediaFile.path);
      return res.status(400).json({ error: "Unsupported media type" });
    }

    const uploadOptions = {
      resource_type: mediaType === "video" || mediaType === "audio" ? "video" : "image",
    };

    if (mediaFile.mimetype === "image/heic") {
      uploadOptions.transformation = [{ fetch_format: "jpg" }];
      mediaType = "image";
    }

    const uploadedResponse = await cloudinary.uploader.upload(mediaFile.path, uploadOptions);
    const mediaUrl = uploadedResponse.secure_url;

    if (!SUPPORTED_FORMATS[mediaType].includes(uploadedResponse.format)) {
      await cloudinary.uploader.destroy(uploadedResponse.public_id);
      fs.unlinkSync(mediaFile.path);
      return res.status(400).json({ error: `Unsupported ${mediaType} format` });
    }

    if (uploadedResponse.bytes > MAX_SIZES[mediaType]) {
      await cloudinary.uploader.destroy(uploadedResponse.public_id);
      fs.unlinkSync(mediaFile.path);
      return res.status(400).json({ error: `${mediaType} size exceeds ${MAX_SIZES[mediaType] / (1024 * 1024)}MB limit` });
    }

    if (mediaType === "video" && uploadedResponse.duration > 30) {
      await cloudinary.uploader.destroy(uploadedResponse.public_id);
      fs.unlinkSync(mediaFile.path);
      return res.status(400).json({ error: "Story video must be less than 30 seconds" });
    }

    const newStory = new Story({
      postedBy,
      media: mediaUrl,
      mediaType,
      duration: mediaType === "video" ? uploadedResponse.duration : 0,
      previewUrl: (mediaType === "image" || mediaType === "video") ? uploadedResponse.thumbnail_url : null,
    });
    await newStory.save();
    fs.unlinkSync(mediaFile.path);

    res.status(201).json(newStory);
  } catch (err) {
    console.error("Error in createStory:", err);
    if (req.file) fs.unlinkSync(req.file.path);
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
      const publicId = post.media.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    if (post.previewUrl) {
      const previewPublicId = post.previewUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(previewPublicId);
    }

    await Post.findByIdAndDelete(req.params.id);
    if (req.io) {
      req.io.emit("postDeleted", { postId: req.params.id, userId: post.postedBy });
    }
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("Error in deletePost:", err);
    res.status(500).json({ error: err.message });
  }
};

const editPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const { text, media, mediaType, previewUrl } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.postedBy.toString() !== userId.toString() && !req.user.isAdmin) {
      return res.status(403).json({ error: "Unauthorized to edit this post" });
    }

    let isEdited = post.isEdited || false;
    if (text !== undefined && text !== post.text) {
      post.text = text;
      isEdited = true;
    }
    if (media !== undefined && media !== post.media) {
      post.media = media;
      isEdited = true;
    }
    if (mediaType !== undefined && mediaType !== post.mediaType) {
      post.mediaType = mediaType;
      isEdited = true;
    }
    if (previewUrl !== undefined && previewUrl !== post.previewUrl) {
      post.previewUrl = previewUrl;
      isEdited = true;
    }

    post.isEdited = isEdited;
    await post.save();

    const updatedPost = await Post.findById(postId).populate("postedBy", "username profilePic");
    if (req.io) {
      req.io.to(`post:${postId}`).emit("postUpdated", updatedPost);
    }
    res.status(200).json(updatedPost);
  } catch (error) {
    console.error("Error in editPost:", error);
    res.status(500).json({ error: error.message });
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
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
    }
    await post.save();

    if (req.io) {
      req.io.to(`post:${postId}`).emit("likeUnlikePost", { postId, userId, likes: post.likes });
    }
    res.status(200).json({ likes: post.likes });
  } catch (err) {
    console.error("Error in likeUnlikePost:", err);
    res.status(500).json({ error: err.message });
  }
};

const bookmarkUnbookmarkPost = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user._id;
    const post = await Post.findById(postId);
    const user = await User.findById(userId);

    if (!post || !user) {
      return res.status(404).json({ error: "Post or user not found" });
    }

    const isBookmarked = user.bookmarks.includes(postId);
    if (isBookmarked) {
      user.bookmarks.pull(postId);
      post.bookmarks.pull(userId);
    } else {
      user.bookmarks.push(postId);
      post.bookmarks.push(userId);
    }

    await Promise.all([user.save(), post.save()]);

    if (req.io) {
      req.io.emit("bookmarkUnbookmarkPost", {
        postId,
        userId,
        bookmarked: !isBookmarked,
        post: { _id: post._id, bookmarks: post.bookmarks },
      });
    }

    res.status(200).json({
      message: isBookmarked ? "Post unbookmarked" : "Post bookmarked",
      bookmarked: !isBookmarked,
      bookmarks: post.bookmarks,
    });
  } catch (err) {
    console.error("Error in bookmarkUnbookmarkPost:", err);
    res.status(500).json({ error: err.message });
  }
};

const getBookmarks = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username })
      .populate({
        path: "bookmarks",
        match: { isBanned: false },
        populate: { path: "postedBy", select: "username profilePic" },
      })
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user.bookmarks || []);
  } catch (err) {
    console.error("Error in getBookmarks:", err);
    res.status(500).json({ error: err.message });
  }
};

const commentOnPost = async (req, res) => {
  try {
    const { text } = req.body;
    const { postId } = req.params;
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
      likes: [],
      replies: [],
      createdAt: new Date(),
    };

    post.comments.push(comment);
    await post.save();

    if (req.io) {
      req.io.emit("newComment", { postId, comment });
    }
    res.status(200).json(comment);
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
      likes: [],
      createdAt: new Date(),
    };
    comment.replies.push(reply);
    await post.save();

    if (req.io) {
      req.io.emit("newReply", { postId, commentId, reply });
    }
    res.status(200).json(reply);
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
    } else {
      comment.likes.push(userId);
    }
    await post.save();

    if (req.io) {
      req.io.to(`post:${postId}`).emit("likeUnlikeComment", { postId, commentId, likes: comment.likes });
    }
    res.status(200).json({ likes: comment.likes });
  } catch (err) {
    console.error("Error in likeUnlikeComment:", err);
    res.status(500).json({ error: err.message });
  }
};

const likeUnlikeReply = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const reply = comment.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ error: "Reply not found" });
    }

    if (!reply.likes) reply.likes = [];

    const userLikedReply = reply.likes.includes(userId);

    if (userLikedReply) {
      reply.likes.pull(userId);
    } else {
      reply.likes.push(userId);
    }
    await post.save();

    if (req.io) {
      req.io.to(`post:${postId}`).emit("likeUnlikeReply", { postId, commentId, replyId, likes: reply.likes });
    }
    res.status(200).json({ likes: reply.likes });
  } catch (err) {
    console.error("Error in likeUnlikeReply:", err);
    res.status(500).json({ error: err.message });
  }
};

const editComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.userId.toString() !== userId.toString() && post.postedBy.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized to edit this comment" });
    }

    comment.text = text;
    await post.save();

    if (req.io) {
      req.io.to(`post:${postId}`).emit("editComment", { postId, commentId, text });
    }
    res.status(200).json(comment);
  } catch (error) {
    console.error("Error in editComment:", error);
    res.status(500).json({ error: error.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      return res.status(404).json({ error: "Post not found or banned" });
    }

    if (replyId) {
      const comment = post.comments.id(commentId);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      const reply = comment.replies.id(replyId);
      if (!reply) {
        return res.status(404).json({ error: "Reply not found" });
      }
      if (reply.userId.toString() !== userId.toString() && userId.toString() !== post.postedBy.toString()) {
        return res.status(401).json({ error: "Unauthorized to delete this reply" });
      }
      comment.replies.pull({ _id: replyId });
    } else {
      const comment = post.comments.id(commentId);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      if (comment.userId.toString() !== userId.toString() && userId.toString() !== post.postedBy.toString()) {
        return res.status(401).json({ error: "Unauthorized to delete this comment" });
      }
      post.comments.pull({ _id: commentId });
    }

    await post.save();
    res.status(200).json({ message: replyId ? "Reply deleted successfully" : "Comment deleted successfully" });
  } catch (err) {
    console.error("Error in deleteComment:", err);
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

    if (req.io) {
      req.io.to(`post:${id}`).emit("postBanned", { postId: id });
    }
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

    if (req.io) {
      req.io.to(`post:${id}`).emit("postUnbanned", { postId: id });
    }
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
      postedBy: { $in: [...following, userId] },
      isBanned: false,
    })
      .sort({ createdAt: -1 })
      .populate("postedBy", "username profilePic");

    res.status(200).json(feedPosts);
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

const getAllPosts = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .populate("postedBy", "username profilePic name isAdmin")
      .lean();

    res.status(200).json(posts);
  } catch (error) {
    console.error("Error in getAllPosts:", error);
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
    const { postId } = req.params;
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
    post.replies = post.replies || [];
    post.replies.push(reply);

    await post.save();
    if (req.io) {
      req.io.to(`post:${postId}`).emit("newReply", { postId, reply });
    }
    res.status(200).json(reply);
  } catch (err) {
    console.error("Error in replyToPost:", err);
    res.status(500).json({ error: err.message });
  }
};

const repostPost = async (req, res) => {
  try {
    const { postId } = req.params;
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
      previewUrl: originalPost.previewUrl,
      originalPost: postId,
      isRepost: true,
    });
    await repost.save();

    if (req.io) {
      const populatedRepost = await Post.findById(repost._id).populate("postedBy", "username profilePic");
      req.io.emit("newPost", populatedRepost);
    }
    res.status(201).json(repost);
  } catch (error) {
    console.error("Error in repostPost:", error);
    res.status(500).json({ error: error.message });
  }
};

const getSuggestedPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const following = user.following || [];
    const suggestedPosts = await Post.find({
      postedBy: { $nin: [userId, ...following] },
      isBanned: false,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("postedBy", "username profilePic");

    res.status(200).json(suggestedPosts);
  } catch (error) {
    console.error("Error in getSuggestedPosts:", error);
    res.status(500).json({ error: error.message });
  }
};

export {
  createPost,
  createStory,
  getPost,
  deletePost,
  likeUnlikePost,
  bookmarkUnbookmarkPost,
  getBookmarks,
  commentOnPost,
  replyToComment,
  likeUnlikeComment,
  likeUnlikeReply,
  editComment,
  deleteComment,
  banPost,
  unbanPost,
  getFeedPosts,
  getUserPosts,
  getAllPosts,
  getStories,
  replyToPost,
  editPost,
  repostPost,
  getSuggestedPosts,
};