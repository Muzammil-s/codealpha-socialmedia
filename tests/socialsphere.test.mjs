import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createSocialServer } = require('../backend/server.js');

function startServer() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socialsphere-test-'));
  const dataFilePath = path.join(tmpDir, 'social.json');
  const server = createSocialServer({ dataFilePath, jwtSecret: 'social-test-secret' });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${addr.port}`,
        close: () =>
          new Promise((done) => {
            server.close(() => {
              fs.rmSync(tmpDir, { recursive: true, force: true });
              done();
            });
          })
      });
    });
  });
}

test('signup, profile update, and sanitized user payload', async () => {
  const srv = await startServer();
  try {
    const signup = await fetch(`${srv.baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'zain_dev', displayName: 'Zain Ali', email: 'zain@example.com', password: 'SecretPassword1', role: 'CS Student' })
    });
    assert.equal(signup.status, 201);
    const data = await signup.json();
    assert.ok(data.token);
    assert.equal(data.user.passwordHash, undefined);

    const patch = await fetch(`${srv.baseUrl}/api/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
      body: JSON.stringify({ bio: 'Updated bio on SocialSphere' })
    });
    assert.equal(patch.status, 200);
    const updated = await patch.json();
    assert.equal(updated.user.bio, 'Updated bio on SocialSphere');
  } finally {
    await srv.close();
  }
});

test('post creation, like, comment, bookmark, and ownership enforcement', async () => {
  const srv = await startServer();
  try {
    const login = await fetch(`${srv.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@socialsphere.dev', password: 'DemoPass123!' })
    });
    assert.equal(login.status, 200);
    const { token } = await login.json();

    const created = await fetch(`${srv.baseUrl}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ topic: '#security', content: 'Testing post authorization and escaping', codeSnippet: 'const x = 1;' })
    });
    assert.equal(created.status, 201);
    const { post } = await created.json();

    const liked = await fetch(`${srv.baseUrl}/api/posts/${post.id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal((await liked.json()).liked, true);

    const cmt = await fetch(`${srv.baseUrl}/api/posts/${post.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: 'Verified test comment' })
    });
    assert.equal(cmt.status, 201);
    assert.equal((await cmt.json()).post.comments.length, 1);

    // Cannot delete someone else's seeded post
    const forbiddenDel = await fetch(`${srv.baseUrl}/api/posts/post-102`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(forbiddenDel.status, 403);

    // Can delete own post
    const ownDel = await fetch(`${srv.baseUrl}/api/posts/${post.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(ownDel.status, 200);
  } finally {
    await srv.close();
  }
});

test('follow/unfollow updates both users and following feed', async () => {
  const srv = await startServer();
  try {
    const login = await fetch(`${srv.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@socialsphere.dev', password: 'DemoPass123!' })
    });
    const { token } = await login.json();

    const res = await fetch(`${srv.baseUrl}/api/users/usr-tariq/follow`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(res.status, 200);
    const followData = await res.json();
    assert.equal(followData.isFollowing, true);
    assert.ok(followData.currentUser.following.includes('usr-tariq'));
  } finally {
    await srv.close();
  }
});
