const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { createSocialStore } = require('./dataStore');

const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  const [salt, keyHex] = String(storedHash || '').split(':');
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function signJwt(payload, secret, ttlSec = 86400) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttlSec })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyJwt(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return parsed;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  });
  res.end(body);
}

function createSocialServer({ dataFilePath, jwtSecret } = {}) {
  const store = createSocialStore(dataFilePath);
  const secret = jwtSecret || process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

  function getAuthUser(req) {
    const hdr = req.headers.authorization || '';
    if (!hdr.startsWith('Bearer ')) return null;
    const claims = verifyJwt(hdr.slice(7), secret);
    if (!claims) return null;
    return store.findUserById(claims.id);
  }

  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      });
      return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    try {
      if (pathname === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, { status: 'ok', service: 'SocialSphere API' });
      }

      if ((pathname === '/api/auth/signup' || pathname === '/api/auth/register') && req.method === 'POST') {
        const { username, displayName, email, password, role, bio } = await parseBody(req);
        if (!username || !email || !password || String(password).length < 6) {
          return sendJson(res, 400, { message: 'Username, valid email, and password (6+ chars) are required.' });
        }
        if (store.findUserByEmail(email)) {
          return sendJson(res, 409, { message: 'Email is already registered.' });
        }
        if (store.findUserByUsername(username)) {
          return sendJson(res, 409, { message: 'Username is already taken.' });
        }
        const safeUser = store.createUser({
          username,
          displayName,
          email,
          passwordHash: hashPassword(password),
          role,
          bio
        });
        const token = signJwt({ id: safeUser.id, email: safeUser.email }, secret);
        return sendJson(res, 201, { token, user: safeUser });
      }

      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const { email, password } = await parseBody(req);
        const user = store.findUserByEmail(email);
        if (!user || !verifyPassword(String(password || ''), user.passwordHash)) {
          return sendJson(res, 401, { message: 'Invalid email or password.' });
        }
        const safeUser = store.sanitizeUser(user);
        const token = signJwt({ id: safeUser.id, email: safeUser.email }, secret);
        return sendJson(res, 200, { token, user: safeUser });
      }

      if (pathname === '/api/auth/me' && req.method === 'GET') {
        const user = getAuthUser(req);
        if (!user) return sendJson(res, 401, { message: 'Unauthorized' });
        return sendJson(res, 200, { user: store.sanitizeUser(user) });
      }

      if (pathname === '/api/users' && req.method === 'GET') {
        return sendJson(res, 200, { users: store.listUsers() });
      }

      if (pathname === '/api/users/me' && req.method === 'PATCH') {
        const user = getAuthUser(req);
        if (!user) return sendJson(res, 401, { message: 'Sign in required.' });
        const updated = store.updateProfile(user.id, await parseBody(req));
        return sendJson(res, 200, { user: updated });
      }

      if (pathname.startsWith('/api/users/') && pathname.endsWith('/follow') && req.method === 'POST') {
        const user = getAuthUser(req);
        if (!user) return sendJson(res, 401, { message: 'Sign in required to follow creators.' });
        const targetId = pathname.slice('/api/users/'.length, -'/follow'.length);
        const result = store.toggleFollow(targetId, user.id);
        if (!result) return sendJson(res, 404, { message: 'User not found.' });
        if (result.error) return sendJson(res, 400, { message: result.error });
        return sendJson(res, 200, result);
      }

      if (pathname.startsWith('/api/users/') && req.method === 'GET') {
        const userId = pathname.slice('/api/users/'.length);
        const profile = store.getUserProfile(userId);
        if (!profile) return sendJson(res, 404, { message: 'Profile not found.' });
        return sendJson(res, 200, profile);
      }

      if (pathname === '/api/posts' && req.method === 'GET') {
        const user = getAuthUser(req);
        const tab = parsedUrl.searchParams.get('tab');
        const posts = store.getPosts({
          topic: parsedUrl.searchParams.get('topic'),
          q: parsedUrl.searchParams.get('q'),
          authorId: parsedUrl.searchParams.get('authorId'),
          followingOf: tab === 'following' && user ? user.id : null,
          bookmarkedBy: tab === 'saved' && user ? user.id : null
        });
        return sendJson(res, 200, { posts });
      }

      if ((pathname === '/api/posts' || pathname === '/api/posts/create') && req.method === 'POST') {
        const user = getAuthUser(req);
        if (!user) return sendJson(res, 401, { message: 'Sign in required to publish posts.' });
        const body = await parseBody(req);
        if (!body.content || !String(body.content).trim()) {
          return sendJson(res, 400, { message: 'Post content cannot be empty.' });
        }
        const post = store.createPost({
          userId: user.id,
          content: body.content,
          topic: body.topic,
          codeSnippet: body.codeSnippet
        });
        return sendJson(res, 201, { post });
      }

      if (pathname.startsWith('/api/posts/') && pathname.endsWith('/like') && req.method === 'POST') {
        const user = getAuthUser(req);
        if (!user) return sendJson(res, 401, { message: 'Sign in required to like posts.' });
        const postId = pathname.slice('/api/posts/'.length, -'/like'.length);
        const result = store.toggleLike(postId, user.id);
        return result ? sendJson(res, 200, result) : sendJson(res, 404, { message: 'Post not found.' });
      }

      if (pathname.startsWith('/api/posts/') && pathname.endsWith('/bookmark') && req.method === 'POST') {
        const user = getAuthUser(req);
        if (!user) return sendJson(res, 401, { message: 'Sign in required to bookmark posts.' });
        const postId = pathname.slice('/api/posts/'.length, -'/bookmark'.length);
        const result = store.toggleBookmark(postId, user.id);
        return result ? sendJson(res, 200, result) : sendJson(res, 404, { message: 'Post not found.' });
      }

      if (pathname.startsWith('/api/posts/') && pathname.endsWith('/comments') && req.method === 'POST') {
        const user = getAuthUser(req);
        if (!user) return sendJson(res, 401, { message: 'Sign in required to comment.' });
        const postId = pathname.slice('/api/posts/'.length, -'/comments'.length);
        const body = await parseBody(req);
        if (!body.text || !String(body.text).trim()) {
          return sendJson(res, 400, { message: 'Comment text cannot be empty.' });
        }
        const post = store.addComment(postId, user.id, body.text);
        return post ? sendJson(res, 201, { post }) : sendJson(res, 404, { message: 'Post not found.' });
      }

      if (pathname.startsWith('/api/posts/') && req.method === 'DELETE') {
        const user = getAuthUser(req);
        if (!user) return sendJson(res, 401, { message: 'Sign in required.' });
        const postId = pathname.slice('/api/posts/'.length);
        const out = store.deletePost(postId, user.id);
        if (out.error) return sendJson(res, out.status, { message: out.error });
        return sendJson(res, 200, { deleted: true });
      }

      if (pathname.startsWith('/api/')) {
        return sendJson(res, 404, { message: 'API route not found' });
      }

      const target = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const fullPath = path.resolve(FRONTEND_DIR, target);
      if (!fullPath.startsWith(FRONTEND_DIR) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not Found');
      }
      const ext = path.extname(fullPath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(fullPath).pipe(res);
    } catch (err) {
      sendJson(res, 400, { message: err.message || 'Bad request' });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 5050);
  const server = createSocialServer();
  server.listen(port, () => {
    console.log(`[SocialSphere] Server running on http://127.0.0.1:${port}`);
  });
}

module.exports = { createSocialServer };
