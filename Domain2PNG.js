const puppeteer = require("puppeteer");
const fs = require("fs");
const domains = require("./domains.json");
const history = require("./history.json");
const crypto = require("crypto");

/*
 * @param  {File (txt,png etc...)} file
 * @returns Hash of a file or error
 */
async function fileHash(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha1");
    const stream = fs.createReadStream(file);
    stream.on("error", (err) => reject(err));
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

/*
 * Write an array to a json file
 */
async function arrayToJSON(hashArray, file) {
  let finalRes = JSON.stringify(hashArray);
  fs.writeFile(file, finalRes, "utf8", function (err) {
    if (err) {
      console.log("ERROR > " + err);
    } else {
      console.log("HISTORY UPDATED");
    }
  });
}

/*
 * Read history file and convert it to JSON array
 * Init : Need to be like that : [{}]
 * @returns JSON array of history
 */
async function readHistory() {
  let historyArray = [];
  for (const { domain, hash } of history) {
    historyArray.push({
      domain: domain,
      hash: hash,
    });
  }
  return historyArray;
}
/**
 * @param  {Array} historyArray
 * @param  {string} newHash
 * Check if hash is in the history array
 */
async function domainUpdatedOrNot(historyArray, newHash) {
  if (historyArray.some((item) => item.hash === newHash)) {
    return "/notUpdated/";
  } else {
    return "/updated/";
  }
}

/*
 * Copy file from src to dst
 * @param {string} src  The path to the thing to copy.
 * @param {string} dst The path to the new copy.
 */
async function moveToAnotherFolder(src, dst) {
  fs.createReadStream(src).pipe(fs.createWriteStream(dst));
}

/*
 * Temp directory to save PNG generated
 * The aim is to move thes PNG to the correct folder
 *
 */
const tempDir = "/temp/";
fs.mkdirSync(tempDir, { recursive: true });

/**
 * Array of domain + json
 * @example {[{domain:"example.com",hash:"sha256 hash"}]}
 */
let hashPNG = [];

/**
 * Generate current date with specific format
 */
const today = new Date();
const options = { year: "numeric", month: "numeric", day: "numeric" };

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });
  let dirHistory = "";
  for (const { domain } of domains) {
    let filename = tempDir + domain + ".png";
    console.log("Running screenshot for " + domain);
    await page.goto("https://" + domain);
    await page.screenshot({ path: filename });
    let currentHash = await fileHash(filename);
    console.log("Checking history for " + filename);
    if (Object.keys(history.length) == 1) {
      dirHistory = "/notUpdated/";
    } else {
      let currentHistory = await readHistory();
      dirHistory = await domainUpdatedOrNot(currentHistory, currentHash);
    }

    /**
     * Use the date to add file in the right folder
     * Local date string to FR version : yyyy/mm/dd
     * Create the folder if not exists
     */
    const newDirecotryName =
      "res/" + today.toLocaleDateString("fr-fr", options) + dirHistory;
    fs.mkdirSync(newDirecotryName, { recursive: true });
    const newFileName = newDirecotryName + domain + ".png";
    await moveToAnotherFolder(filename, newFileName);
    console.log("Saved in " + newFileName);
    hashPNG.push({
      domain: domain,
      hash: currentHash,
    });
  }

  await browser.close();
  await arrayToJSON(hashPNG, "history.json");
  console.log("DONE");
})();
