import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import { Post, Reply } from "../models/postModel.js";
import User from "../models/userModel.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

app.use((req, res, next) => {
  req.io = io;
  req.io.getRecipientSocketId = getRecipientSocketId;
  next();
});

const userSocketMap = {};
const typingUsers = new Map();

export const getRecipientSocketId = (recipientId) => {
  return userSocketMap[recipientId];
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  const userId = socket.handshake.query.userId;

  if (userId && userId !== "undefined") {
    userSocketMap[userId] = socket.id;
    console.log("Updated userSocketMap:", userSocketMap);
  } else {
    console.warn("Invalid userId on connection:", userId);
    socket.disconnect(true);
    return;
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("joinPostRoom", (postId) => {
    if (!postId) return;
    socket.join(`posts:${postId}`);
  });

  socket.on("leavePostRoom", (postId) => {
    if (!postId) return;
    socket.leave(`posts:${postId}`);
  });

  socket.on("newPost", async (post) => {
    try {
      if (!post?._id) return;
      const populatedPost = await Post.findById(post._id)
        .populate("postedBy", "username profilePic")
        .lean();
      if (!populatedPost) return;
      const user = await User.findById(post.postedBy).select("following").lean();
      if (!user) return;
      const followerIds = [...(user.following || []), post.postedBy.toString()];
      followerIds.forEach((followerId) => {
        const socketId = getRecipientSocketId(followerId);
        if (socketId) io.to(socketId).emit("newPost", populatedPost);
      });
      io.emit("newFeedPost", populatedPost);
    } catch (error) {
      console.error("Error broadcasting new post:", error.message);
    }
  });

  socket.on("newComment", async ({ postId, comment }) => {
    try {
      if (!postId || !comment) return;
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      if (!post) return;
      io.to(`posts:${postId}`).emit("newComment", { postId, comment, post });
    } catch (error) {
      console.error("Error broadcasting new comment:", error.message);
    }
  });

  socket.on("newReply", async ({ postId, commentId, reply }) => {
    try {
      if (!postId || !commentId || !reply) return;
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      if (!post) return;
      io.to(`posts:${postId}`).emit("newReply", { postId, commentId, reply, post });
    } catch (error) {
      console.error("Error broadcasting new reply:", error.message);
    }
  });

  socket.on("likeUnlikePost", async ({ postId, userId, likes }) => {
    try {
      if (!postId || !userId) return;
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .lean();
      if (!post) return;
      io.to(`posts:${postId}`).emit("likeUnlikePost", { postId, userId, likes, post });
    } catch (error) {
      console.error("Error broadcasting like/unlike:", error.message);
    }
  });

  socket.on("likeUnlikeComment", async ({ postId, commentId, userId, likes }) => {
    try {
      if (!postId || !commentId || !userId) return;
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      if (!post) return;
      io.to(`posts:${postId}`).emit("likeUnlikeComment", { postId, commentId, userId, likes, post });
    } catch (error) {
      console.error("Error broadcasting comment like/unlike:", error.message);
    }
  });

  socket.on("likeUnlikeReply", async ({ postId, commentId, replyId, userId, likes }) => {
    try {
      if (!postId || !commentId || !replyId || !userId) return;
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      if (!post) return;
      io.to(`posts:${postId}`).emit("likeUnlikeReply", { postId, commentId, replyId, userId, likes, post });
    } catch (error) {
      console.error("Error broadcasting reply like/unlike:", error.message);
    }
  });

  socket.on("editComment", async ({ postId, commentId, text }) => {
    try {
      if (!postId || !commentId || !text) return;
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      if (!post) return;
      io.to(`posts:${postId}`).emit("editComment", { postId, commentId, text, post });
    } catch (error) {
      console.error("Error broadcasting edit comment:", error.message);
    }
  });

  socket.on("editReply", async ({ postId, commentId, replyId, text }) => {
    try {
      if (!postId || !commentId || !replyId || !text) return;
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      if (!post) return;
      io.to(`posts:${postId}`).emit("editReply", { postId, commentId, replyId, text, post });
    } catch (error) {
      console.error("Error broadcasting edit reply:", error.message);
    }
  });

  socket.on("deleteComment", async ({ postId, commentId }) => {
    try {
      if (!postId || !commentId) return;
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      if (!post) return;
      io.to(`posts:${postId}`).emit("deleteComment", { postId, commentId, post });
    } catch (error) {
      console.error("Error broadcasting delete comment:", error.message);
    }
  });

  socket.on("deleteReply", async ({ postId, commentId, replyId }) => {
    try {
      if (!postId || !commentId || !replyId) return;
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      if (!post) return;
      io.to(`posts:${postId}`).emit("deleteReply", { postId, commentId, replyId, post });
    } catch (error) {
      console.error("Error broadcasting delete reply:", error.message);
    }
  });

  socket.on("postsDeleted", async ({ postId, userId }) => {
    try {
      if (!postId || !userId) return;
      io.to(`posts:${postId}`).emit("postsDeleted", { postId, userId });
      io.emit("postsDeletedFromFeed", { postId });
    } catch (error) {
      console.error("Error broadcasting post deleted:", error.message);
    }
  });

  socket.on("newMessage", async (message) => {
    try {
      if (!message?.recipientId || !message?.sender?._id || !message?.conversationId) {
        console.warn("Invalid message data:", message);
        return;
      }
      console.log("Broadcasting newMessage:", message);
      const recipientSocketId = getRecipientSocketId(message.recipientId);
      const senderSocketId = getRecipientSocketId(message.sender._id);
      if (recipientSocketId) {
        console.log(`Emitting to recipient: ${recipientSocketId}`);
        io.to(recipientSocketId).emit("newMessage", message);
      } else {
        console.warn(`Recipient socket not found: ${message.recipientId}`);
      }
      if (senderSocketId) {
        console.log(`Emitting to sender: ${senderSocketId}`);
        io.to(senderSocketId).emit("newMessage", message);
      } else {
        console.warn(`Sender socket not found: ${message.sender._id}`);
      }
    } catch (error) {
      console.error("Error broadcasting new message:", error.message);
    }
  });

  socket.on("messageDelivered", async ({ messageId, conversationId, recipientId }) => {
    try {
      if (!messageId || !conversationId || !recipientId) {
        console.warn("Invalid messageDelivered data:", { messageId, conversationId, recipientId });
        return;
      }
      const updatedMessage = await Message.findByIdAndUpdate(
        messageId,
        { status: "delivered" },
        { new: true }
      ).lean();
      if (!updatedMessage) {
        console.warn(`Message not found: ${messageId}`);
        return;
      }
      console.log("Broadcasting messageDelivered:", { messageId, conversationId });
      const senderSocketId = getRecipientSocketId(updatedMessage.sender._id);
      const recipientSocketId = getRecipientSocketId(recipientId);
      if (senderSocketId) io.to(senderSocketId).emit("messageDelivered", { messageId, conversationId });
      if (recipientSocketId) io.to(recipientSocketId).emit("messageDelivered", { messageId, conversationId });
    } catch (error) {
      console.error("Error broadcasting message delivered:", error.message);
    }
  });

  socket.on("markMessagesAsSeen", async ({ conversationId, userId }) => {
    try {
      if (!conversationId || !userId) {
        console.warn("Invalid markMessagesAsSeen data:", { conversationId, userId });
        return;
      }
      const conversation = await Conversation.findById(conversationId).lean();
      if (!conversation) {
        console.warn(`Conversation not found: ${conversationId}`);
        return;
      }

      const messages = await Message.find({
        conversationId,
        seen: false,
        sender: { $ne: userId },
      }).lean();

      if (!messages.length) return;

      const seenMessageIds = messages.map((msg) => msg._id.toString());
      await Message.updateMany(
        { conversationId, seen: false, sender: { $ne: userId } },
        { $set: { seen: true, status: "seen" } }
      );

      await Conversation.updateOne(
        { _id: conversationId },
        { $set: { "lastMessage.seen": true } }
      );

      console.log("Broadcasting messagesSeen:", { conversationId, seenMessageIds });
      const participantIds = conversation.participants.map((p) => p.toString());
      participantIds.forEach((participantId) => {
        const socketId = getRecipientSocketId(participantId);
        if (socketId) io.to(socketId).emit("messagesSeen", { conversationId, seenMessages: seenMessageIds });
      });
    } catch (error) {
      console.error("Error marking messages as seen:", error.message);
    }
  });

  let typingTimeout;
  socket.on("typing", async ({ conversationId }) => {
    try {
      if (!conversationId || !userId) {
        console.warn("Invalid typing data:", { conversationId, userId });
        return;
      }
      const conversation = await Conversation.findById(conversationId).lean();
      if (!conversation) {
        console.warn(`Conversation not found: ${conversationId}`);
        return;
      }

      const recipientIds = conversation.participants
        .filter((p) => p.toString() !== userId)
        .map((p) => p.toString());

      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(async () => {
        if (!typingUsers.has(conversationId)) typingUsers.set(conversationId, new Set());
        const conversationTyping = typingUsers.get(conversationId);
        if (!conversationTyping.has(userId)) {
          conversationTyping.add(userId);
          console.log("Broadcasting typing:", { conversationId, userId });
          recipientIds.forEach((recipientId) => {
            const recipientSocketId = getRecipientSocketId(recipientId);
            if (recipientSocketId) io.to(recipientSocketId).emit("typing", { conversationId, userId });
          });
        }
      }, 300);
    } catch (error) {
      console.error("Error broadcasting typing:", error.message);
    }
  });

  socket.on("stopTyping", async ({ conversationId }) => {
    try {
      if (!conversationId || !userId) {
        console.warn("Invalid stopTyping data:", { conversationId, userId });
        return;
      }
      const conversation = await Conversation.findById(conversationId).lean();
      if (!conversation) {
        console.warn(`Conversation not found: ${conversationId}`);
        return;
      }

      const recipientIds = conversation.participants
        .filter((p) => p.toString() !== userId)
        .map((p) => p.toString());

      if (typingUsers.has(conversationId)) {
        const conversationTyping = typingUsers.get(conversationId);
        conversationTyping.delete(userId);
        if (conversationTyping.size === 0) {
          typingUsers.delete(conversationId);
          console.log("Broadcasting stopTyping:", { conversationId, userId });
          recipientIds.forEach((recipientId) => {
            const recipientSocketId = getRecipientSocketId(recipientId);
            if (recipientSocketId) io.to(recipientSocketId).emit("stopTyping", { conversationId, userId });
          });
        }
      }
    } catch (error) {
      console.error("Error broadcasting stopTyping:", error.message);
    }
  });

  socket.on("userFollowed", (data) => {
    console.log(`Broadcasting userFollowed: ${data.followedId} by ${data.follower._id}`);
  });

  socket.on("userUnfollowed", (data) => {
    console.log(`Broadcasting userUnfollowed: ${data.unfollowedId} by ${data.followerId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (userId && userSocketMap[userId] === socket.id) {
      delete userSocketMap[userId];
      console.log("Updated userSocketMap:", userSocketMap);
      typingUsers.forEach((conversationTyping, conversationId) => {
        if (conversationTyping.has(userId)) {
          conversationTyping.delete(userId);
          if (conversationTyping.size === 0) typingUsers.delete(conversationId);
          Conversation.findById(conversationId)
            .lean()
            .then((conversation) => {
              if (conversation) {
                const recipientIds = conversation.participants
                  .filter((p) => p.toString() !== userId)
                  .map((p) => p.toString());
                recipientIds.forEach((recipientId) => {
                  const recipientSocketId = getRecipientSocketId(recipientId);
                  if (recipientSocketId) io.to(recipientSocketId).emit("stopTyping", { conversationId, userId });
                });
              }
            })
            .catch((error) => {
              console.error("Error cleaning up typing on disconnect:", error.message);
            });
        }
      });
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error.message);
  });

  socket.on("reconnect", (attempt) => {
    console.log(`Socket reconnected after ${attempt} attempts: ${socket.id}`);
  });

  socket.on("reconnect_error", (error) => {
    console.error("Socket reconnection error:", error.message);
  });
});

export { io, server, app };



// import { Server } from "socket.io";
// import http from "http";
// import express from "express";
// import Message from "../models/messageModel.js";
// import Conversation from "../models/conversationModel.js";

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
// 	cors: {
// 		origin: "http://localhost:3000",
// 		methods: ["GET", "POST"],
// 	},
// });

// export const getRecipientSocketId = (recipientId) => {
// 	return userSocketMap[recipientId];
// };

// const userSocketMap = {}; // userId: socketId

// io.on("connection", (socket) => {
// 	console.log("user connected", socket.id);
// 	const userId = socket.handshake.query.userId;

// 	if (userId != "undefined") userSocketMap[userId] = socket.id;
// 	io.emit("getOnlineUsers", Object.keys(userSocketMap));

// 	socket.on("markMessagesAsSeen", async ({ conversationId, userId }) => {
// 		try {
// 			await Message.updateMany({ conversationId: conversationId, seen: false }, { $set: { seen: true } });
// 			await Conversation.updateOne({ _id: conversationId }, { $set: { "lastMessage.seen": true } });
// 			io.to(userSocketMap[userId]).emit("messagesSeen", { conversationId });
// 		} catch (error) {
// 			console.log(error);
// 		}
// 	});

// 	socket.on("disconnect", () => {
// 		console.log("user disconnected");
// 		delete userSocketMap[userId];
// 		io.emit("getOnlineUsers", Object.keys(userSocketMap));
// 	});
// });

// export { io, server, app };
