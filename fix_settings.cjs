const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');
code = code.replace(/est > 500ms/, "est &gt; 500ms");
fs.writeFileSync('src/components/SettingsModal.tsx', code);
