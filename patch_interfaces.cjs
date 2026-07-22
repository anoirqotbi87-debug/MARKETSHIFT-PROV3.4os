const fs = require('fs');

// MobileSimulatorView.tsx
let mobile = fs.readFileSync('src/components/MobileSimulatorView.tsx', 'utf8');
if (!mobile.includes('onApplyNewsWeightToML')) {
  mobile = mobile.replace(
    /onResetCircuitBreaker: \(\) => void;/g,
    "onResetCircuitBreaker: () => void;\n  onApplyNewsWeightToML?: (boostPct: number, reason: string) => void;"
  );
  mobile = mobile.replace(
    /onResetCircuitBreaker\n}\) => {/g,
    "onResetCircuitBreaker,\n  onApplyNewsWeightToML\n}) => {"
  );
  mobile = mobile.replace(
    /onResetCircuitBreaker=\{onResetCircuitBreaker\}\n              \/>\n            \)\}/g,
    "onResetCircuitBreaker={onResetCircuitBreaker}\n                onApplyNewsWeightToML={onApplyNewsWeightToML}\n              />\n            )}"
  );
  fs.writeFileSync('src/components/MobileSimulatorView.tsx', mobile);
}

// DashboardTab.tsx
let dash = fs.readFileSync('src/components/tabs/DashboardTab.tsx', 'utf8');
if (!dash.includes('onApplyNewsWeightToML')) {
  dash = dash.replace(
    /onResetCircuitBreaker\?: \(\) => void;/g,
    "onResetCircuitBreaker?: () => void;\n  onApplyNewsWeightToML?: (boostPct: number, reason: string) => void;"
  );
  dash = dash.replace(
    /onResetCircuitBreaker\n}\) => {/g,
    "onResetCircuitBreaker,\n  onApplyNewsWeightToML\n}) => {"
  );
  dash = dash.replace(
    /<MarketNews \/>/g,
    "<MarketNews onApplyNewsWeightToML={onApplyNewsWeightToML} />"
  );
  fs.writeFileSync('src/components/tabs/DashboardTab.tsx', dash);
}
