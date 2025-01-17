const { writeFile, readdir, access, mkdir } = require('fs').promises;
const { join } = require('path');

const verifyFolderExists = async (path) => {
  await access(path).catch(async () => mkdir(path));
};

class FsHandler {
  async init(outputFolder, imagesFolder) {
    this.outputFolder = outputFolder;
    this.imagesPath = imagesFolder;
    await verifyFolderExists(outputFolder);
    await verifyFolderExists(imagesFolder);
  }

  getFiles() {
    return readdir(this.imagesPath);
  }

  /**
   * Creates file 'images-N.txt' containing all the images for the step
   * @param {*} images
   * @param {*} stepIndex
   */
  async createImagesFile(images, stepIndex) {
    const fileName = join(this.imagesPath, `images-${stepIndex}.txt`);
    await writeFile(fileName, images.map((i) => `file '${join(this.imagesPath, i)}'`).join('\n'));
    return fileName;
  }

  getVideoFileName(date, stepIndex) {
    return join(this.outputFolder, `${date.getTime()}-step-${stepIndex}.mp4`);
  }
}

module.exports = FsHandler;
