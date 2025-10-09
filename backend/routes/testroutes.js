// backend/routes/testroutes.js
import express from "express";
const router = express.Router();

// GET test route
router.get("/", (req, res) => {
  res.json({ message: "Test route is working! 🎉" });
});

// another test with params
router.get("/:name", (req, res) => {
  res.json({ message: `Hello ${req.params.name}, test route working 🚀` });
});

export default router;
