import mongoose from "mongoose";

const storySchema = mongoose.Schema(
	{
		postedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		media: {
			type: String, // URL to image, video, or audio
			required: true,
		},
		mediaType: {
			type: String, // "image", "video", "audio"
			enum: ["image", "video", "audio"],
			required: true,
		},
		duration: {
			type: Number, // Duration in seconds (max 30 for videos)
			default: 0,
		},
		expiresAt: {
			type: Date,
			default: () => Date.now() + 24 * 60 * 60 * 1000, // Expires in 24 hours
			index: { expires: "0s" }, // MongoDB TTL index to auto-delete
		},
	},
	{
		timestamps: true,
	}
);

const Story = mongoose.model("Story", storySchema);

export default Story;