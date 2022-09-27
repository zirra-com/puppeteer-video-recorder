const { mkdir, access } = require('fs').promises;
const puppeteer = require('puppeteer');
const PuppeteerVideoRecorder = require('../index');

const verifyFolderExists = async (path) => {
  await access(path).catch(async () => mkdir(path));
};

const testGoogle = async () => {
  const VIDEOS_PATH = `${process.cwd()}/videos`;
  const IMAGES_PATH = `${process.cwd()}/videos/images`;
  const pageKey = 'testGoogle';
  await verifyFolderExists(VIDEOS_PATH);
  await verifyFolderExists(IMAGES_PATH);
  const browser = await puppeteer.launch({ headless: true });
  const page = (await browser.pages())[0];
  const recorder = new PuppeteerVideoRecorder();
  await recorder.init(page, VIDEOS_PATH, IMAGES_PATH, pageKey);
  await page.goto('https://google.com');
  await recorder.startScreenshots();
  // await page.waitForNavigation({ waitUntil: 'domcontentloaded'});
  const input = await page.$('input[name=q]');
  await input.type('puppeteer-mass-screenshots', { delay: 250 });
  await input.press('Enter');
  // await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await recorder.stopScreenshots();
  await recorder.createStepVideo(3000, 1);

  await browser.close();
};

const testPageWithDuration = async () => {
  const VIDEOS_PATH = `${process.cwd()}/videos`;
  const IMAGES_PATH = `${process.cwd()}/videos/images`;
  const pageKey = 'fourSteps';
  await verifyFolderExists(VIDEOS_PATH);
  await verifyFolderExists(IMAGES_PATH);
  const durations = 3000;
  const browser = await puppeteer.launch({ headless: true });
  const page = (await browser.pages())[0];
  const recorder = new PuppeteerVideoRecorder(pageKey);
  await recorder.init(page, VIDEOS_PATH, IMAGES_PATH, pageKey);
  await page.goto(
    'https://tocking.zirra.com/stories/c231dead-129a-40e6-8c66-05c5df9232b3?subtype=image-and-text&step=1',
  );
  // await page.waitForTimeout(100);
  await recorder.startScreenshots();
  await page.waitForTimeout(300);
  await recorder.stopScreenshots();
  await recorder.createStepVideo(durations, 1);
  await browser.close();
};

(async () => {
  await testGoogle();
  await testPageWithDuration();
})();