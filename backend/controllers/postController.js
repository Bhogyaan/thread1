import { Post, Reply } from "../models/postModel.js";
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

const uploadToCloudinary = async (filePath, options) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, options);
    return result;
  } catch (error) {
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`Failed to delete from Cloudinary: ${error.message}`);
  }
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

      if (detectedMediaType === "document") {
        const uploadResponse = await uploadToCloudinary(mediaFile.path, {
          resource_type: "raw",
          use_filename: true,
          folder: "documents",
        });
        mediaUrl = uploadResponse.secure_url;
        originalFilename = mediaFile.originalname;

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
          previewUrl = null;
        }
      } else if (mediaFile.mimetype === "image/heic") {
        uploadOptions.transformation = [{ fetch_format: "jpg" }];
        detectedMediaType = "image";
      } else {
        const uploadedResponse = await uploadToCloudinary(mediaFile.path, uploadOptions);
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
    const { caption } = req.body;
    const mediaFile = req.file;
    const postedBy = req.user._id;

    if (!mediaFile) {
      return res.status(400).json({ error: 'Media is required for a story' });
    }

    const user = await User.findById(postedBy);
    if (!user || user.isBanned) {
      if (mediaFile && fs.existsSync(mediaFile.path)) await fs.unlink(mediaFile.path);
      return res.status(404).json({ error: 'User not found or banned' });
    }

    let mediaType = Object.keys(SUPPORTED_FORMATS).find((key) =>
      SUPPORTED_FORMATS[key].includes(mediaFile.mimetype)
    );
    if (!mediaType || !['image', 'video', 'audio'].includes(mediaType)) {
      await fs.unlink(mediaFile.path);
      return res.status(400).json({ error: `Unsupported media type: ${mediaFile.mimetype}. Use image, video, or audio.` });
    }

    if (mediaFile.size > MAX_SIZES[mediaType]) {
      await fs.unlink(mediaFile.path);
      return res.status(400).json({
        error: `${mediaType} size exceeds ${MAX_SIZES[mediaType] / (1024 * 1024)}MB limit`,
      });
    }

    const uploadOptions = {
      resource_type: mediaType === 'video' || mediaType === 'audio' ? 'video' : 'image',
      folder: 'stories',
    };

    if (mediaFile.mimetype === 'image/heic') {
      uploadOptions.transformation = [{ fetch_format: 'jpg' }];
      mediaType = 'image';
    }

    const uploadedResponse = await uploadToCloudinary(mediaFile.path, uploadOptions);
    const mediaUrl = uploadedResponse.secure_url;
    const previewUrl = mediaType === 'image' || mediaType === 'video' ? uploadedResponse.thumbnail_url : null;
    const duration = mediaType === 'video' ? uploadedResponse.duration : 0;

    const newStory = new Story({
      postedBy,
      username: user.username,
      profilePic: user.profilePic || '',
      caption: caption || '',
      media: mediaUrl,
      mediaType,
      duration,
      previewUrl,
      createdAt: new Date(),
    });
    await newStory.save();
    await fs.unlink(mediaFile.path);

    const populatedStory = await Story.findById(newStory._id).populate('postedBy', 'username profilePic');

    if (req.io) {
      const followerIds = [...(user.following || []), user._id.toString()];
      followerIds.forEach((followerId) => {
        const socketId = req.io.getRecipientSocketId(followerId);
        if (socketId) {
          req.io.to(socketId).emit('newStory', populatedStory);
        }
      });
    }

    res.status(201).json({
      _id: populatedStory._id,
      media: populatedStory.media,
      mediaType: populatedStory.mediaType,
      caption: populatedStory.caption,
      duration: populatedStory.duration,
      previewUrl: populatedStory.previewUrl,
      createdAt: populatedStory.createdAt,
      postedBy: {
        _id: populatedStory.postedBy._id,
        username: populatedStory.postedBy.username,
        profilePic: populatedStory.postedBy.profilePic
      }
    });
  } catch (err) {
    console.error('Error in createStory:', err);
    if (req.file && fs.existsSync(req.file.path)) await fs.unlink(req.file.path);
    res.status(500).json({ error: `Failed to create story: ${err.message}` });
  }
};

const deleteStory = async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.user._id;

    const story = await Story.findById(storyId).populate('postedBy', 'username profilePic');
    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Only the story owner can delete it
    if (story.postedBy._id.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Unauthorized to delete this story' });
    }

    // Delete from Cloudinary
    if (story.media) {
      const publicId = story.media.split('/').pop().split('.')[0];
      await deleteFromCloudinary(`stories/${publicId}`);
    }

    // Delete from database
    await Story.findByIdAndDelete(storyId);

    // Emit socket event if needed
    if (req.io) {
      req.io.emit('storyDeleted', { storyId, userId: story.postedBy._id });
    }

    res.status(200).json({ 
      message: 'Story deleted successfully',
      deletedStory: {
        _id: story._id,
        postedBy: {
          _id: story.postedBy._id,
          username: story.postedBy.username,
          profilePic: story.postedBy.profilePic
        }
      }
    });
  } catch (err) {
    console.error('Error in deleteStory:', err);
    res.status(500).json({ error: `Failed to delete story: ${err.message}` });
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
      await deleteFromCloudinary(publicId);
    }

    if (post.previewUrl) {
      const previewPublicId = post.previewUrl.split("/").pop().split(".")[0];
      await deleteFromCloudinary(previewPublicId);
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
    const post = await Post.findById(req.params.id)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic")
      .populate({
        path: "comments.replies",
        populate: [
          { path: "userId", select: "username profilePic" },
          { path: "replies", populate: { path: "userId", select: "username profilePic" } }
        ]
      });
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
    const { postId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const user = await User.findById(userId).select("username profilePic");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const comment = {
      userId,
      text,
      username: user.username,
      userProfilePic: user.profilePic,
      createdAt: new Date(),
      likes: [],
      replies: [],
    };

    post.comments.push(comment);
    await post.save();

    const populatedPost = await Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic")
      .populate({
        path: "comments.replies",
        populate: { path: "userId", select: "username profilePic" }
      });

    const newComment = populatedPost.comments[populatedPost.comments.length - 1];

    if (req.io) {
      req.io.to(`post:${postId}`).emit("newComment", { postId, comment: newComment, post: populatedPost });
    }
    res.status(201).json(newComment);
  } catch (err) {
    console.error("Error in commentOnPost:", err);
    res.status(500).json({ error: err.message });
  }
};

const addReply = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { text, parentId } = req.body;
    const userId = req.user._id;

    if (!text) {
      return res.status(400).json({ error: "Reply text is required" });
    }

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const user = await User.findById(userId).select("username profilePic");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let newReply;
    let parentCommentId = commentId;

    if (!parentId) {
      const comment = post.comments.id(commentId);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      newReply = new Reply({
        userId,
        text,
        username: user.username,
        userProfilePic: user.profilePic,
        parentId: commentId,
        parentType: "Comment",
        depth: 1,
      });
      await newReply.save();

      comment.replies.push(newReply._id);
    } else {
      const parentReply = await Reply.findById(parentId);
      if (!parentReply) {
        return res.status(404).json({ error: "Parent reply not found" });
      }

      newReply = new Reply({
        userId,
        text,
        username: user.username,
        userProfilePic: user.profilePic,
        parentId,
        parentType: "Reply",
        depth: parentReply.depth + 1,
      });
      await newReply.save();

      parentReply.replies.push(newReply._id);
      await parentReply.save();

      const comment = post.comments.find(c => c.replies.includes(parentId));
      parentCommentId = comment ? comment._id : commentId;
    }

    await post.save();

    const populatedPost = await Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic")
      .populate({
        path: "comments.replies",
        populate: [
          { path: "userId", select: "username profilePic" },
          { path: "replies", populate: { path: "userId", select: "username profilePic" } }
        ]
      });

    const populatedReply = await Reply.findById(newReply._id)
      .populate("userId", "username profilePic");

    if (req.io) {
      req.io.to(`post:${postId}`).emit("newReply", {
        postId,
        commentId: parentCommentId,
        reply: populatedReply,
        post: populatedPost
      });
    }

    res.status(201).json(populatedReply);
  } catch (err) {
    console.error("Error in addReply:", err);
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

    const populatedPost = await Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic")
      .populate({
        path: "comments.replies",
        populate: { path: "userId", select: "username profilePic" }
      });

    if (req.io) {
      req.io.to(`post:${postId}`).emit("likeUnlikeComment", {
        postId,
        commentId,
        userId,
        likes: comment.likes,
        post: populatedPost
      });
    }

    res.status(200).json({ likes: comment.likes });
  } catch (err) {
    console.error("Error in likeUnlikeComment:", err);
    res.status(500).json({ error: err.message });
  }
};

const likeUnlikeReply = async (req, res) => {
  try {
    const { postId, replyId } = req.params;
    const userId = req.user._id;

    const reply = await Reply.findById(replyId);
    if (!reply) {
      return res.status(404).json({ error: "Reply not found" });
    }

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const userLikedReply = reply.likes.includes(userId);

    if (userLikedReply) {
      reply.likes.pull(userId);
    } else {
      reply.likes.push(userId);
    }
    await reply.save();

    const populatedPost = await Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic")
      .populate({
        path: "comments.replies",
        populate: [
          { path: "userId", select: "username profilePic" },
          { path: "replies", populate: { path: "userId", select: "username profilePic" } }
        ]
      });

    let parentCommentId;
    for (const comment of post.comments) {
      if (comment.replies.includes(replyId)) {
        parentCommentId = comment._id;
        break;
      }
    }

    if (req.io) {
      req.io.to(`post:${postId}`).emit("likeUnlikeReply", {
        postId,
        commentId: parentCommentId,
        replyId,
        userId,
        likes: reply.likes,
        post: populatedPost
      });
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
    comment.isEdited = true;
    comment.updatedAt = new Date();
    await post.save();

    const populatedPost = await Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic")
      .populate({
        path: "comments.replies",
        populate: { path: "userId", select: "username profilePic" }
      });

    if (req.io) {
      req.io.to(`post:${postId}`).emit("editComment", {
        postId,
        commentId,
        text,
        post: populatedPost
      });
    }

    res.status(200).json(comment);
  } catch (error) {
    console.error("Error in editComment:", error);
    res.status(500).json({ error: error.message });
  }
};

const editReply = async (req, res) => {
  try {
    const { postId, replyId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const reply = await Reply.findById(replyId);
    if (!reply) {
      return res.status(404).json({ error: "Reply not found" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (reply.userId.toString() !== userId.toString() && post.postedBy.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Unauthorized to edit this reply" });
    }

    reply.text = text;
    reply.isEdited = true;
    reply.updatedAt = new Date();
    await reply.save();

    const populatedPost = await Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic")
      .populate({
        path: "comments.replies",
        populate: [
          { path: "userId", select: "username profilePic" },
          { path: "replies", populate: { path: "userId", select: "username profilePic" } }
        ]
      });

    let parentCommentId;
    for (const comment of post.comments) {
      if (comment.replies.includes(replyId)) {
        parentCommentId = comment._id;
        break;
      }
    }

    if (req.io) {
      req.io.to(`post:${postId}`).emit("editReply", {
        postId,
        commentId: parentCommentId,
        replyId,
        text,
        post: populatedPost
      });
    }

    res.status(200).json(reply);
  } catch (error) {
    console.error("Error in editReply:", error);
    res.status(500).json({ error: error.message });
  }
};

const deleteComment = async (req, res) => {
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

    if (comment.userId.toString() !== userId.toString() && userId.toString() !== post.postedBy.toString()) {
      return res.status(401).json({ error: "Unauthorized to delete this comment" });
    }

    await Reply.deleteMany({ _id: { $in: comment.replies } });

    post.comments.pull({ _id: commentId });
    await post.save();

    const populatedPost = await Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic")
      .populate({
        path: "comments.replies",
        populate: { path: "userId", select: "username profilePic" }
      });

    if (req.io) {
      req.io.to(`post:${postId}`).emit("deleteComment", {
        postId,
        commentId,
        post: populatedPost
      });
    }

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Error in deleteComment:", err);
    res.status(500).json({ error: err

.message });
  }
};

const deleteReply = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.isAdmin;

    const post = await Post.findById(postId);
    if (!post || post.isBanned) {
      return res.status(404).json({ error: "Post not found or banned" });
    }

    const reply = await Reply.findById(replyId);
    if (!reply) {
      return res.status(404).json({ error: "Reply not found" });
    }

    if (reply.userId.toString() !== userId.toString() && !isAdmin) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await Reply.deleteMany({ _id: { $in: reply.replies } });

    if (reply.parentType === "Comment") {
      const comment = post.comments.id(commentId);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      comment.replies.pull(replyId);
    } else {
      const parentReply = await Reply.findById(reply.parentId);
      if (parentReply) {
        parentReply.replies.pull(replyId);
        await parentReply.save();
      }
    }

    await Reply.findByIdAndDelete(replyId);
    await post.save();

    const populatedPost = await Post.findById(postId)
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic")
      .populate({
        path: "comments.replies",
        populate: [
          { path: "userId", select: "username profilePic" },
          { path: "replies", populate: { path: "userId", select: "username profilePic" } }
        ]
      });

    if (req.io) {
      req.io.to(`post:${postId}`).emit("deleteReply", {
        postId,
        commentId,
        replyId,
        post: populatedPost
      });
    }

    res.status(200).json({ message: "Reply deleted successfully" });
  } catch (err) {
    console.error("Error in deleteReply:", err);
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
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic")
      .populate({
        path: "comments.replies",
        populate: { path: "userId", select: "username profilePic" }
      });

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
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic")
      .populate({
        path: "comments.replies",
        populate: { path: "userId", select: "username profilePic" }
      });

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
      .populate("comments.userId", "username profilePic")
      .populate({
        path: "comments.replies",
        populate: { path: "userId", select: "username profilePic" }
      })
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
      return res.status(404).json({ error: 'User not found' });
    }

    const following = user.following || [];
    const stories = await Story.find({
      $or: [
        { postedBy: userId },
        { postedBy: { $in: following } }
      ]
    })
      .populate('postedBy', 'username profilePic')
      .sort({ createdAt: -1 });

    // Transform the data to include only necessary fields
    const formattedStories = stories.map(story => ({
      _id: story._id,
      media: story.media,
      mediaType: story.mediaType,
      caption: story.caption,
      duration: story.duration,
      previewUrl: story.previewUrl,
      createdAt: story.createdAt,
      postedBy: {
        _id: story.postedBy._id,
        username: story.postedBy.username,
        profilePic: story.postedBy.profilePic
      }
    }));

    res.status(200).json(formattedStories);
  } catch (err) {
    console.error('Error in getStories:', err);
    res.status(500).json({ error: `Failed to fetch stories: ${err.message}` });
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
      .populate("postedBy", "username profilePic")
      .populate("comments.userId", "username profilePic")
      .populate({
        path: "comments.replies",
        populate: { path: "userId", select: "username profilePic" }
      });

    res.status(200).json(suggestedPosts);
  } catch (error) {
    console.error("Error in getSuggestedPosts:", error);
    res.status(500).json({ error: error.message });
  }
};

const getPaginatedComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const post = await Post.findById(postId)
      .select("comments")
      .slice("comments", [skip, limit])
      .populate("comments.userId", "username profilePic")
      .populate({
        path: "comments.replies",
        populate: [
          { path: "userId", select: "username profilePic" },
          { path: "replies", populate: { path: "userId", select: "username profilePic" } }
        ]
      });

    if (!post || post.isBanned) {
      return res.status(404).json({ error: "Post not found or banned" });
    }

    res.status(200).json(post.comments);
  } catch (err) {
    console.error("Error in getPaginatedComments:", err);
    res.status(500).json({ error: err.message });
  }
};

export {
  createPost,
  createStory,
  deleteStory,
  getPost,
  deletePost,
  likeUnlikePost,
  bookmarkUnbookmarkPost,
  getBookmarks,
  commentOnPost,
  addReply,
  likeUnlikeComment,
  likeUnlikeReply,
  editComment,
  editReply,
  deleteComment,
  deleteReply,
  banPost,
  unbanPost,
  getFeedPosts,
  getUserPosts,
  getAllPosts,
  getStories,
  editPost,
  getSuggestedPosts,
  getPaginatedComments,
};