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
		res.status(500).json({ error: err.message });
		console.log(err);
	}
};

const createStory = async (req, res) => {
	try {
		const { media, mediaType } = req.body;
		const postedBy = req.user._id;

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
		res.status(500).json({ error: err.message });
	}
};

const getPost = async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);
		if (!post || post.isBanned) {
			return res.status(404).json({ error: "Post not found or banned" });
		}
		res.status(200).json(post);
	} catch (err) {
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
		res.status(500).json({ error: err.message });
	}
};

const commentOnPost = async (req, res) => {
	try {
		const { text } = req.body;
		const postId = req.params.id;
		const userId = req.user._id;
		const userProfilePic = req.user.profilePic;
		const username = req.user.username;

		if (!text) {
			return res.status(400).json({ error: "Text field is required" });
		}

		const post = await Post.findById(postId);
		if (!post || post.isBanned) {
			return res.status(404).json({ error: "Post not found or banned" });
		}

		const comment = { userId, text, userProfilePic, username };
		post.comments.push(comment);
		await post.save();

		res.status(200).json(comment);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

const replyToComment = async (req, res) => {
	try {
		const { text } = req.body;
		const { postId, commentId } = req.params;
		const userId = req.user._id;
		const userProfilePic = req.user.profilePic;
		const username = req.user.username;

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

		const reply = { userId, text, userProfilePic, username };
		comment.replies.push(reply);
		await post.save();

		res.status(200).json(reply);
	} catch (err) {
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
			res.status(200).json({ message: "Comment unliked successfully" });
		} else {
			comment.likes.push(userId);
			await post.save();
			res.status(200).json({ message: "Comment liked successfully" });
		}
	} catch (err) {
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

		const following = user.following;
		const feedPosts = await Post.find({
			postedBy: { $in: [userId, ...following] },
		})
			.sort({ createdAt: -1 })
			.populate("postedBy", "username profilePic");

		// Ensure replies is always an array
		const sanitizedPosts = feedPosts.map((post) => ({
			...post._doc,
			replies: post.replies || [],
		}));

		res.status(200).json(sanitizedPosts);
	} catch (error) {
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
	  const posts = await Post.find({ postedBy: user._id })
		.sort({ createdAt: -1 })
		.populate("postedBy", "username profilePic");
	  res.status(200).json(posts);
	} catch (error) {
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

		const following = user.following;
		const stories = await Story.find({ postedBy: { $in: following.concat(userId) } }).sort({
			createdAt: -1,
		});

		res.status(200).json(stories);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

const replyToPost = async (req, res) => {
	try {
		const { text } = req.body;
		const postId = req.params.postId;
		const userId = req.user._id;
		const userProfilePic = req.user.profilePic;
		const username = req.user.username;

		if (!text) {
			return res.status(400).json({ error: "Text field is required" });
		}

		const post = await Post.findById(postId);
		if (!post || post.isBanned) {
			return res.status(404).json({ error: "Post not found or banned" });
		}

		const reply = { userId, text, userProfilePic, username };
		post.replies.push(reply);
		await post.save();

		res.status(200).json(reply);
	} catch (err) {
		res.status(500).json({ error: err.message });
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
};