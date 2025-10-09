import express from "express";
import { followUser, getUserById } from "../controllers/usercontroller.js";

const router = express.Router();

// ✅ Follow / Unfollow user
router.post("/:id/follow", followUser);

// ✅ Get user with posts
router.get("/:id", getUserById);

export default router;
