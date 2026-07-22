const fs = require('fs');
let code = fs.readFileSync('src/components/MobileSimulatorView.tsx', 'utf8');

if (!code.includes('ClosedTradesChart')) {
  // Add import
  code = code.replace(
    /import \{ DailyProfitProgressBar \} from '.\/DailyProfitProgressBar';/,
    "import { DailyProfitProgressBar } from './DailyProfitProgressBar';\nimport { ClosedTradesChart } from './ClosedTradesChart';"
  );
  
  // Add component
  code = code.replace(
    /\{activeTab === 'dashboard' && \(/,
    "{activeTab === 'dashboard' && (\n              <div className=\"space-y-3\">\n                <ClosedTradesChart closedTrades={closedTrades} />"
  );
  
  code = code.replace(
    /onApplyNewsWeightToML=\{onApplyNewsWeightToML\}\n              \/>\n            \)\}/,
    "onApplyNewsWeightToML={onApplyNewsWeightToML}\n              />\n              </div>\n            )}"
  );
  
  fs.writeFileSync('src/components/MobileSimulatorView.tsx', code);
  console.log('Patched MobileSimulatorView');
}
