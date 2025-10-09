// backend/app.js
const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({ msg: "API is working 🚀" });
});

module.exports = app;
