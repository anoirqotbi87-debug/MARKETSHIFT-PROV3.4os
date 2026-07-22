const fs = require('fs');
let header = fs.readFileSync('src/components/Header.tsx', 'utf8');

header = header.replace(/riskConfig: RiskConfig;/, "riskConfig: RiskConfig;\n  setRiskConfig?: React.Dispatch<React.SetStateAction<RiskConfig>>;");
header = header.replace(/riskConfig,\n  onTriggerCircuitBreaker/, "riskConfig,\n  setRiskConfig,\n  onTriggerCircuitBreaker");

fs.writeFileSync('src/components/Header.tsx', header);
