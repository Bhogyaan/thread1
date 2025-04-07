import User from "../models/userModel.js";
import Post from "../models/postModel.js";
import bcrypt from "bcryptjs";
import generateTokenAndSetCookie from "../utils/helpers/generateTokenAndSetCookie.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";





const ADMIN_USERNAME = "adminblog";
const ADMIN_PASSWORD = "Admin123"; 




const getUserProfile = async (req, res) => {
	try {
		const { query } = req.params;
		let user;

		// Check if query is a MongoDB ObjectId or username
		if (mongoose.Types.ObjectId.isValid(query)) {
			user = await User.findById(query).select("-password");
		} else {
			user = await User.findOne({ username: query }).select("-password");
		}

		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		res.status(200).json(user);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};
const signupUser = async (req, res) => {
	try {
		const { name, email, username, password } = req.body;
		const user = await User.findOne({ $or: [{ email }, { username }] });

		if (user) {
			return res.status(400).json({ error: "User already exists" });
		}
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		const newUser = new User({
			name,
			email,
			username,
			password: hashedPassword,
		});
		await newUser.save();

		if (newUser) {
			generateTokenAndSetCookie(newUser._id, res);

			res.status(201).json({
				_id: newUser._id,
				name: newUser.name,
				email: newUser.email,
				username: newUser.username,
				bio: newUser.bio,
				profilePic: newUser.profilePic,
				isAdmin: newUser.isAdmin,
			});
		} else {
			res.status(400).json({ error: "Invalid user data" });
		}
	} catch (err) {
		res.status(500).json({ error: err.message });
		console.log("Error in signupUser: ", err.message);
	}
};

const loginUser = async (req, res) => {
	try {
		const { username, password } = req.body;
		const user = await User.findOne({ username });
		const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");

		if (!user || !isPasswordCorrect) return res.status(400).json({ error: "Invalid username or password" });
		if (user.isBanned) return res.status(403).json({ error: "Account is banned" });

		if (user.isFrozen) {
			user.isFrozen = false;
			await user.save();
		}

		generateTokenAndSetCookie(user._id, res);

		res.status(200).json({
			_id: user._id,
			name: user.name,
			email: user.email,
			username: user.username,
			bio: user.bio,
			profilePic: user.profilePic,
			isAdmin: user.isAdmin,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
		console.log("Error in loginUser: ", error.message);
	}
};

const adminLogin = async (req, res) => {
	try {
		const { username, password } = req.body;

		// Check hardcoded admin credentials
		if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
			return res.status(400).json({ error: "Invalid admin credentials" });
		}

		// Check if admin user exists in DB, if not create it
		let adminUser = await User.findOne({ username: ADMIN_USERNAME });
		if (!adminUser) {
			const salt = await bcrypt.genSalt(10);
			const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
			adminUser = new User({
				name: "Admin Blog",
				username: ADMIN_USERNAME,
				email: "admin@threadsclone.com",
				password: hashedPassword,
				isAdmin: true,
			});
			await adminUser.save();
		}

		generateTokenAndSetCookie(adminUser._id, res);

		res.status(200).json({
			_id: adminUser._id,
			name: adminUser.name,
			username: adminUser.username,
			isAdmin: adminUser.isAdmin,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
		console.log("Error in adminLogin: ", error.message);
	}
};





const promoteToAdmin = async (req, res) => {
	try {
		const { id } = req.params;
		const currentUser = await User.findById(req.user._id);

		// Only the hardcoded admin can promote others
		if (currentUser.username !== ADMIN_USERNAME || !currentUser.isAdmin) {
			return res.status(403).json({ error: "Only the main admin can promote users" });
		}

		const userToPromote = await User.findById(id);
		if (!userToPromote) {
			return res.status(404).json({ error: "User not found" });
		}

		if (userToPromote.isAdmin) {
			return res.status(400).json({ error: "User is already an admin" });
		}

		userToPromote.isAdmin = true;
		await userToPromote.save();

		res.status(200).json({ message: "User promoted to admin successfully" });
	} catch (error) {
		res.status(500).json({ error: error.message });
		console.log("Error in promoteToAdmin: ", error.message);
	}
};

const logoutUser = (req, res) => {
	try {
		res.cookie("jwt", "", { maxAge: 1 });
		res.status(200).json({ message: "User logged out successfully" });
	} catch (err) {
		res.status(500).json({ error: err.message });
		console.log("Error in logoutUser: ", err.message);
	}
};

const followUnFollowUser = async (req, res) => {
	try {
		const { id } = req.params;
		const userToModify = await User.findById(id);
		const currentUser = await User.findById(req.user._id);

		if (id === req.user._id.toString())
			return res.status(400).json({ error: "You cannot follow/unfollow yourself" });

		if (!userToModify || !currentUser) return res.status(400).json({ error: "User not found" });

		const isFollowing = currentUser.following.includes(id);

		if (isFollowing) {
			await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
			await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });
			res.status(200).json({ message: "User unfollowed successfully" });
		} else {
			await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
			await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });
			res.status(200).json({ message: "User followed successfully" });
		}
	} catch (err) {
		res.status(500).json({ error: err.message });
		console.log("Error in followUnFollowUser: ", err.message);
	}
};

const updateUser = async (req, res) => {
	const { name, email, username, password, bio } = req.body;
	let { profilePic } = req.body;

	const userId = req.user._id;
	try {
		let user = await User.findById(userId);
		if (!user) return res.status(400).json({ error: "User not found" });

		if (req.params.id !== userId.toString())
			return res.status(400).json({ error: "You cannot update other user's profile" });

		if (password) {
			const salt = await bcrypt.genSalt(10);
			const hashedPassword = await bcrypt.hash(password, salt);
			user.password = hashedPassword;
		}

		if (profilePic) {
			if (user.profilePic) {
				await cloudinary.uploader.destroy(user.profilePic.split("/").pop().split(".")[0]);
			}

			const uploadedResponse = await cloudinary.uploader.upload(profilePic);
			profilePic = uploadedResponse.secure_url;
		}

		user.name = name || user.name;
		user.email = email || user.email;
		user.username = username || user.username;
		user.profilePic = profilePic || user.profilePic;
		user.bio = bio || user.bio;

		user = await user.save();

		await Post.updateMany(
			{ "comments.userId": userId },
			{
				$set: {
					"comments.$[comment].username": user.username,
					"comments.$[comment].userProfilePic": user.profilePic,
				},
			},
			{ arrayFilters: [{ "comment.userId": userId }] }
		);

		user.password = null;

		res.status(200).json(user);
	} catch (err) {
		res.status(500).json({ error: err.message });
		console.log("Error in updateUser: ", err.message);
	}
};

const getSuggestedUsers = async (req, res) => {
	try {
		const userId = req.user._id;
		const usersFollowedByYou = await User.findById(userId).select("following");

		const users = await User.aggregate([
			{
				$match: {
					_id: { $ne: userId },
					isBanned: false,
				},
			},
			{
				$sample: { size: 10 },
			},
		]);
		const filteredUsers = users.filter((user) => !usersFollowedByYou.following.includes(user._id));
		const suggestedUsers = filteredUsers.slice(0, 4);

		suggestedUsers.forEach((user) => (user.password = null));

		res.status(200).json(suggestedUsers);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

const freezeAccount = async (req, res) => {
	try {
		const user = await User.findById(req.user._id);
		if (!user) {
			return res.status(400).json({ error: "User not found" });
		}

		user.isFrozen = true;
		await user.save();

		res.status(200).json({ success: true });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

const banUser = async (req, res) => {
	try {
		if (!req.user.isAdmin) return res.status(403).json({ error: "Admin access required" });

		const { id } = req.params;
		const user = await User.findById(id);
		if (!user) return res.status(404).json({ error: "User not found" });

		user.isBanned = true;
		await user.save();

		res.status(200).json({ message: "User banned successfully" });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

const unbanUser = async (req, res) => {
	try {
		if (!req.user.isAdmin) return res.status(403).json({ error: "Admin access required" });

		const { id } = req.params;
		const user = await User.findById(id);
		if (!user) return res.status(404).json({ error: "User not found" });

		user.isBanned = false;
		await user.save();

		res.status(200).json({ message: "User unbanned successfully" });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

const getUserDashboard = async (req, res) => {
	try {
		const userId = req.user._id;
		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });

		const posts = await Post.find({ postedBy: userId });
		const totalPosts = posts.length;
		const totalLikes = posts.reduce((acc, post) => acc + post.likes.length, 0);
		const totalComments = posts.reduce((acc, post) => acc + post.comments.length, 0);
		const totalInteractions = totalLikes + totalComments;

		res.status(200).json({
			totalPosts,
			totalLikes,
			totalComments,
			totalInteractions,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

const getAdminDashboard = async (req, res) => {
	try {
		if (!req.user.isAdmin) return res.status(403).json({ error: "Admin access required" });

		const totalUsers = await User.countDocuments({ isBanned: false });
		const totalBannedUsers = await User.countDocuments({ isBanned: true });
		const totalPosts = await Post.countDocuments({ isBanned: false });
		const totalBannedPosts = await Post.countDocuments({ isBanned: true });

		res.status(200).json({
			totalUsers,
			totalBannedUsers,
			totalPosts,
			totalBannedPosts,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};



export {
	signupUser,
	loginUser,
	adminLogin,
	logoutUser,
	followUnFollowUser,
	updateUser,
	promoteToAdmin,
	getUserProfile,
	getSuggestedUsers,
	freezeAccount,
	banUser,
	unbanUser,
	getUserDashboard,
	getAdminDashboard,
};