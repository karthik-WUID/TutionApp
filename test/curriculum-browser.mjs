import { chromium, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createApp } from '../server/app.mjs';

const calls = [];
let unavailable = false;
const bookId = 'do_31310347524809523211409', unitId = 'do_31307360983869849612178', pdfId = 'do_3129911299744563201237';
const item = (id, title, format = 'collection') => ({ id, title, format, description: '', board: [], grades: [], mediums: [], subjects: ['Science'], category: 'Textbook', creator: 'Test publisher', license: 'CC BY 4.0', mediaUrl: null, sourceUrl: `https://diksha.gov.in/resources/play/content/${id}` });
const provider = {
  async directory(filters) {
    calls.push(filters);
    if (unavailable) throw Object.assign(new Error('DIKSHA is temporarily unavailable. Please try again or open the official directory below.'), { status: 503 });
    const title = `${filters.board.id} Class ${filters.grade} ${filters.medium} ${filters.kind === 'textbooks' ? 'textbook' : 'lesson'}${filters.offset ? ' page 2' : ''}`;
    return { items: filters.query === 'no matching content' ? [] : [item(bookId, title, filters.kind === 'textbooks' ? 'collection' : 'video')], total: filters.query ? 0 : 21, limit: 20, offset: filters.offset, subjects: ['Science', 'Mathematics'], cached: false, stale: false, fetchedAt: new Date().toISOString(), source: 'DIKSHA' };
  },
  async resource(id, rootId) {
    calls.push({ id, rootId });
    const children = id === bookId ? [item(unitId, 'Resources and Development')] : id === unitId ? [item(pdfId, 'Chapter PDF', 'pdf')] : [];
    return { item: id === bookId ? item(id, 'Our textbook') : id === unitId ? item(id, 'Resources and Development') : { ...item(id, 'Chapter PDF', 'pdf'), mediaUrl: 'https://obj.diksha.gov.in/chapter.pdf' }, children, fetchedAt: new Date().toISOString(), stale: false, source: 'DIKSHA' };
  },
};
const collinsProvider = {
  async directory(filters) {
    calls.push({ ...filters, publisher: 'Collins' });
    const title = filters.subject === 'Value Education' ? 'Tree of Life' : 'Enhanced Digi Tech';
    return { items: [{ ...item('collins_series_enhanced-digi-tech', title), source: 'Collins', category: 'Publisher book series', grades: ['Middle stage'] }], total: 1, limit: 20, offset: filters.offset, subjects: ['Computer Science', 'Value Education', 'Social Studies'], cached: false, stale: false, fetchedAt: new Date().toISOString(), source: 'Collins', note: 'Full digital books and lessons use your school’s Collins access.' };
  },
  async resource(id, rootId, grade) {
    calls.push({ id, rootId, grade, publisher: 'Collins' });
    return { item: { ...item(id, 'Enhanced Digi Tech'), sourceUrl: 'https://collins.in/books_series/enhanced-digi-tech/' }, children: [{ ...item('collins_book_enhanced-digi-tech-6', 'Enhanced Digi Tech 6', 'link'), sourceUrl: 'https://collins.in/books/enhanced-digi-tech-6/' }], source: 'Collins', stale: false, fetchedAt: new Date().toISOString(), note: 'Full e-books and lessons use Collins school access.' };
  },
};
const app = createApp({ distPath: resolve('dist'), curriculumProvider: provider, collinsProvider });
const server = app.listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
let browser;
try {
  browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}), headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('https://obj.diksha.gov.in/**', (route) => route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF' }));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole('button', { name: 'Syllabus & lessons', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'CBSE Class 10 English textbook' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'NCERT textbooks', exact: true })).toHaveAttribute('href', 'https://ncert.nic.in/textbook.php?ln=en');
  await page.getByLabel('Curriculum subject').selectOption('Science');
  await expect.poll(() => calls.at(-1)?.subject).toBe('Science');
  await page.getByRole('button', { name: 'Explore chapters', exact: true }).click();
  await page.locator('.curriculum-chapters').getByRole('button', { name: 'Resources and Development' }).click();
  await page.locator('.curriculum-chapters').getByRole('button', { name: 'Chapter PDF' }).click();
  await expect(page.locator('.curriculum-pdf')).toHaveAttribute('src', 'https://obj.diksha.gov.in/chapter.pdf');
  await expect.poll(() => calls.at(-1)?.rootId).toBe(bookId);
  await page.getByRole('navigation', { name: 'Textbook sections' }).getByRole('button').first().click();
  await page.getByRole('button', { name: 'Back to directory', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'CBSE Class 10 English textbook page 2' })).toBeVisible();
  await page.getByLabel('Curriculum board').selectOption('Tamil Nadu State Board');
  await page.getByLabel('Curriculum medium').selectOption('Tamil');
  await page.getByLabel('Curriculum class').selectOption('9');
  await expect(page.getByRole('heading', { name: 'Tamil Nadu State Board Class 9 Tamil textbook' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tamil Nadu textbooks & lessons', exact: true })).toHaveAttribute('href', 'https://diksha.gov.in/tn/');
  await page.getByRole('button', { name: 'Lessons & videos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tamil Nadu State Board Class 9 Tamil lesson' })).toBeVisible();
  await page.getByRole('button', { name: 'Use for my learning path', exact: true }).click();
  await expect.poll(async () => app.locals.store.db.prepare('SELECT grade, board FROM learning_preferences WHERE user_id = ?').get('aanya')).toEqual({ grade: 9, board: 'Tamil Nadu State Board' });
  await page.getByRole('textbox', { name: 'Search textbooks or lessons' }).fill('no matching content');
  await expect(page.getByRole('heading', { name: 'No resources match these filters.' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search textbooks or lessons' }).fill('');
  await expect(page.locator('.curriculum-card')).toHaveCount(1);
  unavailable = true;
  await page.getByRole('button', { name: 'Retry curriculum request' }).click();
  await expect(page.getByRole('alert')).toContainText('DIKSHA is temporarily unavailable');
  await expect(page.getByRole('link', { name: 'Open official directory', exact: true })).toBeVisible();
  unavailable = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.curriculum-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Social Studies', exact: true }).click();
  await expect.poll(() => calls.at(-1)?.subject).toBe('Social Studies');
  await page.getByRole('button', { name: 'Textbook directory', exact: true }).click();
  await expect.poll(() => calls.at(-1)?.kind).toBe('textbooks');
  await expect(page.getByLabel('Curriculum subject')).toHaveValue('Social Studies');
  await page.getByRole('button', { name: 'Tamil syllabus (Tamil Nadu)', exact: true }).click();
  await expect(page.getByLabel('Curriculum medium')).toHaveValue('Tamil');
  await expect.poll(() => calls.at(-1)?.subject).toBe('Tamil');
  for (const subject of ['Computer Science', 'Value Education']) {
    await page.getByRole('button', { name: subject, exact: true }).click();
    await expect.poll(() => calls.at(-1)?.subject).toBe(subject);
  }
  await page.getByLabel('Curriculum board').selectOption('Matriculation / Collins');
  await page.getByLabel('Curriculum class').selectOption('6');
  await page.getByRole('button', { name: 'Computer Science', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Enhanced Digi Tech', exact: true })).toBeVisible();
  await expect(page.getByLabel('Curriculum medium')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Lessons & videos', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Explore book series', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Enhanced Digi Tech 6', exact: true })).toHaveAttribute('href', 'https://collins.in/books/enhanced-digi-tech-6/');
  await expect(page.getByRole('link', { name: 'Open on Collins', exact: true })).toHaveAttribute('href', 'https://collins.in/books_series/enhanced-digi-tech/');
  await expect(page.locator('.curriculum-pdf')).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to directory', exact: true }).click();
  await page.getByRole('button', { name: 'Value Education', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tree of Life', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Use for my learning path', exact: true }).click();
  await expect.poll(async () => app.locals.store.db.prepare('SELECT grade, board FROM learning_preferences WHERE user_id = ?').get('aanya')).toEqual({ grade: 6, board: 'Matriculation / Collins' });
  await page.getByRole('button', { name: 'Learning path', exact: true }).click();
  await expect(page.getByLabel('Choose board', { exact: true })).toHaveValue('Matriculation / Collins');
  await page.getByRole('button', { name: 'Syllabus & lessons', exact: true }).click();
  await expect(page.getByLabel('Curriculum board')).toHaveValue('Matriculation / Collins');
  await expect(page.getByRole('heading', { name: 'Enhanced Digi Tech', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByLabel('Curriculum medium')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/smart-tutor-curriculum-mobile.png', fullPage: true });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Curriculum browser checks passed: both boards, four featured subjects, chapters/PDF, filters, pagination, search, outage/retry, Collins catalogue/book links, saved preferences, mobile layout.');
} finally {
  await browser?.close(); server.closeAllConnections();
  await new Promise((r) => server.close(r)); app.locals.store.db.close();
}
