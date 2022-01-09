const chokidar = require('chokidar');
const { createWorker } = require('tesseract.js');
const open = require('open');

const worker = createWorker();
const urlRegex = new RegExp("([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?");

let screenshotDirPath = `${process.env.HOME}/Desktop`
const args = process.argv.slice(2);
if (args.length > 1) {
  console.log("Too many args: only arg is an alternative screenshot directory");
  process.exit(0);
} else if (args.length == 1) {
  screenshotDirPath = args[0];
}

function ocrImage(path) {
  worker.recognize(path).then(function({ data: { text } }) {
    text = text.trim();
    if (text != null) {
      const match = text.match(urlRegex);
      if (match && match.length && typeof(match[0]) == 'string') {
        let url = match[0].trim();
        if (url.indexOf('http') != 0) {
          url = `https://${url}`;
        }
        open(url);
        console.log("found url: ", match[0]);
      }
    }
  });
}

console.log(`watching ${screenshotDirPath} for new screenshots`);

function isScreenshot(path) {
  return path.indexOf('.png') > -1 && path.toLowerCase().indexOf("screen shot") > -1;
}

async function start() {
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  console.log('initialized');

  const state = {};
  chokidar.watch(screenshotDirPath,{
    ignoreInitial: true, 
    followSymlinks: false,
  }).on('all', (event, path) => {
    console.log(event, path);
    if (isScreenshot(path)) {
      if (event == 'add') {
        state[path] = true;
      } else if (event == 'change' && state[path]) {
        delete state[path];
        ocrImage(path);
      }
    }
  });
}

start();
