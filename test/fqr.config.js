const { lock, publish } = require("../dist/index");
const { cmd } = require("faqtor");

const distFolder = "../dist";
const lockFile = "./dist-lock.json";

const makeLockFile = lock(distFolder, lockFile);
const runPublish = publish(distFolder, lockFile, true);

module.exports = {
    lock: makeLockFile,
    pub: runPublish,
    clean: cmd(`rimraf ${lockFile}`)
}