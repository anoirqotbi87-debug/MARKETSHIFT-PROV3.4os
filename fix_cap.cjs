const fs = require('fs');
let code = fs.readFileSync('capacitor.config.ts', 'utf8');
code = code.replace(/bundledWebRuntime: false,\n  /, "");
fs.writeFileSync('capacitor.config.ts', code);
