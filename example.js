const puppeteer = require("puppeteer");
const fs = require("fs");
const domains = require("./domains.json");
console.log("START");

const today = new Date();
const options = { year: "numeric", month: "numeric", day: "numeric" };
console.log(today.toLocaleDateString("fr-fr", options));

const direcotryName = "res/" + today.toLocaleDateString("fr-fr", options) + "/";
fs.mkdirSync(direcotryName, { recursive: true });

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });
  for (const { domain } of domains) {
    let filename = direcotryName + domain + ".png";
    console.log("Running screenshot for " + domain);
    await page.goto("https://" + domain);
    await page.screenshot({ path: filename });
    console.log("Screenshot saved in " + filename);
  }
  await browser.close();
  console.log("DONE");
})();
