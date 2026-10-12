import { chromium, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createApp } from '../server/app.mjs';
import { lessons } from '../server/curriculum.mjs';

const app = createApp({ distPath: resolve('dist') });
const server = app.listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}),
  headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'],
});
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
page.on('pageerror', (e) => errors.push(e.message));
const closeDialog = async () => { await page.getByRole('button', { name: 'Close dialog' }).click(); };
const switchProfile = async (name) => {
  await page.getByRole('button', { name: 'Switch classroom profile' }).click();
  await page.locator('.profile-menu button').filter({ hasText: name }).click();
  await expect(page.getByRole('heading', { name: `Hey ${name.split(' ')[0]}, let’s keep learning.` })).toBeVisible();
};
try {
  await page.goto(origin);
  await expect(page.getByRole('heading', { name: 'Hey Aanya, let’s keep learning.' })).toBeVisible();
  await page.screenshot({ path: '/tmp/smart-tutor-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Ask a doubt', exact: true }).click();
  await page.getByPlaceholder('e.g. Why does the quadratic formula work?').fill('How can I check both quadratic roots?');
  await page.getByPlaceholder('What have you tried? Where did you get stuck?').fill('I found the roots 2 and 3. Can I check each one in the original equation?');
  await page.getByRole('button', { name: 'Share with the classroom' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'How can I check both quadratic roots?' })).toBeVisible();
  await page.getByLabel('Add your perspective.').fill('I tried substituting x = 2 and the expression became zero.');
  await page.getByRole('button', { name: 'Post reply' }).click();
  await expect(page.getByText('I tried substituting x = 2 and the expression became zero.', { exact: true })).toBeVisible();
  await closeDialog();
  await switchProfile('Arjun Mehta');
  await page.getByRole('button', { name: 'Community', exact: true }).click();
  await page.getByRole('button').filter({ has: page.getByRole('heading', { name: 'How can I check both quadratic roots?' }) }).click();
  await expect(page.getByRole('button', { name: 'That helped! Mark resolved' })).toHaveCount(0);
  await page.getByLabel('Add your perspective.').fill('Check x = 3 as well. Both solutions should give zero.');
  await page.getByRole('button', { name: 'Post reply' }).click();
  await closeDialog();
  await switchProfile('Neha Kapoor');
  await page.getByRole('button', { name: 'Community', exact: true }).click();
  await page.getByRole('button').filter({ has: page.getByRole('heading', { name: 'How can I check both quadratic roots?' }) }).click();
  await expect(page.getByText('Check x = 3 as well. Both solutions should give zero.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'That helped! Mark resolved' }).click();
  await expect(page.getByRole('button', { name: 'Reopen this doubt' })).toBeVisible();
  await closeDialog();
  await switchProfile('Aanya Sharma');
  await page.getByRole('button', { name: 'Study sessions', exact: true }).click();
  await page.locator('.session-card').filter({ hasText: 'Newton’s laws in everyday life' }).getByRole('button', { name: 'View session' }).click();
  await page.getByRole('button', { name: 'Book my seat' }).click();
  await expect(page.getByRole('heading', { name: 'The study room' })).toBeVisible();
  await page.getByLabel('Study room message', { exact: true }).fill('Could we talk about seat belts and inertia?');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByText('Could we talk about seat belts and inertia?', { exact: true })).toBeVisible();
  const peer = await browser.newPage();
  await peer.addInitScript(() => localStorage.setItem('smart-tutor-profile', 'arjun'));
  await peer.goto(origin); await peer.getByRole('button', { name: 'Study sessions', exact: true }).click();
  await peer.locator('.session-card').filter({ hasText: 'Newton’s laws in everyday life' }).getByRole('button', { name: 'View session' }).click();
  await peer.getByRole('button', { name: 'Book my seat' }).click();
  await expect(peer.getByText('Could we talk about seat belts and inertia?', { exact: true })).toBeVisible();
  await peer.getByLabel('Study room message', { exact: true }).fill('Yes, I would like to understand inertia too.');
  await peer.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByText('Yes, I would like to understand inertia too.', { exact: true })).toBeVisible();
  await peer.close(); await closeDialog();
  await page.getByRole('button', { name: 'Learning path', exact: true }).click();
  await page.getByLabel('Choose class', { exact: true }).selectOption('1');
  await expect(page.getByRole('heading', { name: 'Count, add, and discover' })).toBeVisible();
  await page.getByLabel('Choose board', { exact: true }).selectOption('Matriculation / Collins');
  await expect(page.getByLabel('Choose board', { exact: true })).toBeEnabled();
  await page.getByLabel('Choose class', { exact: true }).selectOption('10');
  await expect(page.getByRole('heading', { name: 'Getting to know quadratic equations' })).toBeVisible();
  await page.locator('.lesson-card').filter({ hasText: 'Getting to know quadratic equations' }).getByRole('button').click();
  await page.getByRole('button', { name: 'I’ve understood this · Continue' }).click();
  await expect(page.getByRole('button', { name: 'Pause animation' })).toBeEnabled({ timeout: 15_000 });
  await expect(page.locator('.visual-canvas canvas')).toHaveCount(1);
  await page.screenshot({ path: '/tmp/smart-tutor-animation.png', fullPage: true });
  await page.getByRole('button', { name: 'Make explanation video' }).click();
  await expect(page.locator('.video-result video')).toBeVisible({ timeout: 30_000 });
  await page.locator('.video-result video').evaluate(async (video) => {
    if (video.readyState < 1) await new Promise((r) => video.addEventListener('loadedmetadata', r, { once: true }));
    if (video.error) throw new Error(video.error.message);
    await video.play();
  });
  await expect.poll(() => page.locator('.video-result video').evaluate((v) => v.currentTime)).toBeGreaterThan(.1);
  await page.locator('.video-result video').evaluate((v) => v.pause());
  await page.getByRole('button', { name: 'I’ve explored this · Let’s practise' }).click();
  const answers = [
    'Factor the polynomial into (x − 2)(x − 3), then set each factor to zero.', 'Parabola', 'Two', 'Discriminant',
    'x² − 7x + 12 = (x − 3)(x − 4), so x = 3 or x = 4.', 'x(x + 1) = 12 gives (x + 4)(x − 3) = 0. The dimensions are 3 cm by 4 cm.',
  ];
  const fields = page.locator('.homework-question input, .homework-question textarea');
  for (let i = 0; i < answers.length; i++) await fields.nth(i).fill(answers[i]);
  await page.getByRole('button', { name: 'Save a draft' }).click();
  await expect(page.getByText(/Draft saved ·/)).toBeVisible();
  await page.getByRole('button', { name: 'Submit my homework' }).click();
  await expect(page.getByText(/Submitted for tutor review ·/)).toBeVisible();
  await page.getByRole('button', { name: 'Lesson test', exact: true }).click();
  const l = lessons.find((l) => l.id === 'quadratics');
  for (let i = 0; i < l.questions.length; i++) await page.locator('.quiz-question').nth(i).locator('.quiz-option').nth(l.questions[i].answer).click();
  await page.getByRole('button', { name: 'Check my answers' }).click();
  await expect(page.locator('.quiz-score > strong')).toHaveText('100%');
  await page.getByRole('button', { name: 'My progress', exact: true }).click();
  await expect(page.locator('.subject-progress').filter({ hasText: 'Mathematics' }).locator('.subject-progress-head > strong')).toHaveText('100%');
  await page.getByRole('button', { name: 'Mood & skills', exact: true }).click();
  await page.getByRole('button', { name: '😴 Tired', exact: true }).click();
  await page.getByRole('button', { name: 'Confidence 2 of 5' }).click();
  await page.getByPlaceholder('A topic that feels tricky, a little win, a reason to smile…').fill('A short break and a funny question would help.');
  await page.getByRole('button', { name: 'Save my check-in' }).click();
  await expect(page.getByRole('heading', { name: 'Tired · A little suggestion' })).toBeVisible();
  await expect(page.getByText('Tired · Confidence 2/5')).toBeVisible();
  await page.getByRole('button', { name: 'Topic dictionary', exact: true }).click();
  await page.getByLabel('Find a word or meaning').fill('discriminant');
  await expect(page.locator('.dictionary-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Discriminant', exact: true })).toBeVisible();
  await switchProfile('Neha Kapoor');
  await page.getByRole('button', { name: 'Learning path', exact: true }).click();
  await page.getByLabel('Choose board', { exact: true }).selectOption('Matriculation / Collins');
  await expect(page.getByLabel('Choose board', { exact: true })).toBeEnabled();
  await page.locator('.textbook-manager summary').click();
  await page.getByLabel('Textbook title', { exact: true }).fill('Classroom mathematics');
  await page.getByLabel('Edition / year', { exact: true }).fill('2026');
  await page.getByLabel('Chapter / lesson', { exact: true }).fill('Quadratic equations · Chapter 4');
  await page.getByLabel('Assigned portions', { exact: true }).fill('Factorisation, roots, and practice exercise 4.1.');
  await page.getByRole('button', { name: 'Save textbook mapping' }).click();
  await expect(page.locator('.textbook-reference')).toContainText('Classroom mathematics');
  await page.getByRole('button', { name: 'My homework', exact: true }).click();
  await page.getByRole('button', { name: 'Lesson practice', exact: true }).click();
  await page.locator('.homework-list-card').filter({ hasText: 'Getting to know quadratic equations' }).getByRole('button').click();
  await page.getByPlaceholder('Celebrate what worked, then suggest a next step…').fill('Clear factorisation. Great job checking the dimensions are positive!');
  await page.getByRole('button', { name: 'Save tutor feedback' }).click();
  await expect(page.getByText(/Reviewed by your tutor ·/)).toBeVisible();
  await switchProfile('Aanya Sharma');
  await page.getByRole('button', { name: 'Learning path', exact: true }).click();
  for (const grade of [1, 4, 6, 10, 11]) {
    await page.getByLabel('Choose class', { exact: true }).selectOption(String(grade));
    const topics = lessons.filter((l) => l.minGrade <= grade && l.maxGrade >= grade);
    await expect(page.getByRole('heading', { name: topics[0].title, exact: true })).toBeVisible();
    for (const topic of topics) {
      await page.locator('.lesson-card').filter({ hasText: topic.title }).getByRole('button').click();
      await page.getByRole('button', { name: '3D & animation', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Pause animation' })).toBeEnabled();
      const size = await page.locator('.visual-canvas canvas').evaluate(async (canvas) => { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return canvas.toDataURL().length; });
      if (size < 8000) throw new Error(`3D model did not render for ${topic.id}: ${size} bytes`);
      await page.getByRole('button', { name: 'Back to your learning path' }).click();
    }
  }
  await page.getByLabel('Choose class', { exact: true }).selectOption('10');
  await expect(page.getByRole('heading', { name: 'Getting to know quadratic equations' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Learning path', exact: true }).click();
  await expect(page.getByLabel('Choose class', { exact: true })).toBeVisible();
  await expect.poll(() => page.locator('.sidebar').evaluate((e) => Math.round(e.getBoundingClientRect().right))).toBeLessThanOrEqual(0);
  const width = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  if (width.content > width.viewport) throw new Error(`Mobile layout overflows: ${JSON.stringify(width)}`);
  await page.screenshot({ path: '/tmp/smart-tutor-mobile.png', fullPage: true });
  assertNoErrors();
  console.log('PASS: student/tutor discussions, cross-browser live chat, class/board selection, 3D animation, playable video export, homework submission/review, graded quiz, progress, mood, dictionary, and mobile layout.');
} finally {
  await browser.close(); server.closeAllConnections(); await new Promise((r) => server.close(r)); app.locals.store.db.close();
}
function assertNoErrors() { if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`); }
