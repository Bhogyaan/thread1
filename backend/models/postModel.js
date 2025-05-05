import mongoose from "mongoose";

// Defining replySchema for unlimited nested replies
const replySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  userProfilePic: { type: String, default: "" },
  username: { type: String, default: "" },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reply" }], // Self-referencing for unlimited nesting
  depth: { type: Number, default: 0 },
  parentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  parentType: { type: String, enum: ["Comment", "Reply"], required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  isEdited: { type: Boolean, default: false }
});

// Defining commentSchema
const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  userProfilePic: { type: String, default: "" },
  username: { type: String, default: "" },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reply" }], // Reference to Reply model
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  isEdited: { type: Boolean, default: false }
});

// Defining postSchema
const postSchema = new mongoose.Schema({
  postedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  text: { type: String, required: true },
  media: { type: String },
  mediaType: {
    type: String,
    enum: ["image", "video", "document", "audio"],
  },
  previewUrl: { type: String, default: null },
  originalFilename: { type: String },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [commentSchema],
  isEdited: { type: Boolean, default: false },
  gridFsId: { type: mongoose.Schema.Types.ObjectId },
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  isBanned: { type: Boolean, default: false },
  bannedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  bannedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true
});

// Virtuals for population
postSchema.virtual('postedByUser', {
  ref: 'User',
  localField: 'postedBy',
  foreignField: '_id',
  justOne: true
});

postSchema.virtual('bannedByUser', {
  ref: 'User',
  localField: 'bannedBy',
  foreignField: '_id',
  justOne: true
});

// Indexes for better performance
postSchema.index({ postedBy: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ likes: 1 });
postSchema.index({ 'comments._id': 1 });
postSchema.index({ 'comments.replies': 1 });

const Post = mongoose.model("Post", postSchema);
const Reply = mongoose.model("Reply", replySchema);

export { Post, Reply };