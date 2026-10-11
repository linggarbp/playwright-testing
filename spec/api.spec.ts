/**
 * API smoke via Playwright's `request` fixture — no browser involved.
 *
 * jsonplaceholder is a public, read-only JSON API; these two tests prove the request-fixture wiring
 * (status assertions, JSON parsing, query params) without depending on any UI.
 *
 *   npx playwright test spec/api.spec.ts
 */

import { expect, test } from '@playwright/test';

const API = 'https://jsonplaceholder.typicode.com';

test.describe('Public JSON API', () => {
  test('GET /posts/1 returns the expected post', async ({ request }) => {
    const response = await request.get(`${API}/posts/1`);

    expect(response.status()).toBe(200);
    const post = await response.json();
    expect(post).toMatchObject({ id: 1, userId: 1 });
    expect(post.title).toBeTruthy();
  });

  test('GET /posts filters by author', async ({ request }) => {
    const response = await request.get(`${API}/posts`, { params: { userId: 1 } });

    expect(response.status()).toBe(200);
    const posts = (await response.json()) as { userId: number }[];
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((post) => post.userId === 1)).toBe(true);
  });
});
