const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
if (!app.includes('ReconnectionToast')) {
  app = app.replace(
    /import \{ useMT5Connection \} from '.\/hooks\/useMT5Connection';/,
    "import { useMT5Connection } from './hooks/useMT5Connection';\nimport { ReconnectionToast } from './components/ReconnectionToast';"
  );
  
  // Add component
  app = app.replace(
    /<\/main>/,
    "  <ReconnectionToast reconnectionState={accountState.reconnectionState} />\n      </main>"
  );
  
  fs.writeFileSync('src/App.tsx', app);
  console.log('App patched');
}
