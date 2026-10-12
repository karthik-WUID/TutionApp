import { chromium, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.mjs';
import { createOxfordProvider } from '../server/oxford-dictionary.mjs';
import { oxfordWords, oxfordThesaurus, wordPicture } from './dictionary-fixtures.mjs';

const calls = [], pictureCalls = [];
let configured = true, noPicture = false, picturesFail = false;
const provider = createOxfordProvider({ appId: 'test-id', appKey: 'test-secret', mode: 'production', fetchImpl: async (url) => new Response(JSON.stringify(url.includes('/words/') ? oxfordWords : oxfordThesaurus)) });
const app = createApp({ distPath: resolve('dist'), oxfordProvider: {
  status: () => ({ ...provider.status(), configured }),
  async lookup(word, language) {
    calls.push({ word, language });
    if (word === 'missing') throw Object.assign(new Error('Oxford has no entry for this word.'), { status: 404, code: 'NOT_FOUND' });
    if (word === 'limited') throw Object.assign(new Error('Oxford’s request allowance has been reached.'), { status: 429, code: 'QUOTA' });
    if (word === 'slow') await new Promise((r) => setTimeout(r, 300));
    return provider.lookup(word, language);
  },
}, dictionaryPictureProvider: { async lookup(word) { pictureCalls.push(word); if (picturesFail) throw new Error('Upstream unavailable'); return noPicture ? { picture: null, note: 'No freely licensed related picture is available for this word.' } : wordPicture; } } });
const server = app.listen(0, '127.0.0.1'); await new Promise((r) => server.once('listening', r));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://upload.wikimedia.org/**', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZAAAAABJRU5ErkJggg==', 'base64') }));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole('button', { name: 'Topic dictionary', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Oxford English dictionary', exact: true })).toBeVisible();
  const input = page.getByLabel('Oxford English word'), submit = page.getByRole('button', { name: 'Look up word', exact: true });
  await input.fill('apple');
  await expect(submit).toBeEnabled(); assert.equal(calls.length, 0, 'typing never spends an Oxford API call');
  await submit.click();
  await expect(page.getByText('A round fruit used in this test.', { exact: true })).toBeVisible();
  await expect(page.getByText('The tree in this test.', { exact: true })).toBeVisible();
  await expect(page.getByText('test synonym', { exact: true })).toBeVisible();
  await expect(page.getByText('test opposite', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Pronunciation of apple 1')).toHaveAttribute('src', 'https://audio.oxforddictionaries.com/en/mp3/apple_test.mp3');
  await expect(page.getByRole('img', { name: 'An apple used for a browser test.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Picture source · Wikimedia Commons', exact: true })).toHaveAttribute('href', wordPicture.picture.sourceUrl);
  await page.locator('.oxford-picture summary').click();
  await expect(page.getByRole('link', { name: 'CC BY-SA 4.0', exact: true })).toHaveAttribute('href', wordPicture.picture.licenseUrl);
  await expect(page.getByText(/Content provided by Oxford Dictionaries/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Topic meanings', exact: true })).toBeVisible();
  await page.getByLabel('Find a word or meaning').fill('discriminant'); await expect(page.locator('.dictionary-card')).toHaveCount(1);
  await page.getByLabel('Oxford English variant').selectOption('en-us'); await submit.click();
  await expect.poll(() => calls.at(-1)?.language).toBe('en-us');
  await input.fill('missing'); await submit.click(); await expect(page.getByRole('alert')).toContainText('no entry');
  await input.fill('limited'); await submit.click(); await expect(page.getByRole('alert')).toContainText('allowance');
  await input.fill('slow'); await submit.click(); await expect.poll(() => calls.at(-1)?.word).toBe('slow'); await input.fill('a different word');
  await page.waitForTimeout(400); await expect(page.getByText('A round fruit used in this test.', { exact: true })).toHaveCount(0);
  noPicture = true; await page.getByRole('button', { name: 'Find a picture', exact: true }).click(); await expect(page.getByText('No freely licensed related picture is available for this word.', { exact: true })).toBeVisible();
  picturesFail = true; await page.getByRole('button', { name: 'Find a picture', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('pictures are temporarily unavailable'); picturesFail = false;
  configured = false; noPicture = false;
  await page.reload(); await page.getByRole('button', { name: 'Topic dictionary', exact: true }).click();
  await expect(page.getByText(/Oxford access is waiting for activation/)).toBeVisible(); await input.fill('apple'); await expect(submit).toBeDisabled();
  await page.getByRole('button', { name: 'Find a picture', exact: true }).click(); await expect(page.getByRole('img', { name: 'An apple used for a browser test.' })).toBeVisible();
  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  await mobile.route('https://upload.wikimedia.org/**', (route) => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZAAAAABJRU5ErkJggg==', 'base64') }));
  configured = true;
  await mobile.goto(`http://127.0.0.1:${server.address().port}`); await mobile.getByRole('button', { name: 'Open navigation' }).click(); await mobile.getByRole('button', { name: 'Topic dictionary', exact: true }).click();
  await mobile.getByLabel('Oxford English word').fill('apple'); await expect(mobile.getByRole('button', { name: 'Look up word', exact: true })).toBeEnabled(); await mobile.getByRole('button', { name: 'Look up word', exact: true }).click();
  await expect(mobile.getByText('test synonym', { exact: true })).toBeVisible(); await expect(mobile.getByRole('img', { name: 'An apple used for a browser test.' })).toBeVisible();
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, '375px dictionary has no horizontal overflow');
  await mobile.screenshot({ path: '/tmp/smart-tutor-dictionary-mobile-test.png', fullPage: true });
  assert.deepEqual(errors, []); assert.equal(pictureCalls.includes('apple'), true);
  console.log('PASS: Oxford meanings, nested senses, synonyms, antonyms, pronunciation, picture attribution, variant selection, manual requests, missing words, quota, cancelled requests, missing credentials, independent pictures, existing topic search, and 375px mobile layout. All Oxford responses are synthetic test fixtures.');
} finally { await browser?.close(); await new Promise((r) => server.close(r)); app.locals.store.db.close(); }
