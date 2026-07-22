const fs = require('fs');
let toast = fs.readFileSync('src/components/ReconnectionToast.tsx', 'utf8');

toast = toast.replace(/style=\{\{ width: \\\`\\\$\\{100 - reconnectionState.progressPct\\}%\\\` \}\}/g, 'style={{ width: `${100 - reconnectionState.progressPct}%` }}');
fs.writeFileSync('src/components/ReconnectionToast.tsx', toast);
console.log('Fixed');
