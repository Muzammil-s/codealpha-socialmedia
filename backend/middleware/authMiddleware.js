import jwt from "jsonwebtoken";
import { readDB } from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "mysupersecretkey";

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return res.status(401).json({ msg: "No token" });

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = await readDB();
    const user = db.users.find(u => u.id === decoded.id);
    if (!user) return res.status(401).json({ msg: "Invalid token" });

    req.user = { id: user.id, username: user.username, email: user.email };
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token invalid", error: err.message });
  }
};
