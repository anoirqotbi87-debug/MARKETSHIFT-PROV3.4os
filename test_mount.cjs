const { JSDOM } = require('jsdom');
const fs = require('fs');

const html = fs.readFileSync('dist/index.html', 'utf8');

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  url: "http://localhost:3000"
});

dom.window.onerror = function(msg, source, lineno, colno, error) {
  console.log("JSDOM Error:", msg, error);
};
dom.window.addEventListener('unhandledrejection', event => {
  console.log("JSDOM Promise Rejection:", event.reason);
});

setTimeout(() => {
  console.log("HTML:", dom.window.document.body.innerHTML);
}, 2000);
