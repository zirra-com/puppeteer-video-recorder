const { exec } = require('child_process');
const { promisify } = require('util');
const { join } = require('path');
const PuppeteerMassScreenshots = require('puppeteer-mass-screenshots');
const { FsHandler } = require('./handlers');

const SIZE = '1080:1920';

/**
 * Gets the default `ffmpeg` command
 * @param {*} frameRate - frameRate for the video generation
 * @param {*} imagesFilename - images list file name
 * @param {*} videoFilename - resulting video file name
 * @returns - the string representation of the `ffmpeg` command with all parameters
 */
const getFFMpegCommand = (imagesFilename, videoFilename, frameRate) =>
  [
    // it's important to pass `-r` option twice to set the frame rate of the input and output stream
    'ffmpeg',
    '-f concat',
    '-safe 0',
    `-r ${frameRate}`,
    `-i ${imagesFilename}`,
    `-r ${frameRate}`,
    '-pix_fmt yuv420p',
    `-vf scale='${SIZE}'`,
    videoFilename,
  ].join(' ');

/**
 * Gets the frame rate for the video (number_of_screenshots / record_time_in_s) rounded to decimals
 * @param {*} filesNumber
 * @param {*} recordTimeMs
 * @returns - the frequency of the screenshot generation (fps)
 */
const getFrameRate = (filesNumber, recordTimeMs) => Math.round((filesNumber / recordTimeMs) * 1000 * 10) / 10;

/**
 * Splits the array of image file names by the steps
 * @param {string[]} files - image filenames list
 * @param {number[]} durations - step durations list
 * @returns Array of steps with a list of files for each step (string[][])
 */
const getStepData = (files, totalVideoTime, durations) => {
  let lastIndex = 0;
  const data = [];
  let totalDuration = 0;
  let duration = 0;
  for (let i = 0; i < durations.length; i++) {
    let images;
    if (i < durations.length - 1) {
      const newIndex = lastIndex + Math.round((files.length * durations[i]) / totalVideoTime);
      images = files.slice(lastIndex, newIndex);
      lastIndex = newIndex;
      duration = durations[i];
      totalDuration += duration;
    } else {
      // to overcome the rounding errors of the previous iterations
      // put all the remaining items into the last step
      images = files.slice(lastIndex);
      duration = totalVideoTime - totalDuration;
    }
    data.push({
      images, // скриншоты
      // totalVideoTime may be longer than the sum of durations
      // all extra time goes to the last step
      duration,
      frameRate: getFrameRate(images.length, duration),
      step: i,
    });
  }
  return data;
};

const duplicateGetStepData = (file, duration, step) => ({
    images: file, // скриншоты
    // totalVideoTime may be longer than the sum of durations
    // all extra time goes to the last step
    duration,
    frameRate: Math.round((file.length / duration) * 1000 * 10) / 10,
    step
  });


class PuppeteerVideoRecorder {
  /**
   *
   * @param {*} key - unique identifier to separate the stored images for each tested page
   */
  constructor() {
    this.screenshots = new PuppeteerMassScreenshots();
    this.fsHandler = new FsHandler();
    this.startTime = 0;
    this.videoTime = 0;
  }

  async init(page, outputFolder, imagesFolder, key) {
    this.page = page;
    this.key = key;
    this.outputFolder = join(outputFolder, key);
    await this.fsHandler.init(this.outputFolder, join(imagesFolder, key));
    await this.screenshots.init(page, this.fsHandler.imagesPath, {
      // overwrite the default command that write message to the console
      afterWritingImageFile: () => {},
    });
  }

  /**
   * Start the process of making screenshots
   * @param {*} options - options for the 'puppeteer-mass-screenshots' library
   * (https://github.com/shaynet10/puppeteer-mass-screenshots/blob/HEAD/StartOptions.md)
   */
  startScreenshots(options = {}) {
    this.startTime = performance.now();
    return this.screenshots.start(options);
  }

  /**
   * Stops the process of making screenshots
   */
  async stopScreenshots() {
    await this.screenshots.stop();
    this.videoTime = performance.now() - this.startTime;
  }

  /**
   * Creates videos out of the screenshots split by the given number of steps with provided durations
   * @param {number[]} durations - array with the story screens with their durations in ms
   * @returns
   */
  async createVideos(durations) {
    const files = await this.fsHandler.getFiles();
    console.log('Total files created: ', files.length);
    console.log('Total video length: ', this.videoTime);
    const date = new Date();

    const steps = getStepData(files, this.videoTime, durations?.length ? durations : [this.videoTime]);
    return Promise.all(steps.map((step) => this.createSingleVideo(step, date)));
  }

  async createStepVideo (duration, step) {
    const files = await this.fsHandler.getFiles();
    console.log('Total files created: ', files.length);
    console.log('Total video length: ', duration);
    console.log(await this.createSingleVideo(duplicateGetStepData(files, duration), new Date()))
    return this.createSingleVideo(duplicateGetStepData(files, duration, step), new Date())
  }

  async createSingleVideo(stepData, date) {
    console.log(`[Step # ${stepData.step + 1}] Files created: `, stepData.images.length);
    console.log(`[Step # ${stepData.step + 1}] Video length: `, stepData.duration);
    console.log(`[Step # ${stepData.step + 1}] Frame rate: `, stepData.frameRate);
    const imagesFilename = await this.fsHandler.createImagesFile(stepData.images, stepData.step);
    const videoFilename = this.fsHandler.getVideoFileName(date, stepData.step);
    const command = getFFMpegCommand(imagesFilename, videoFilename, stepData.frameRate);
    console.log('ffmpeg command', command);
    await promisify(exec)(command);
    return videoFilename;
  }
}

module.exports = PuppeteerVideoRecorder;
