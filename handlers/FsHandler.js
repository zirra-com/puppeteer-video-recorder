const { writeFile, readdir, access, mkdir, unlink } = require('fs').promises;
const { join } = require('path');

const verifyFolderExists = async (path) => {
  await access(path).catch(async () => mkdir(path));
};

// const clearImagesInPath = async (folderPath) => {
//   console.log(`Removing files in ${folderPath}`);
//   const files = await readdir(folderPath);
//   await Promise.all(files.map((file) => unlink(join(folderPath, file))));
//   console.log(`Removed all files in ${folderPath}`);
// };

class FsHandler {
  async init(outputFolder, imagesFolder) {
    this.outputFolder = outputFolder;
    this.imagesPath = imagesFolder;
    await verifyFolderExists(outputFolder);
    await verifyFolderExists(imagesFolder);
    // await Promise.all([clearImagesInPath(this.outputFolder), clearImagesInPath(this.imagesPath)]);
  }

  getFiles() {
    return readdir(this.imagesPath); // чтение каталога
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
