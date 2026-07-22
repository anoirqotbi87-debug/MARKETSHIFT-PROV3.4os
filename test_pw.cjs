const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  const html = await page.content();
  console.log("HTML length:", html.length);
  if (html.includes('id="root"')) {
     const rootContent = await page.$eval('#root', el => el.innerHTML);
     console.log("ROOT HTML LENGTH:", rootContent.length);
     console.log("ROOT SNIPPET:", rootContent.substring(0, 500));
  }
  await browser.close();
})();
