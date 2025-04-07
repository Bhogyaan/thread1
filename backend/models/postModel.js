import mongoose from "mongoose";

const commentSchema = mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	text: {
		type: String,
		required: true,
	},
	userProfilePic: {
		type: String,
	},
	username: {
		type: String,
	},
	likes: {
		type: [mongoose.Schema.Types.ObjectId],
		ref: "User",
		default: [],
	},
	replies: [
		{
			userId: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
				required: true,
			},
			text: {
				type: String,
				required: true,
			},
			userProfilePic: {
				type: String,
			},
			username: {
				type: String,
			},
			createdAt: {
				type: Date,
				default: Date.now,
			},
		},
	],
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

const postSchema = mongoose.Schema(
	{
		postedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		text: {
			type: String,
			maxLength: 500,
		},
		media: {
			type: String, // URL to image, video, audio, or document
		},
		mediaType: {
			type: String, // "image", "video", "audio", "document"
			enum: ["image", "video", "audio", "document"],
		},
		previewUrl: {
			type: String, // URL for LinkedIn-style preview (e.g., thumbnail)
		},
		likes: {
			type: [mongoose.Schema.Types.ObjectId],
			ref: "User",
			default: [],
		},
		comments: [commentSchema], // Replaced replies with comments
		isBanned: {
			type: Boolean,
			default: false,
		},
		bannedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{
		timestamps: true,
	}
);

const Post = mongoose.model("Post", postSchema);

export default Post;