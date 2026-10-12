import { chromium, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createApp } from '../server/app.mjs';

const app = createApp({ distPath: resolve('dist') });
const server = app.listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const navigate = (name) => page.getByRole('button', { name, exact: true }).click();
const switchProfile = async (name) => {
  await page.getByRole('button', { name: 'Switch classroom profile' }).click();
  await page.locator('.profile-menu button').filter({ hasText: name }).click();
  await expect(page.getByRole('heading', { name: `Hey ${name.split(' ')[0]}, let’s keep learning.` })).toBeVisible();
};
const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
try {
  await page.goto(origin);
  await navigate('My homework');
  await expect(page.locator('.task-card')).toHaveCount(2);
  await page.locator('.task-card').filter({ hasText: 'Practise:' }).click();
  await navigate('Open lesson homework');
  await expect(page.getByRole('button', { name: 'Submit my homework' })).toBeVisible();
  await navigate('Assignments & deadlines');
  await navigate('Add an assignment');
  await page.getByLabel('Assignment title', { exact: true }).fill('My plant observation project');
  await page.getByLabel('Subject', { exact: true }).selectOption('Projects');
  await page.getByLabel('Activity type').selectOption('project');
  await page.getByLabel('Instructions', { exact: true }).fill('Observe a houseplant, sketch it, and explain your findings.');
  await navigate('Add to tracker');
  await page.locator('.task-card').filter({ hasText: 'My plant observation project' }).click();
  await page.getByLabel('Your work', { exact: true }).fill('My plant has broad leaves. I drew and labelled the stem and roots.');
  await page.getByLabel('Plan the idea', { exact: true }).check();
  await navigate('Save draft');
  await expect(page.getByText('Draft and project steps saved.', { exact: true })).toBeVisible();
  await page.reload();
  await navigate('My homework');
  await page.locator('.task-card').filter({ hasText: 'My plant observation project' }).click();
  await expect(page.getByLabel('Your work', { exact: true })).toHaveValue(/broad leaves/);
  await expect(page.getByLabel('Plan the idea', { exact: true })).toBeChecked();
  await page.getByLabel('Build or investigate', { exact: true }).check();
  await page.getByLabel('Present and reflect', { exact: true }).check();
  await navigate('Submit work');
  await expect(page.getByText('Work submitted for tutor feedback.', { exact: true })).toBeVisible();
  await switchProfile('Neha Kapoor');
  await navigate('My homework');
  await page.locator('.task-card').filter({ hasText: 'My plant observation project' }).click();
  await page.getByLabel('Tutor feedback', { exact: true }).fill('Good labels. Add a short explanation of what roots do.');
  await navigate('Review assignment');
  await expect(page.locator('.workspace-feedback')).toContainText('Good labels');
  await switchProfile('Aanya Sharma');

  await navigate('Study planner');
  const future = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  await page.getByLabel('First day', { exact: true }).fill(future);
  await navigate('Build 7-day timetable');
  await expect(page.getByText('Your seven-day timetable is ready.', { exact: true })).toBeVisible();
  await expect(page.locator('.study-block')).not.toHaveCount(0);
  await page.locator('.study-block').first().getByRole('button', { name: 'Mark complete' }).click();
  await expect(page.locator('.study-block.completed')).toHaveCount(1);
  await page.screenshot({ path: '/tmp/smart-tutor-planner.png', fullPage: true });
  await navigate('Add study block');
  await page.getByLabel('Block title', { exact: true }).fill('A quiet reading moment');
  await page.getByLabel('Study time (IST)', { exact: true }).fill('14:00');
  await navigate('Schedule block');
  await expect(page.getByRole('heading', { name: 'A quiet reading moment', exact: true })).toBeVisible();
  await navigate('Add study block');
  await page.getByLabel('Block title', { exact: true }).fill('An overlapping moment');
  await page.getByLabel('Study time (IST)', { exact: true }).fill('14:00');
  await navigate('Schedule block');
  await expect(page.getByText(/This time overlaps a study block/)).toBeVisible();
  await navigate('Cancel');

  await navigate('Language lab');
  await expect(page.locator('.language-card')).toHaveCount(8);
  await page.screenshot({ path: '/tmp/smart-tutor-languages.png', fullPage: true });
  for (const language of ['English', 'Hindi', 'Tamil', 'Malayalam', 'French', 'Spanish', 'Japanese', 'Mandarin Chinese']) {
    await page.locator('.language-card').filter({ has: page.getByRole('heading', { name: language, exact: true }) }).click();
    await expect(page.locator('.native-passage')).toBeVisible();
    const questions = page.locator('.reading-question');
    await questions.nth(0).getByRole('radio').nth(0).check();
    await questions.nth(1).getByRole('radio').nth(1).check();
    await navigate('Check reading');
    await expect(page.getByText('Last result: 2/2', { exact: true })).toBeVisible();
    await navigate('Write');
    await page.getByLabel(`Your ${language} writing`, { exact: true }).fill(language === 'Tamil' ? 'வணக்கம். என் பெயர் மீனா.' : `My first ${language} introduction.`);
    await navigate('Save writing practice');
    await expect(page.getByText('Your language practice is saved.', { exact: true })).toBeVisible();
    await navigate('Communicate');
    await page.getByLabel('What did you practise?', { exact: true }).fill('I said hello and introduced myself to my classmate.');
    await navigate('Save communication practice');
    await expect(page.getByText('3/3 saved', { exact: true })).toBeVisible();
    await navigate('Word cards');
    await page.getByRole('button', { name: 'Reveal meaning' }).first().click();
    await expect(page.locator('.word-meaning')).toBeVisible();
    await navigate('All languages');
  }

  await navigate('Skills & research');
  await navigate('Research');
  await navigate('Start research');
  await page.getByLabel('Activity title', { exact: true }).fill('How plants use sunlight');
  await page.getByLabel('Research question', { exact: true }).fill('How do plants turn sunlight into food?');
  await expect(page.getByRole('link', { name: 'Search Google Scholar' })).toHaveAttribute('href', /How%20do%20plants/);
  await page.getByLabel('Research notes & evidence', { exact: true }).fill('Plants use chlorophyll to absorb light. Photosynthesis converts light energy into chemical energy.');
  await navigate('Add a source');
  await page.getByLabel('Source title', { exact: true }).fill('Photosynthesis overview');
  await page.getByLabel('Source URL (HTTPS)', { exact: true }).fill('https://en.wikipedia.org/wiki/Photosynthesis');
  await page.getByLabel('What does this source support?', { exact: true }).fill('The role of light in making food.');
  await page.getByLabel('I checked who published each source', { exact: true }).check();
  await page.getByLabel('Conclusion: what does the evidence tell you?', { exact: true }).fill('Light provides the energy for plants to make food. I want to compare a second source next.');
  await navigate('Save activity draft');
  await page.locator('.entry-card').filter({ hasText: 'How plants use sunlight' }).click();
  await expect(page.getByLabel('Source URL (HTTPS)', { exact: true })).toHaveValue('https://en.wikipedia.org/wiki/Photosynthesis');
  await navigate('Complete activity');
  await expect(page.locator('.entry-card .work-status')).toHaveText('completed');
  await page.screenshot({ path: '/tmp/smart-tutor-research.png', fullPage: true });
  await switchProfile('Neha Kapoor');
  await navigate('Skills & research'); await navigate('Research');
  await page.locator('.entry-card').filter({ hasText: 'How plants use sunlight' }).click();
  await page.getByLabel('Activity feedback', { exact: true }).fill('Good first source. Compare a science textbook next.');
  await navigate('Save activity feedback');
  await expect(page.locator('.workspace-feedback')).toContainText('science textbook');
  await switchProfile('Arjun Mehta');
  await navigate('Skills & research'); await navigate('Research');
  await expect(page.locator('.entry-card')).toHaveCount(0);
  await switchProfile('Aanya Sharma');
  await navigate('My progress');
  await expect(page.locator('.portfolio-stat').nth(0).locator('strong')).toHaveText('1');
  await expect(page.locator('.portfolio-stat').nth(2).locator('strong')).toHaveText('8');

  await page.setViewportSize({ width: 390, height: 844 });
  for (const section of ['My homework', 'Study planner', 'Language lab', 'Skills & research', 'My progress']) {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await navigate(section);
    await expect.poll(async () => { const b = await page.locator('.sidebar').boundingBox(); return b ? b.x + b.width : 0; }).toBeLessThanOrEqual(0);
    await noOverflow();
    if (section === 'Study planner') await page.screenshot({ path: '/tmp/smart-tutor-planner-mobile.png', fullPage: true });
    if (section === 'Language lab') {
      await page.locator('.language-card').filter({ hasText: 'Mandarin Chinese' }).click(); await noOverflow();
      await navigate('Communicate'); await noOverflow();
    }
  }
  expect(errors).toEqual([]);
  console.log('PASS: assignment draft/submission/tutor review, linked lesson homework, planner generation/completion/conflicts, all eight language reading/writing/communication activities, research persistence and tutor feedback, student isolation, portfolio progress, and mobile layouts.');
} catch (error) {
  await page.screenshot({ path: '/tmp/smart-tutor-workspace-failure.png', fullPage: true }); throw error;
} finally { await browser.close(); server.closeAllConnections(); await new Promise((r) => server.close(r)); app.locals.store.db.close(); }
