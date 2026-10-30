/** Local Storybook proof: rendered text geometry, seek parity, reduced motion and playback.
 * Run after `npm run storybook`. Screenshots and JSON go to artifacts/nature-cinematic.
 * This is geometric/browser evidence, not human cinematic acceptance.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const cave = process.argv.includes('--cave');
const recipe = cave ? 'cave-identity-reveal' : 'nature-world-identity-reveal';
const specKey = cave ? 'caveSpec' : 'natureSpec';
const directory = cave ? 'artifacts/cave-cinematic' : 'artifacts/nature-cinematic';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(`http://localhost:6006/iframe.html?id=video-production-scene-templates--${recipe}&viewMode=story`);
  const slider = page.locator('input[type=range]');
  await slider.waitFor();
  await page.evaluate(() => document.fonts.ready);
  const seek = async frame => { await slider.fill(String(frame)); await page.waitForTimeout(25); };
  const geometry = () => page.evaluate(() => {
    const stage = document.querySelector('[data-km-nature-renderer]').getBoundingClientRect();
    const elements = [...document.querySelectorAll('[data-km-identity-mark], [data-km-identity-name], [data-km-identity-tagline]')];
    const rects = elements.map(element => ({ element, rect: element.getBoundingClientRect() }));
    const failures = rects.filter(({ element, rect }) => Number(getComputedStyle(element).opacity) > .01 &&
      (rect.left < stage.left || rect.right > stage.right || rect.top < stage.top || rect.bottom > stage.bottom || element.scrollWidth > element.clientWidth + 1));
    const overlaps = rects.slice(1).filter(({ rect }, i) => rect.top < rects[i].rect.bottom);
    const mark = rects[0], face = document.querySelector('[data-km-logo-face]')?.getBoundingClientRect();
    if (face && Number(getComputedStyle(mark.element).opacity) > .01 &&
      (face.width > mark.rect.width * 1.2 || face.height > mark.rect.height * 1.2 || face.bottom > rects[1].rect.top)) overlaps.push({ rect: face });
    return { failures: failures.length, overlaps: overlaps.length,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      titleFont: getComputedStyle(document.querySelector('[data-km-identity-name]')).fontFamily };
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const portrait of [false, true]) {
      const button = page.getByRole('button', { name: portrait ? '16:9' : '9:16', exact: true });
      if (await button.count()) await button.click();
      for (let frame = 126; frame <= 330; frame += 6) {
        await seek(frame); const result = await geometry(); checks.push({ width, portrait, frame, ...result });
        if (result.failures || result.overlaps || result.horizontalOverflow) throw Error(`Text geometry failed: ${JSON.stringify(checks.at(-1))}`);
      }
      await seek(335);
      await page.screenshot({ path: `${directory}/review-${width}-${portrait ? 'portrait' : 'landscape'}.png`, fullPage: true });
    }
  }
  // Exercise the real loaded font with long Latin and CJK copy, in both authored aspects.
  const source = await page.evaluate(recipe => performance.getEntriesByType('resource').map(entry => entry.name)
    .find(name => name.includes(`/src/video/scene-template-previews/${recipe}.tsx`)), recipe);
  if (!source) throw Error('Cannot locate the loaded demo module for copy stress checks.');
  const originalCopy = await page.evaluate(async ({source, specKey}) => { const spec = (await import(source))[specKey]; return {name: spec.content.name, tagline: spec.content.tagline}; }, {source, specKey});
  for (const portrait of [false, true]) {
    const button = page.getByRole('button', { name: portrait ? '16:9' : '9:16', exact: true });
    if (await button.count()) await button.click();
    for (const [name, tagline] of [['Alderwick Field Observations', 'A quieter way of seeing the natural world'], ['森の奥で、生まれる。', '自然とともに、ゆっくりと。']]) {
      await page.evaluate(async ({ source, specKey, name, tagline }) => {
        const spec = (await import(source))[specKey];
        Object.assign(spec.content, { name, tagline });
      }, { source, specKey, name, tagline });
      await seek(334); await seek(335);
      const result = await geometry(); checks.push({ width: 390, portrait, copy: name, ...result });
      if (result.failures || result.overlaps || result.horizontalOverflow) throw Error(`Copy stress failed: ${JSON.stringify(checks.at(-1))}`);
      await page.screenshot({ path: `${directory}/stress-${portrait ? 'portrait' : 'landscape'}-${name.startsWith('Alderwick') ? 'latin' : 'cjk'}.png`, fullPage: true });
    }
  }
  await page.evaluate(async ({source, specKey, originalCopy}) => { Object.assign((await import(source))[specKey].content, originalCopy); }, {source, specKey, originalCopy});
  await page.getByLabel('Reduced motion', { exact: true }).check();
  const reduced = await page.locator('[data-km-identity-name]').evaluate(element => getComputedStyle(element).opacity);
  if (reduced !== '1') throw Error('Reduced motion did not show the completed title.');
  await page.getByLabel('Reduced motion', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForTimeout(14200);
  if ((await slider.inputValue()) !== '335') throw Error('Normal-speed playback did not reach the final hold.');
  const soundChecks = [];
  if (!cave) {
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.waitForTimeout(1200);
    const playing = await page.locator('audio').evaluate(audio => ({ paused: audio.paused, time: audio.currentTime, ready: audio.readyState }));
    if (playing.paused || playing.time < .6 || playing.ready < 2) throw Error('Ambience did not play with the preview.');
    soundChecks.push({ playing });
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await seek(168);
    const paused = await page.locator('audio').evaluate(audio => ({ paused: audio.paused, time: audio.currentTime }));
    if (!paused.paused || Math.abs(paused.time - 7) > .1) throw Error('Ambience did not pause/seek with the preview.');
    soundChecks.push({ paused });
    await page.getByRole('button', { name: 'Sound on', exact: true }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.waitForTimeout(300);
    if (!(await page.locator('audio').evaluate(audio => audio.paused))) throw Error('Sound off did not stop ambience.');
    if (await page.getByRole('alert').count()) throw Error('Audio playback reported an error.');
    soundChecks.push({ muted: true });
  }
  if (errors.length) throw Error(errors.join('\n'));
  await writeFile(`${directory}/browser-checks.json`, JSON.stringify({ checks, errors, reduced, soundChecks, playback: '14-second run reached frame 335' }, null, 2));
  console.log(`${checks.length} rendered-bounds samples passed; reduced motion and full playback passed; no page errors.`);
} finally { await browser.close(); }
