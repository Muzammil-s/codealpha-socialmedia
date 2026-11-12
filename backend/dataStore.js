const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function hashPasswordSync(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function buildSeedState() {
  const demoUsers = [
    {
      id: 'usr-muzammil',
      username: 'muzammil_dev',
      displayName: 'Muzammil Shabbir',
      email: 'demo@socialsphere.dev',
      role: 'CS Student & Full-Stack Builder',
      bio: 'Building full-stack web apps, Python analytics pipelines, and defensive cybersecurity tools.',
      accent: '#38bdf8',
      passwordHash: hashPasswordSync('DemoPass123!'),
      followers: ['usr-amina', 'usr-tariq'],
      following: ['usr-amina', 'usr-sara'],
      createdAt: '2026-10-10T09:00:00.000Z'
    },
    {
      id: 'usr-amina',
      username: 'amina_sec',
      displayName: 'Amina Farooq',
      email: 'amina@socialsphere.dev',
      role: 'AppSec Analyst',
      bio: 'Focusing on OWASP Top 10 hardening, URL phishing telemetry, and secure JWT architecture.',
      accent: '#22c55e',
      passwordHash: hashPasswordSync('DemoPass123!'),
      followers: ['usr-muzammil'],
      following: ['usr-muzammil'],
      createdAt: '2026-10-12T11:30:00.000Z'
    },
    {
      id: 'usr-tariq',
      username: 'tariq_data',
      displayName: 'Tariq Mahmood',
      email: 'tariq@socialsphere.dev',
      role: 'Data & Python Engineer',
      bio: 'Exploring Pandas ETL workflows, outlier detection, and browser-side DuckDB/CSV tooling.',
      accent: '#a78bfa',
      passwordHash: hashPasswordSync('DemoPass123!'),
      followers: ['usr-sara'],
      following: ['usr-muzammil'],
      createdAt: '2026-10-15T14:15:00.000Z'
    },
    {
      id: 'usr-sara',
      username: 'sara_ui',
      displayName: 'Sara Nadeem',
      email: 'sara@socialsphere.dev',
      role: 'Frontend Architect',
      bio: 'Designing accessible design systems, responsive grids, and crisp keyboard-first interfaces.',
      accent: '#f59e0b',
      passwordHash: hashPasswordSync('DemoPass123!'),
      followers: ['usr-muzammil'],
      following: ['usr-tariq'],
      createdAt: '2026-10-18T16:40:00.000Z'
    }
  ];

  const demoPosts = [
    {
      id: 'post-101',
      userId: 'usr-muzammil',
      topic: '#webdev',
      content: 'Refactored our legacy REST handlers to sanitize user objects before sending responses and enforce salted scrypt password hashing + timing-safe JWT signature verification.',
      codeSnippet: 'const { passwordHash, ...safeUser } = user;\nreturn sendJson(res, 200, { token, user: safeUser });',
      likes: ['usr-amina', 'usr-sara'],
      bookmarks: ['usr-amina'],
      comments: [
        {
          id: 'cmt-1',
          userId: 'usr-amina',
          text: 'Huge win. Always verify JWT HMAC signatures with crypto.timingSafeEqual too.',
          createdAt: '2026-11-01T10:15:00.000Z'
        }
      ],
      createdAt: '2026-11-01T09:45:00.000Z'
    },
    {
      id: 'post-102',
      userId: 'usr-amina',
      topic: '#security',
      content: 'Friendly reminder: never render user-supplied post or comment strings using innerHTML. Use textContent or explicit DOM node helpers to neutralize stored XSS by design.',
      codeSnippet: '',
      likes: ['usr-muzammil', 'usr-tariq', 'usr-sara'],
      bookmarks: ['usr-muzammil'],
      comments: [
        {
          id: 'cmt-2',
          userId: 'usr-muzammil',
          text: 'Replaced every template string post renderer with safe DOM creation helpers today.',
          createdAt: '2026-11-03T13:20:00.000Z'
        }
      ],
      createdAt: '2026-11-03T12:10:00.000Z'
    },
    {
      id: 'post-103',
      userId: 'usr-tariq',
      topic: '#analytics',
      content: 'Shipping client-side CSV profiling (IQR outliers, Pearson correlation, missingness per column) keeps sensitive datasets on the user machine instead of uploading raw sheets to third-party servers.',
      codeSnippet: '',
      likes: ['usr-muzammil', 'usr-sara'],
      bookmarks: [],
      comments: [],
      createdAt: '2026-11-05T15:30:00.000Z'
    },
    {
      id: 'post-104',
      userId: 'usr-sara',
      topic: '#design',
      content: 'Good dark UI is not pure black with neon chaos — it relies on layered slate surfaces, muted 1px hairline borders, readable monospace labels, and intentional color for state feedback.',
      codeSnippet: '',
      likes: ['usr-amina'],
      bookmarks: ['usr-muzammil'],
      comments: [],
      createdAt: '2026-11-07T18:05:00.000Z'
    }
  ];

  return { users: demoUsers, posts: demoPosts };
}

function createSocialStore(dataFilePath) {
  const resolved = dataFilePath || path.join(__dirname, 'data', 'social_db.json');
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  function read() {
    if (!fs.existsSync(resolved)) {
      const initial = buildSeedState();
      fs.writeFileSync(resolved, JSON.stringify(initial, null, 2));
      return initial;
    }
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
  }

  function write(db) {
    fs.writeFileSync(resolved, JSON.stringify(db, null, 2));
  }

  function sanitizeUser(u) {
    if (!u) return null;
    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName || u.username,
      email: u.email,
      role: u.role || 'Developer',
      bio: u.bio || '',
      accent: u.accent || '#38bdf8',
      followers: Array.isArray(u.followers) ? u.followers : [],
      following: Array.isArray(u.following) ? u.following : [],
      createdAt: u.createdAt
    };
  }

  function hydratePost(post, users) {
    const author = users.find((u) => u.id === post.userId);
    const comments = (post.comments || []).map((c) => {
      const cAuthor = users.find((u) => u.id === c.userId);
      return {
        id: c.id,
        userId: c.userId,
        text: c.text,
        createdAt: c.createdAt,
        author: cAuthor
          ? { id: cAuthor.id, username: cAuthor.username, displayName: cAuthor.displayName, accent: cAuthor.accent }
          : { id: c.userId, username: 'unknown', displayName: 'Unknown User', accent: '#64748b' }
      };
    });

    return {
      ...post,
      author: author
        ? { id: author.id, username: author.username, displayName: author.displayName, role: author.role, accent: author.accent }
        : { id: post.userId, username: 'unknown', displayName: 'Unknown User', role: '', accent: '#64748b' },
      comments
    };
  }

  return {
    sanitizeUser,
    findUserByEmail(email) {
      return read().users.find((u) => u.email.toLowerCase() === String(email || '').trim().toLowerCase()) || null;
    },
    findUserByUsername(username) {
      return read().users.find((u) => u.username.toLowerCase() === String(username || '').trim().toLowerCase()) || null;
    },
    findUserById(id) {
      return read().users.find((u) => u.id === id) || null;
    },
    listUsers() {
      return read().users.map(sanitizeUser);
    },
    createUser({ username, displayName, email, passwordHash, role, bio }) {
      const db = read();
      const palette = ['#38bdf8', '#22c55e', '#a78bfa', '#f59e0b', '#ec4899'];
      const user = {
        id: 'usr-' + crypto.randomBytes(4).toString('hex'),
        username: String(username).trim().replace(/\s+/g, '_').toLowerCase(),
        displayName: String(displayName || username).trim(),
        email: String(email).trim().toLowerCase(),
        role: String(role || 'Community Member').trim(),
        bio: String(bio || 'Exploring software engineering and sharing ideas on SocialSphere.').trim(),
        accent: palette[db.users.length % palette.length],
        passwordHash,
        followers: [],
        following: [],
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
      write(db);
      return sanitizeUser(user);
    },
    updateProfile(userId, updates) {
      const db = read();
      const user = db.users.find((u) => u.id === userId);
      if (!user) return null;
      if (typeof updates.displayName === 'string' && updates.displayName.trim()) {
        user.displayName = updates.displayName.trim().slice(0, 50);
      }
      if (typeof updates.role === 'string') {
        user.role = updates.role.trim().slice(0, 60);
      }
      if (typeof updates.bio === 'string') {
        user.bio = updates.bio.trim().slice(0, 220);
      }
      write(db);
      return sanitizeUser(user);
    },
    getPosts({ topic, q, authorId, followingOf, bookmarkedBy } = {}) {
      const db = read();
      let list = [...db.posts];
      if (topic && topic !== 'all') {
        list = list.filter((p) => (p.topic || '').toLowerCase() === topic.toLowerCase());
      }
      if (authorId) {
        list = list.filter((p) => p.userId === authorId);
      }
      if (followingOf) {
        const viewer = db.users.find((u) => u.id === followingOf);
        const set = new Set(viewer ? [...viewer.following, viewer.id] : []);
        list = list.filter((p) => set.has(p.userId));
      }
      if (bookmarkedBy) {
        list = list.filter((p) => (p.bookmarks || []).includes(bookmarkedBy));
      }
      if (q) {
        const needle = q.toLowerCase();
        list = list.filter((p) => {
          const author = db.users.find((u) => u.id === p.userId);
          return (
            p.content.toLowerCase().includes(needle) ||
            (p.topic || '').toLowerCase().includes(needle) ||
            (author && (author.username.toLowerCase().includes(needle) || author.displayName.toLowerCase().includes(needle)))
          );
        });
      }
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return list.map((p) => hydratePost(p, db.users));
    },
    createPost({ userId, content, topic, codeSnippet }) {
      const db = read();
      const post = {
        id: 'post-' + crypto.randomBytes(4).toString('hex'),
        userId,
        topic: String(topic || '#general').trim().startsWith('#')
          ? String(topic || '#general').trim().toLowerCase()
          : '#' + String(topic || 'general').trim().toLowerCase(),
        content: String(content).trim().slice(0, 500),
        codeSnippet: String(codeSnippet || '').trim().slice(0, 600),
        likes: [],
        bookmarks: [],
        comments: [],
        createdAt: new Date().toISOString()
      };
      db.posts.unshift(post);
      write(db);
      return hydratePost(post, db.users);
    },
    deletePost(postId, actorUserId) {
      const db = read();
      const idx = db.posts.findIndex((p) => p.id === postId);
      if (idx === -1) return { status: 404, error: 'Post not found' };
      if (db.posts[idx].userId !== actorUserId) return { status: 403, error: 'You can only delete your own posts' };
      db.posts.splice(idx, 1);
      write(db);
      return { status: 200, deleted: true };
    },
    toggleLike(postId, userId) {
      const db = read();
      const post = db.posts.find((p) => p.id === postId);
      if (!post) return null;
      const idx = post.likes.indexOf(userId);
      let liked = false;
      if (idx === -1) {
        post.likes.push(userId);
        liked = true;
      } else {
        post.likes.splice(idx, 1);
      }
      write(db);
      return { post: hydratePost(post, db.users), liked };
    },
    toggleBookmark(postId, userId) {
      const db = read();
      const post = db.posts.find((p) => p.id === postId);
      if (!post) return null;
      post.bookmarks = post.bookmarks || [];
      const idx = post.bookmarks.indexOf(userId);
      let bookmarked = false;
      if (idx === -1) {
        post.bookmarks.push(userId);
        bookmarked = true;
      } else {
        post.bookmarks.splice(idx, 1);
      }
      write(db);
      return { post: hydratePost(post, db.users), bookmarked };
    },
    addComment(postId, userId, text) {
      const db = read();
      const post = db.posts.find((p) => p.id === postId);
      if (!post) return null;
      const comment = {
        id: 'cmt-' + crypto.randomBytes(4).toString('hex'),
        userId,
        text: String(text).trim().slice(0, 280),
        createdAt: new Date().toISOString()
      };
      post.comments.push(comment);
      write(db);
      return hydratePost(post, db.users);
    },
    toggleFollow(targetUserId, currentUserId) {
      if (targetUserId === currentUserId) return { error: 'Cannot follow yourself' };
      const db = read();
      const target = db.users.find((u) => u.id === targetUserId);
      const current = db.users.find((u) => u.id === currentUserId);
      if (!target || !current) return null;

      const idx = current.following.indexOf(targetUserId);
      let isFollowing = false;
      if (idx === -1) {
        current.following.push(targetUserId);
        if (!target.followers.includes(currentUserId)) target.followers.push(currentUserId);
        isFollowing = true;
      } else {
        current.following.splice(idx, 1);
        target.followers = target.followers.filter((id) => id !== currentUserId);
      }
      write(db);
      return {
        isFollowing,
        targetUser: sanitizeUser(target),
        currentUser: sanitizeUser(current)
      };
    },
    getUserProfile(userId) {
      const db = read();
      const user = db.users.find((u) => u.id === userId);
      if (!user) return null;
      const posts = db.posts
        .filter((p) => p.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((p) => hydratePost(p, db.users));
      return { user: sanitizeUser(user), posts };
    }
  };
}

module.exports = { createSocialStore };
