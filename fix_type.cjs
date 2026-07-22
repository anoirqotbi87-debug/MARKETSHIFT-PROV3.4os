const fs = require('fs');
let header = fs.readFileSync('src/components/Header.tsx', 'utf8');
header = header.replace('setThemeMode(themes[nextIndex]);', 'setThemeMode(themes[nextIndex] as ThemeMode);');
fs.writeFileSync('src/components/Header.tsx', header);
