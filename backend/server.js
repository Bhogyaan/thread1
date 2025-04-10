import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./db/connectDB.js";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { v2 as cloudinary } from "cloudinary";
import { app, server } from "./socket/socket.js";
import job from "./cron/cron.js";

// Setup __dirname manually (ESM doesn't provide it natively)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env file from backend directory
dotenv.config({ path: path.resolve(__dirname, ".env") });

console.log("Loaded JWT_SECRET:", process.env.JWT_SECRET); // Debug

// Connect to DB and start cron
connectDB();
job.start();

const PORT = process.env.PORT || 5000;

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middleware
app.use(express.json({ limit: "50mb" })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Routes (API endpoints take precedence over static files)
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/messages", messageRoutes);

// Static File Serving (React) - Only for unmatched routes in development
if (process.env.NODE_ENV === "development") {
  app.use(express.static(path.join(__dirname, "frontend", "dist")));

  // Catch-all route for React SPA, but only after API routes
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
  });
} else {
  // In production, handle 404s explicitly with JSON
  app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
  });
}

// Global Error Handling Middleware (ensure JSON responses)
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Start Server
server.listen(PORT, () =>
  console.log(`✅ Server started at http://localhost:${PORT}`)
);












// import express from "express";
// import dotenv from "dotenv";
// import path from "path";
// import { fileURLToPath } from "url";
// import connectDB from "./db/connectDB.js";
// import cookieParser from "cookie-parser";
// import userRoutes from "./routes/userRoutes.js";
// import postRoutes from "./routes/postRoutes.js";
// import messageRoutes from "./routes/messageRoutes.js";
// import { v2 as cloudinary } from "cloudinary";
// import { app, server } from "./socket/socket.js";
// import job from "./cron/cron.js";

// // Setup __dirname manually (ESM doesn't provide it natively)
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Explicitly load .env file from backend directory
// dotenv.config({ path: path.resolve(__dirname, ".env") });

// console.log("Loaded JWT_SECRET:", process.env.JWT_SECRET); // Debug

// // Connect to DB and start cron
// connectDB();
// job.start();

// const PORT = process.env.PORT || 5000;

// // Cloudinary Config
// cloudinary.config({
// 	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
// 	api_key: process.env.CLOUDINARY_API_KEY,
// 	api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // Middleware
// app.use(express.json({ limit: "50mb" }));
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());

// // Routes
// app.use("/api/users", userRoutes);
// app.use("/api/posts", postRoutes);
// app.use("/api/messages", messageRoutes);

// // Static File Serving (React)
// if (process.env.NODE_ENV === "development") {
// 	app.use(express.static(path.join(__dirname, "frontend", "dist")));

// 	app.get("*", (req, res) => {
// 		res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
// 	});
// }

// // Start Server
// server.listen(PORT, () =>
// 	console.log(`✅ Server started at http://localhost:${PORT}`)
// );
