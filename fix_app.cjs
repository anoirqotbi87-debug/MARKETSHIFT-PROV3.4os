const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

// In <Header ...
app = app.replace(
  /riskConfig=\{riskConfig\}/,
  "riskConfig={riskConfig}\n            setRiskConfig={setRiskConfig}"
);
fs.writeFileSync('src/App.tsx', app);
