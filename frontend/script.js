// ====== Base Config ======
const API_BASE = "http://localhost:5000/api";

// ====== Auth UI Toggle ======
function showSignup() {
  document.getElementById("login-container").classList.add("hidden");
  document.getElementById("signup-container").classList.remove("hidden");
}
function showLogin() {
  document.getElementById("signup-container").classList.add("hidden");
  document.getElementById("login-container").classList.remove("hidden");
}

// ====== Signup ======
async function signup() {
  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();

  if (res.ok) {
    alert("Signup successful! Please login.");
    showLogin();
  } else alert(data.message || "Signup failed");
}

// ====== Login ======
async function login() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();

  if (res.ok) {
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.token);
    document.getElementById("login-container").classList.add("hidden");
    document.getElementById("feed-container").classList.remove("hidden");
    document.getElementById("displayUser").textContent = data.user.username;
    loadPosts();
  } else alert(data.message || "Invalid credentials");
}

// ====== Posts ======
async function createPost() {
  const user = JSON.parse(localStorage.getItem("user"));
  const content = document.getElementById("postContent").value;
  if (!content) return alert("Post cannot be empty!");

  const res = await fetch(`${API_BASE}/posts/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user._id, content }),
  });

  if (res.ok) {
    document.getElementById("postContent").value = "";
    loadPosts();
  } else alert("Error posting");
}

async function loadPosts() {
  const res = await fetch(`${API_BASE}/posts`);
  const posts = await res.json();
  const postsDiv = document.getElementById("posts");
  postsDiv.innerHTML = "";

  posts.forEach((p) => {
    const postEl = document.createElement("div");
    postEl.className = "post";
    postEl.innerHTML = `
      <b onclick="openProfile('${p.user._id}')">${p.user?.username || "User"}</b>
      <button class="follow-btn" data-user-id="${p.user._id}">Follow</button>
      <p>${p.content}</p>
      ❤️ ${p.likes?.length || 0}
      <button onclick="likePost('${p._id}')">Like</button>
      <button onclick="deletePost('${p._id}')">Delete</button>
      <br>
      <input id="comment-${p._id}" placeholder="Write a comment...">
      <button onclick="addComment('${p._id}')">Comment</button>
      <div class="comments">
        ${p.comments.map(c => `<p><b>${c.user?.username || "User"}:</b> ${c.text}</p>`).join("")}
      </div>
      <hr>
    `;
    postsDiv.appendChild(postEl);
  });

  attachFollowEvents();
}

// ====== Post Actions ======
async function likePost(postId) {
  const user = JSON.parse(localStorage.getItem("user"));
  await fetch(`${API_BASE}/posts/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId, userId: user._id }),
  });
  loadPosts();
}

async function deletePost(id) {
  await fetch(`${API_BASE}/posts/${id}`, { method: "DELETE" });
  loadPosts();
}

async function addComment(postId) {
  const user = JSON.parse(localStorage.getItem("user"));
  const text = document.getElementById(`comment-${postId}`).value;
  if (!text) return alert("Comment cannot be empty!");

  await fetch(`${API_BASE}/posts/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId, userId: user._id, text }),
  });
  loadPosts();
}

// ====== Profile ======
async function openProfile(userId) {
  const res = await fetch(`${API_BASE}/users/${userId}`);
  const data = await res.json();
  const container = document.getElementById("profile-container");

  document.getElementById("feed-container").classList.add("hidden");
  container.classList.remove("hidden");

  container.innerHTML = `
    <button onclick="backToFeed()">⬅️ Back</button>
    <h2>${data.user.username}</h2>
    <p>Followers: <span id="followers-count">${data.user.followers?.length || 0}</span></p>
    <p>Following: <span id="following-count">${data.user.following?.length || 0}</span></p>
    <button id="profile-follow-btn" data-user-id="${data.user._id}">Follow</button>
    <h3>Posts:</h3>
    ${data.posts.map(p => `<p>${p.content}</p>`).join("")}
  `;

  attachFollowEvents();
}

function backToFeed() {
  document.getElementById("profile-container").classList.add("hidden");
  document.getElementById("feed-container").classList.remove("hidden");
}

// ====== Follow System ======
function attachFollowEvents() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  document.querySelectorAll(".follow-btn, #profile-follow-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const userId = btn.getAttribute("data-user-id");
      const res = await fetch(`${API_BASE}/users/${userId}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentUserId: user._id }),
      });

      const data = await res.json();
      if (res.ok) {
        const isFollowing = data.isFollowing;
        btn.textContent = isFollowing ? "Unfollow" : "Follow";
        btn.style.backgroundColor = isFollowing ? "#ccc" : "#007bff";
      } else {
        alert(data.message || "Error updating follow status");
      }
    });
  });
}

// ====== Logout ======
function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  window.location.reload();
}
