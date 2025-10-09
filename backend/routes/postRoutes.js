// backend/routes/postRoutes.js
import express from "express";
import {
  createPost,
  getAllPosts,
  likePost,
  addComment,
  deletePost
} from "../controllers/postController.js";

const router = express.Router();

// Create a new post
router.post("/create", createPost);

// Get all posts
router.get("/", getAllPosts);

// Like a post
router.post("/like", likePost);

// Add a comment
router.post("/comment", addComment);

// Delete a post
router.delete("/:id", deletePost);

export default router;
