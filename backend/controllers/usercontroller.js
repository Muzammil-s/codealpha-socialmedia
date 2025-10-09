import User from "../models/User.js";
import Post from "../models/Post.js";

// ✅ Follow / Unfollow a user
export const followUser = async (req, res) => {
  try {
    const userId = req.params.id; // user being followed
    const { currentUserId } = req.body; // follower

    if (userId === currentUserId)
      return res.status(400).json({ message: "You cannot follow yourself" });

    const user = await User.findById(userId);
    const currentUser = await User.findById(currentUserId);

    if (!user || !currentUser)
      return res.status(404).json({ message: "User not found" });

    const alreadyFollowing = user.followers.includes(currentUserId);

    if (alreadyFollowing) {
      // 🔹 Unfollow
      user.followers = user.followers.filter((id) => id.toString() !== currentUserId);
      currentUser.following = currentUser.following.filter((id) => id.toString() !== userId);
      await user.save();
      await currentUser.save();
      return res.json({ message: "Unfollowed successfully", isFollowing: false });
    } else {
      // 🔹 Follow
      user.followers.push(currentUserId);
      currentUser.following.push(userId);
      await user.save();
      await currentUser.save();
      return res.json({ message: "Followed successfully", isFollowing: true });
    }
  } catch (err) {
    console.error("Follow error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get user profile & posts
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("followers", "username")
      .populate("following", "username");
    const posts = await Post.find({ user: req.params.id });
    res.json({ user, posts });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: err.message });
  }
};
