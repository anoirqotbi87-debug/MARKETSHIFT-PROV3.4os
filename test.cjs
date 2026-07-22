const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
const effectCount = (app.match(/useEffect\(/g) || []).length;
console.log('useEffect count: ' + effectCount);
