import express from "express";
import {
	followUnFollowUser,
	getUserProfile,
	loginUser,
	logoutUser,
	signupUser,
	updateUser,
	getSuggestedUsers,
	freezeAccount,
	adminLogin,
	banUser,
	unbanUser,
	getUserDashboard,
	getAdminDashboard,
	promoteToAdmin,
} from "../controllers/userController.js";
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();

router.get("/profile/:query", getUserProfile);
router.get("/suggested", protectRoute, getSuggestedUsers);
router.get("/dashboard", protectRoute, getUserDashboard);
router.get("/admin/dashboard", protectRoute, getAdminDashboard);
router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/admin/login", adminLogin);
router.post("/logout", logoutUser);
router.post("/follow/:id", protectRoute, followUnFollowUser);
router.put("/update/:id", protectRoute, updateUser);
router.put("/freeze", protectRoute, freezeAccount);
router.put("/ban/:id", protectRoute, banUser);
router.put("/unban/:id", protectRoute, unbanUser);
router.put("/promote/:id", protectRoute, promoteToAdmin);

export default router;