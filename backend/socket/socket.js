import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/messageModel.js";
import Conversation from "../models/conversationModel.js";
import Post from "../models/postModel.js";
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
  const socketId = userSocketMap[recipientId];
  console.log(`getRecipientSocketId for ${recipientId}: ${socketId || "not found"}`);
  return socketId;
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  const userId = socket.handshake.query.userId;

  if (userId && userId !== "undefined") {
    userSocketMap[userId] = socket.id;
    console.log(`Mapped user ${userId} to socket ${socket.id}`);
  } else {
    console.warn("Invalid userId on connection:", userId);
    socket.disconnect(true);
    return;
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("joinPostRoom", (postId) => {
    if (!postId) {
      console.warn("Invalid postId for joinPostRoom:", postId);
      return;
    }
    socket.join(`post:${postId}`);
    console.log(`User ${userId} joined post room: post:${postId}`);
  });

  socket.on("leavePostRoom", (postId) => {
    if (!postId) {
      console.warn("Invalid postId for leavePostRoom:", postId);
      return;
    }
    socket.leave(`post:${postId}`);
    console.log(`User ${userId} left post room: post:${postId}`);
  });

  socket.on("newPost", async (post) => {
    try {
      if (!post?._id) {
        console.warn("Invalid post data:", post);
        return;
      }
      const populatedPost = await Post.findById(post._id)
        .populate("postedBy", "username profilePic")
        .lean();
      if (!populatedPost) {
        console.warn(`Post not found: ${post._id}`);
        return;
      }
      const user = await User.findById(post.postedBy).select("following").lean();
      if (!user) {
        console.warn(`User not found: ${post.postedBy}`);
        return;
      }
      const followerIds = [...(user.following || []), post.postedBy.toString()];
      followerIds.forEach((followerId) => {
        const socketId = getRecipientSocketId(followerId);
        if (socketId) {
          console.log(`Emitting newPost to ${followerId}:`, populatedPost._id);
          io.to(socketId).emit("newPost", populatedPost);
        }
      });
      console.log(`Emitting newFeedPost: ${populatedPost._id}`);
      io.emit("newFeedPost", populatedPost);
    } catch (error) {
      console.error("Error broadcasting new post:", error.message);
    }
  });

  socket.on("newComment", async ({ postId, comment }) => {
    try {
      if (!postId || !comment) {
        console.warn("Invalid newComment data:", { postId, comment });
        return;
      }
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      if (!post) {
        console.warn(`Post not found: ${postId}`);
        return;
      }
      console.log(`Emitting newComment to post:${postId}`);
      io.to(`post:${postId}`).emit("newComment", { postId, comment, post });
    } catch (error) {
      console.error("Error broadcasting new comment:", error.message);
    }
  });

  socket.on("newReply", async ({ postId, commentId, reply }) => {
    try {
      if (!postId || !commentId || !reply) {
        console.warn("Invalid newReply data:", { postId, commentId, reply });
        return;
      }
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      if (!post) {
        console.warn(`Post not found: ${postId}`);
        return;
      }
      console.log(`Emitting newReply to post:${postId}`);
      io.to(`post:${postId}`).emit("newReply", { postId, commentId, reply, post });
    } catch (error) {
      console.error("Error broadcasting new reply:", error.message);
    }
  });

  socket.on("likeUnlikePost", async ({ postId, userId, likes }) => {
    try {
      if (!postId || !userId) {
        console.warn("Invalid likeUnlikePost data:", { postId, userId });
        return;
      }
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .lean();
      if (!post) {
        console.warn(`Post not found: ${postId}`);
        return;
      }
      console.log(`Emitting likeUnlikePost to post:${postId}`);
      io.to(`post:${postId}`).emit("likeUnlikePost", { postId, userId, likes, post });
    } catch (error) {
      console.error("Error broadcasting like/unlike:", error.message);
    }
  });

  socket.on("likeUnlikeComment", async ({ postId, commentId, userId, likes }) => {
    try {
      if (!postId || !commentId || !userId) {
        console.warn("Invalid likeUnlikeComment data:", { postId, commentId, userId });
        return;
      }
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      if (!post) {
        console.warn(`Post not found: ${postId}`);
        return;
      }
      console.log(`Emitting likeUnlikeComment to post:${postId}`);
      io.to(`post:${postId}`).emit("likeUnlikeComment", { postId, commentId, userId, likes, post });
    } catch (error) {
      console.error("Error broadcasting comment like/unlike:", error.message);
    }
  });

  socket.on("likeUnlikeReply", async ({ postId, commentId, replyId, userId, likes }) => {
    try {
      if (!postId || !commentId || !replyId || !userId) {
        console.warn("Invalid likeUnlikeReply data:", { postId, commentId, replyId, userId });
        return;
      }
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      if (!post) {
        console.warn(`Post not found: ${postId}`);
        return;
      }
      console.log(`Emitting likeUnlikeReply to post:${postId}`);
      io.to(`post:${postId}`).emit("likeUnlikeReply", { postId, commentId, replyId, userId, likes, post });
    } catch (error) {
      console.error("Error broadcasting reply like/unlike:", error.message);
    }
  });

  socket.on("editComment", async ({ postId, commentId, text }) => {
    try {
      if (!postId || !commentId || !text) {
        console.warn("Invalid editComment data:", { postId, commentId, text });
        return;
      }
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      if (!post) {
        console.warn(`Post not found: ${postId}`);
        return;
      }
      console.log(`Emitting editComment to post:${postId}`);
      io.to(`post:${postId}`).emit("editComment", { postId, commentId, text, post });
    } catch (error) {
      console.error("Error broadcasting edit comment:", error.message);
    }
  });

  socket.on("deleteComment", async ({ postId, commentId }) => {
    try {
      if (!postId || !commentId) {
        console.warn("Invalid deleteComment data:", { postId, commentId });
        return;
      }
      const post = await Post.findById(postId)
        .populate("postedBy", "username profilePic")
        .populate("comments.userId", "username profilePic")
        .populate("comments.replies.userId", "username profilePic")
        .lean();
      if (!post) {
        console.warn(`Post not found: ${postId}`);
        return;
      }
      console.log(`Emitting deleteComment to post:${postId}`);
      io.to(`post:${postId}`).emit("deleteComment", { postId, commentId, post });
    } catch (error) {
      console.error("Error broadcasting delete comment:", error.message);
    }
  });

  socket.on("postDeleted", async ({ postId, userId }) => {
    try {
      if (!postId || !userId) {
        console.warn("Invalid postDeleted data:", { postId, userId });
        return;
      }
      console.log(`Emitting postDeleted to post:${postId} and feed`);
      io.to(`post:${postId}`).emit("postDeleted", { postId, userId });
      io.emit("postDeletedFromFeed", { postId });
    } catch (error) {
      console.error("Error broadcasting post deleted:", error.message);
    }
  });

  socket.on("newMessage", async (message) => {
    try {
      if (!message?.recipientId || !message?.sender?._id || !message?.conversationId) {
        console.warn("Invalid newMessage data:", message);
        return;
      }
      const recipientSocketId = getRecipientSocketId(message.recipientId);
      const senderSocketId = getRecipientSocketId(message.sender._id);
      console.log(`Broadcasting newMessage: ${message._id}`, {
        recipientSocketId,
        senderSocketId,
        conversationId: message.conversationId,
      });
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("newMessage", message);
      } else {
        console.warn(`Recipient ${message.recipientId} not connected`);
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("newMessage", message);
      } else {
        console.warn(`Sender ${message.sender._id} not connected`);
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
      const senderSocketId = getRecipientSocketId(recipientId);
      if (senderSocketId) {
        console.log(`Emitting messageDelivered: ${messageId} to ${senderSocketId}`);
        io.to(senderSocketId).emit("messageDelivered", { messageId, conversationId });
      } else {
        console.warn(`Sender ${recipientId} not connected for messageDelivered`);
      }
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

      if (!messages.length) {
        console.log(`No unseen messages for conversation: ${conversationId}`);
        return;
      }

      const seenMessageIds = messages.map((msg) => msg._id.toString());
      await Message.updateMany(
        { conversationId, seen: false, sender: { $ne: userId } },
        { $set: { seen: true, status: "seen" } }
      );

      await Conversation.updateOne(
        { _id: conversationId },
        { $set: { "lastMessage.seen": true } }
      );

      const participantIds = conversation.participants.map((p) => p.toString());
      participantIds.forEach((participantId) => {
        const socketId = getRecipientSocketId(participantId);
        if (socketId) {
          console.log(`Emitting messagesSeen to ${socketId}:`, { conversationId, seenMessages: seenMessageIds });
          io.to(socketId).emit("messagesSeen", {
            conversationId,
            seenMessages: seenMessageIds,
          });
        }
      });
    } catch (error) {
      console.error("Error marking messages as seen:", error.message);
    }
  });

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

      if (!typingUsers.has(conversationId)) {
        typingUsers.set(conversationId, new Set());
      }
      const conversationTyping = typingUsers.get(conversationId);
      if (!conversationTyping.has(userId)) {
        conversationTyping.add(userId);
        recipientIds.forEach((recipientId) => {
          const recipientSocketId = getRecipientSocketId(recipientId);
          if (recipientSocketId) {
            console.log(`Emitting typing to ${recipientSocketId}:`, { conversationId, userId });
            io.to(recipientSocketId).emit("typing", { conversationId, userId });
          }
        });
      }
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
          recipientIds.forEach((recipientId) => {
            const recipientSocketId = getRecipientSocketId(recipientId);
            if (recipientSocketId) {
              console.log(`Emitting stopTyping to ${recipientSocketId}:`, { conversationId, userId });
              io.to(recipientSocketId).emit("stopTyping", { conversationId, userId });
            }
          });
        }
      }
    } catch (error) {
      console.error("Error broadcasting stopTyping:", error.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (userId && userSocketMap[userId] === socket.id) {
      delete userSocketMap[userId];
      typingUsers.forEach((conversationTyping, conversationId) => {
        if (conversationTyping.has(userId)) {
          conversationTyping.delete(userId);
          if (conversationTyping.size === 0) {
            typingUsers.delete(conversationId);
          }
          Conversation.findById(conversationId)
            .lean()
            .then((conversation) => {
              if (conversation) {
                const recipientIds = conversation.participants
                  .filter((p) => p.toString() !== userId)
                  .map((p) => p.toString());
                recipientIds.forEach((recipientId) => {
                  const recipientSocketId = getRecipientSocketId(recipientId);
                  if (recipientSocketId) {
                    console.log(`Emitting stopTyping on disconnect to ${recipientSocketId}:`, { conversationId, userId });
                    io.to(recipientSocketId).emit("stopTyping", { conversationId, userId });
                  }
                });
              }
            })
            .catch((error) => {
              console.error("Error cleaning up typing on disconnect:", error.message);
            });
        }
      });
      console.log(`Emitting getOnlineUsers after disconnect: ${Object.keys(userSocketMap)}`);
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
