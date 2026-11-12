const state = {
  apiOnline: false,
  token: localStorage.getItem('socialsphere_token') || '',
  user: JSON.parse(localStorage.getItem('socialsphere_user') || 'null'),
  tab: 'all',
  topic: 'all',
  q: '',
  authorId: null,
  users: [],
  posts: [],
  authMode: 'login'
};

const SEED_DEMO_USERS = [
  { id: 'usr-muzammil', username: 'muzammil_dev', displayName: 'Muzammil Shabbir', email: 'demo@socialsphere.dev', role: 'CS Student & Full-Stack Builder', bio: 'Building full-stack web apps, Python analytics pipelines, and defensive cybersecurity tools.', accent: '#38bdf8', followers: ['usr-amina', 'usr-tariq'], following: ['usr-amina', 'usr-sara'] },
  { id: 'usr-amina', username: 'amina_sec', displayName: 'Amina Farooq', email: 'amina@socialsphere.dev', role: 'AppSec Analyst', bio: 'OWASP Top 10 hardening & URL threat telemetry.', accent: '#22c55e', followers: ['usr-muzammil'], following: ['usr-muzammil'] },
  { id: 'usr-tariq', username: 'tariq_data', displayName: 'Tariq Mahmood', email: 'tariq@socialsphere.dev', role: 'Data & Python Engineer', bio: 'Pandas ETL & local CSV statistical profiling.', accent: '#a78bfa', followers: ['usr-sara'], following: ['usr-muzammil'] },
  { id: 'usr-sara', username: 'sara_ui', displayName: 'Sara Nadeem', email: 'sara@socialsphere.dev', role: 'Frontend Architect', bio: 'Accessible design systems & responsive grids.', accent: '#f59e0b', followers: ['usr-muzammil'], following: ['usr-tariq'] }
];

const SEED_DEMO_POSTS = [
  { id: 'post-101', userId: 'usr-muzammil', topic: '#webdev', content: 'Refactored legacy REST handlers to sanitize user objects before sending responses and enforce salted scrypt hashing + timing-safe JWT verification.', codeSnippet: 'const { passwordHash, ...safeUser } = user;\nreturn sendJson(res, 200, { token, user: safeUser });', likes: ['usr-amina', 'usr-sara'], bookmarks: ['usr-amina'], comments: [{ id: 'cmt-1', userId: 'usr-amina', text: 'Always verify JWT HMAC signatures with crypto.timingSafeEqual too.', createdAt: '2026-11-01T10:15:00.000Z' }], createdAt: '2026-11-01T09:45:00.000Z' },
  { id: 'post-102', userId: 'usr-amina', topic: '#security', content: 'Never render user-supplied post or comment strings using innerHTML. Use textContent / explicit DOM nodes to neutralize stored XSS by design.', codeSnippet: '', likes: ['usr-muzammil', 'usr-tariq', 'usr-sara'], bookmarks: ['usr-muzammil'], comments: [], createdAt: '2026-11-03T12:10:00.000Z' },
  { id: 'post-103', userId: 'usr-tariq', topic: '#analytics', content: 'Shipping client-side CSV profiling keeps sensitive datasets on the user machine instead of uploading raw sheets to external servers.', codeSnippet: '', likes: ['usr-muzammil'], bookmarks: [], comments: [], createdAt: '2026-11-05T15:30:00.000Z' }
];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function getLocalDb() {
  const saved = localStorage.getItem('socialsphere_demo_db');
  if (saved) return JSON.parse(saved);
  const initial = { users: SEED_DEMO_USERS, posts: SEED_DEMO_POSTS };
  localStorage.setItem('socialsphere_demo_db', JSON.stringify(initial));
  return initial;
}

function saveLocalDb(db) {
  localStorage.setItem('socialsphere_demo_db', JSON.stringify(db));
}

function hydrateLocalPosts(db) {
  return db.posts.map((p) => {
    const author = db.users.find((u) => u.id === p.userId) || { id: p.userId, username: 'user', displayName: 'User', role: '', accent: '#64748b' };
    const comments = (p.comments || []).map((c) => {
      const ca = db.users.find((u) => u.id === c.userId) || { id: c.userId, username: 'user', displayName: 'User', accent: '#64748b' };
      return { ...c, author: ca };
    });
    return { ...p, author, comments };
  });
}

async function apiFetch(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

async function detectApi() {
  if (window.location.hostname.endsWith('.vercel.app') || window.location.hostname.endsWith('.github.io')) {
    state.apiOnline = false;
  } else {
    try {
      const res = await fetch('/api/health');
      state.apiOnline = res.ok;
    } catch {
      state.apiOnline = false;
    }
  }
  const badge = document.getElementById('mode-indicator');
  badge.textContent = state.apiOnline ? 'Live Node API Connected' : 'Standalone Browser Demo Mode';
}

function saveSession(token, user) {
  state.token = token;
  state.user = user;
  if (token && user) {
    localStorage.setItem('socialsphere_token', token);
    localStorage.setItem('socialsphere_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('socialsphere_token');
    localStorage.removeItem('socialsphere_user');
  }
}

async function refreshAll() {
  if (state.apiOnline) {
    const params = new URLSearchParams();
    if (state.topic !== 'all') params.set('topic', state.topic);
    if (state.q) params.set('q', state.q);
    if (state.authorId) params.set('authorId', state.authorId);
    if (state.tab !== 'all') params.set('tab', state.tab);

    const [usersRes, postsRes] = await Promise.all([
      apiFetch('/api/users'),
      apiFetch(`/api/posts?${params.toString()}`)
    ]);
    state.users = usersRes.users;
    state.posts = postsRes.posts;
    if (state.user) {
      const refreshedMe = state.users.find((u) => u.id === state.user.id);
      if (refreshedMe) saveSession(state.token, refreshedMe);
    }
  } else {
    const db = getLocalDb();
    state.users = db.users;
    let posts = hydrateLocalPosts(db);
    if (state.topic !== 'all') posts = posts.filter((p) => p.topic === state.topic);
    if (state.authorId) posts = posts.filter((p) => p.userId === state.authorId);
    if (state.tab === 'following' && state.user) {
      const set = new Set([...(state.user.following || []), state.user.id]);
      posts = posts.filter((p) => set.has(p.userId));
    }
    if (state.tab === 'saved' && state.user) {
      posts = posts.filter((p) => (p.bookmarks || []).includes(state.user.id));
    }
    if (state.q) {
      const needle = state.q.toLowerCase();
      posts = posts.filter((p) => p.content.toLowerCase().includes(needle) || p.topic.toLowerCase().includes(needle) || p.author.displayName.toLowerCase().includes(needle));
    }
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    state.posts = posts;
  }
  renderHeader();
  renderViewerCard();
  renderPeople();
  renderFeed();
}

function renderHeader() {
  const authBtn = document.getElementById('btn-auth');
  const editBtn = document.getElementById('btn-edit-profile');
  if (state.user) {
    authBtn.textContent = `Sign Out (@${state.user.username})`;
    editBtn.hidden = false;
  } else {
    authBtn.textContent = 'Sign In / Join';
    editBtn.hidden = true;
  }
}

function renderViewerCard() {
  const card = document.getElementById('viewer-card');
  card.innerHTML = '';
  if (!state.user) {
    card.appendChild(el('strong', '', 'Guest Visitor'));
    card.appendChild(el('p', 'muted small', 'Sign in with a click using the demo account or create an account to post, like, comment, and follow builders.'));
    return;
  }
  const row = el('div', 'profile-row');
  const av = el('div', 'avatar', (state.user.displayName || state.user.username).slice(0, 2).toUpperCase());
  av.style.background = state.user.accent || '#38bdf8';
  const info = el('div');
  info.appendChild(el('strong', '', state.user.displayName));
  info.appendChild(el('div', 'post-author-meta', `@${state.user.username} • ${state.user.role || 'Developer'}`));
  row.append(av, info);

  const bio = el('p', 'muted small', state.user.bio || '');
  const stats = el('div', 'profile-stats');
  const f1 = el('div', 'stat-box');
  f1.append(el('strong', '', String((state.user.followers || []).length)), el('span', '', 'Followers'));
  const f2 = el('div', 'stat-box');
  f2.append(el('strong', '', String((state.user.following || []).length)), el('span', '', 'Following'));
  stats.append(f1, f2);
  card.append(row, bio, stats);
}

function renderPeople() {
  const list = document.getElementById('people-list');
  list.innerHTML = '';
  const candidates = state.users.filter((u) => !state.user || u.id !== state.user.id);
  for (const person of candidates) {
    const row = el('div', 'person-row');
    const info = el('div', 'person-info');
    info.addEventListener('click', () => filterByAuthor(person));
    const av = el('div', 'avatar', (person.displayName || person.username).slice(0, 2).toUpperCase());
    av.style.background = person.accent || '#38bdf8';
    av.style.width = '36px';
    av.style.height = '36px';
    const meta = el('div');
    meta.append(el('strong', '', person.displayName), el('small', '', `@${person.username}`));
    info.append(av, meta);

    const isFollowing = state.user && (state.user.following || []).includes(person.id);
    const btn = el('button', `btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`, isFollowing ? 'Following' : 'Follow');
    btn.type = 'button';
    btn.addEventListener('click', () => handleFollow(person.id));
    row.append(info, btn);
    list.appendChild(row);
  }
}

function filterByAuthor(user) {
  state.authorId = user.id;
  document.getElementById('active-filter-banner').hidden = false;
  document.getElementById('active-filter-text').textContent = `Viewing profile posts by ${user.displayName} (@${user.username}) • ${(user.followers || []).length} followers`;
  refreshAll();
}

function formatDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderFeed() {
  const feed = document.getElementById('feed-list');
  feed.innerHTML = '';
  if (!state.posts.length) {
    const empty = el('div', 'panel');
    empty.append(el('strong', '', 'No posts match this filter yet'), el('p', 'muted small', 'Try switching tabs, clearing search, or publishing the first post above.'));
    feed.appendChild(empty);
    return;
  }

  for (const post of state.posts) {
    const card = el('article', 'post-card');
    const head = el('div', 'post-head');

    const authorWrap = el('div', 'post-author-wrap');
    authorWrap.addEventListener('click', () => filterByAuthor({ ...post.author, followers: (state.users.find((u) => u.id === post.userId)?.followers) || [] }));
    const av = el('div', 'avatar', (post.author.displayName || 'U').slice(0, 2).toUpperCase());
    av.style.background = post.author.accent || '#38bdf8';
    const authorText = el('div');
    authorText.append(
      el('span', 'post-author-name', post.author.displayName),
      el('span', 'post-author-meta', `@${post.author.username} • ${formatDate(post.createdAt)}`)
    );
    authorWrap.append(av, authorText);

    const badge = el('span', 'topic-badge', post.topic || '#general');
    head.append(authorWrap, badge);

    const body = el('p', 'post-body', post.content);
    card.append(head, body);

    if (post.codeSnippet) {
      const pre = el('pre', 'code-block');
      pre.appendChild(el('code', '', post.codeSnippet));
      card.appendChild(pre);
    }

    const actions = el('div', 'post-actions');
    const liked = state.user && (post.likes || []).includes(state.user.id);
    const saved = state.user && (post.bookmarks || []).includes(state.user.id);

    const likeBtn = el('button', `action-btn ${liked ? 'active' : ''}`, `Like (${(post.likes || []).length})`);
    likeBtn.type = 'button';
    likeBtn.addEventListener('click', () => handleLike(post.id));

    const saveBtn = el('button', `action-btn ${saved ? 'active' : ''}`, saved ? 'Saved' : 'Bookmark');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', () => handleBookmark(post.id));

    actions.append(likeBtn, saveBtn);

    if (state.user && post.userId === state.user.id) {
      const delBtn = el('button', 'btn btn-danger', 'Delete');
      delBtn.type = 'button';
      delBtn.style.padding = '5px 10px';
      delBtn.style.fontSize = '0.78rem';
      delBtn.addEventListener('click', () => handleDelete(post.id));
      actions.appendChild(delBtn);
    }
    card.appendChild(actions);

    const commentsWrap = el('div', 'comments-area');
    for (const c of post.comments || []) {
      const row = el('div', 'comment-item');
      const who = el('strong', '', `@${c.author?.username || 'user'}:`);
      row.append(who, document.createTextNode(c.text));
      commentsWrap.appendChild(row);
    }

    const cForm = el('form', 'comment-form');
    const cInput = el('input');
    cInput.type = 'text';
    cInput.placeholder = state.user ? 'Write a constructive comment...' : 'Sign in to comment...';
    const cBtn = el('button', 'btn btn-secondary', 'Reply');
    cBtn.type = 'submit';
    cForm.append(cInput, cBtn);
    cForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!cInput.value.trim()) return;
      await handleComment(post.id, cInput.value.trim());
      cInput.value = '';
    });
    commentsWrap.appendChild(cForm);

    card.appendChild(commentsWrap);
    feed.appendChild(card);
  }
}

function requireAuthOrPrompt() {
  if (state.user) return true;
  openAuthModal('login');
  return false;
}

async function handlePublish(e) {
  e.preventDefault();
  if (!requireAuthOrPrompt()) return;
  const content = document.getElementById('composer-text').value.trim();
  const topic = document.getElementById('composer-topic').value;
  const codeSnippet = document.getElementById('composer-code').value.trim();
  const status = document.getElementById('composer-status');
  if (!content) {
    status.textContent = 'Write something first.';
    return;
  }
  try {
    if (state.apiOnline) {
      await apiFetch('/api/posts', { method: 'POST', body: JSON.stringify({ content, topic, codeSnippet }) });
    } else {
      const db = getLocalDb();
      db.posts.unshift({ id: 'post-' + Date.now(), userId: state.user.id, topic, content, codeSnippet, likes: [], bookmarks: [], comments: [], createdAt: new Date().toISOString() });
      saveLocalDb(db);
    }
    document.getElementById('composer-text').value = '';
    document.getElementById('composer-code').value = '';
    document.getElementById('char-count').textContent = '0 / 500';
    status.textContent = 'Published!';
    setTimeout(() => { status.textContent = ''; }, 2000);
    await refreshAll();
  } catch (err) {
    status.textContent = err.message;
  }
}

async function handleLike(postId) {
  if (!requireAuthOrPrompt()) return;
  if (state.apiOnline) {
    await apiFetch(`/api/posts/${postId}/like`, { method: 'POST' });
  } else {
    const db = getLocalDb();
    const p = db.posts.find((x) => x.id === postId);
    if (p) {
      const i = p.likes.indexOf(state.user.id);
      if (i === -1) p.likes.push(state.user.id);
      else p.likes.splice(i, 1);
      saveLocalDb(db);
    }
  }
  await refreshAll();
}

async function handleBookmark(postId) {
  if (!requireAuthOrPrompt()) return;
  if (state.apiOnline) {
    await apiFetch(`/api/posts/${postId}/bookmark`, { method: 'POST' });
  } else {
    const db = getLocalDb();
    const p = db.posts.find((x) => x.id === postId);
    if (p) {
      p.bookmarks = p.bookmarks || [];
      const i = p.bookmarks.indexOf(state.user.id);
      if (i === -1) p.bookmarks.push(state.user.id);
      else p.bookmarks.splice(i, 1);
      saveLocalDb(db);
    }
  }
  await refreshAll();
}

async function handleComment(postId, text) {
  if (!requireAuthOrPrompt()) return;
  if (state.apiOnline) {
    await apiFetch(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ text }) });
  } else {
    const db = getLocalDb();
    const p = db.posts.find((x) => x.id === postId);
    if (p) {
      p.comments.push({ id: 'cmt-' + Date.now(), userId: state.user.id, text, createdAt: new Date().toISOString() });
      saveLocalDb(db);
    }
  }
  await refreshAll();
}

async function handleDelete(postId) {
  if (!requireAuthOrPrompt()) return;
  if (state.apiOnline) {
    await apiFetch(`/api/posts/${postId}`, { method: 'DELETE' });
  } else {
    const db = getLocalDb();
    db.posts = db.posts.filter((x) => !(x.id === postId && x.userId === state.user.id));
    saveLocalDb(db);
  }
  await refreshAll();
}

async function handleFollow(targetId) {
  if (!requireAuthOrPrompt()) return;
  if (state.apiOnline) {
    const data = await apiFetch(`/api/users/${targetId}/follow`, { method: 'POST' });
    saveSession(state.token, data.currentUser);
  } else {
    const db = getLocalDb();
    const me = db.users.find((u) => u.id === state.user.id);
    const target = db.users.find((u) => u.id === targetId);
    if (me && target) {
      const idx = me.following.indexOf(targetId);
      if (idx === -1) {
        me.following.push(targetId);
        if (!target.followers.includes(me.id)) target.followers.push(me.id);
      } else {
        me.following.splice(idx, 1);
        target.followers = target.followers.filter((id) => id !== me.id);
      }
      saveLocalDb(db);
      saveSession('demo-local', me);
    }
  }
  await refreshAll();
}

function openAuthModal(mode) {
  state.authMode = mode;
  const isSignup = mode === 'signup';
  document.getElementById('auth-modal-title').textContent = isSignup ? 'Create SocialSphere Account' : 'Sign In to SocialSphere';
  document.getElementById('auth-username').hidden = !isSignup;
  document.getElementById('auth-display').hidden = !isSignup;
  document.getElementById('auth-role').hidden = !isSignup;
  document.getElementById('auth-username').required = isSignup;
  document.getElementById('auth-submit-btn').textContent = isSignup ? 'Create Account' : 'Sign In';
  document.getElementById('tab-signin').classList.toggle('active', !isSignup);
  document.getElementById('tab-register').classList.toggle('active', isSignup);
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-modal').hidden = false;
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const errEl = document.getElementById('auth-error');
  errEl.textContent = '';
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  try {
    if (state.apiOnline) {
      if (state.authMode === 'signup') {
        const username = document.getElementById('auth-username').value.trim();
        const displayName = document.getElementById('auth-display').value.trim() || username;
        const role = document.getElementById('auth-role').value.trim();
        const data = await apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ username, displayName, email, password, role }) });
        saveSession(data.token, data.user);
      } else {
        const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        saveSession(data.token, data.user);
      }
    } else {
      const db = getLocalDb();
      if (state.authMode === 'signup') {
        const username = document.getElementById('auth-username').value.trim().toLowerCase();
        const newUser = { id: 'usr-' + Date.now(), username, displayName: document.getElementById('auth-display').value.trim() || username, email, role: document.getElementById('auth-role').value.trim() || 'Developer', bio: 'Building on SocialSphere.', accent: '#38bdf8', followers: [], following: [] };
        db.users.push(newUser);
        saveLocalDb(db);
        saveSession('demo-local', newUser);
      } else {
        const found = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || db.users[0];
        saveSession('demo-local', found);
      }
    }
    document.getElementById('auth-modal').hidden = true;
    await refreshAll();
  } catch (err) {
    errEl.textContent = err.message;
  }
}

async function quickDemoSignIn() {
  if (state.apiOnline) {
    const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'demo@socialsphere.dev', password: 'DemoPass123!' }) });
    saveSession(data.token, data.user);
  } else {
    const db = getLocalDb();
    saveSession('demo-local', db.users[0]);
  }
  await refreshAll();
}

function bindEvents() {
  document.getElementById('composer-text').addEventListener('input', (e) => {
    document.getElementById('char-count').textContent = `${e.target.value.length} / 500`;
  });
  document.getElementById('composer-form').addEventListener('submit', handlePublish);

  document.getElementById('search-input').addEventListener('input', (e) => {
    state.q = e.target.value.trim();
    refreshAll();
  });

  document.querySelectorAll('#feed-tabs .nav-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#feed-tabs .nav-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.tab = btn.dataset.tab;
      refreshAll();
    });
  });

  document.querySelectorAll('#topic-pills .chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#topic-pills .chip').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.topic = btn.dataset.topic;
      refreshAll();
    });
  });

  document.getElementById('btn-clear-author').addEventListener('click', () => {
    state.authorId = null;
    document.getElementById('active-filter-banner').hidden = true;
    refreshAll();
  });

  document.getElementById('btn-auth').addEventListener('click', () => {
    if (state.user) {
      saveSession('', null);
      refreshAll();
    } else {
      openAuthModal('login');
    }
  });

  document.getElementById('btn-quick-demo').addEventListener('click', quickDemoSignIn);
  document.getElementById('tab-signin').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('tab-register').addEventListener('click', () => openAuthModal('signup'));
  document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);

  document.getElementById('btn-edit-profile').addEventListener('click', () => {
    if (!state.user) return;
    document.getElementById('edit-display').value = state.user.displayName || '';
    document.getElementById('edit-role').value = state.user.role || '';
    document.getElementById('edit-bio').value = state.user.bio || '';
    document.getElementById('profile-msg').textContent = '';
    document.getElementById('profile-modal').hidden = false;
  });

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      displayName: document.getElementById('edit-display').value,
      role: document.getElementById('edit-role').value,
      bio: document.getElementById('edit-bio').value
    };
    if (state.apiOnline) {
      const data = await apiFetch('/api/users/me', { method: 'PATCH', body: JSON.stringify(payload) });
      saveSession(state.token, data.user);
    } else {
      const db = getLocalDb();
      const me = db.users.find((u) => u.id === state.user.id);
      if (me) {
        Object.assign(me, payload);
        saveLocalDb(db);
        saveSession('demo-local', me);
      }
    }
    document.getElementById('profile-modal').hidden = true;
    await refreshAll();
  });

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.close).hidden = true;
    });
  });
}

(async function init() {
  bindEvents();
  await detectApi();
  await refreshAll();
})();
