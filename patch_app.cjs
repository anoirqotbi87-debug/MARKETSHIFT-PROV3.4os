const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

app = app.replace(
  /const \[mlStats\] = useState<MLModelStats>\(/, 
  "const [mlStats, setMlStats] = useState<MLModelStats>("
);

const handlerCode = `
  const handleApplyNewsWeightToML = (boostPct: number, reason: string) => {
    setMlStats(prev => {
      const currentConf = prev.currentSignal.confidence;
      const newConf = Math.min(100, Math.max(0, currentConf + boostPct * 100));
      return {
        ...prev,
        currentSignal: {
          ...prev.currentSignal,
          confidence: Math.round(newConf * 10) / 10,
          features: [
            { name: \`NLP Impact: \${reason.substring(0, 20)}...\`, impact: Math.abs(boostPct) },
            ...prev.currentSignal.features
          ].slice(0, 8)
        }
      };
    });
    
    setLogs(prev => [
      {
        id: \`log-news-\${Date.now()}\`,
        timestamp: new Date().toLocaleTimeString(),
        level: 'ML_PRED',
        module: 'ML_ENGINE',
        message: \`NLP News Weight appliqué: \${boostPct > 0 ? '+' : ''}\${(boostPct * 100).toFixed(1)}% (\${reason})\`
      },
      ...prev
    ]);
  };
`;

app = app.replace(
  /  const \{ forceReconnect, simulateDisconnect \} = useMT5Connection\(/,
  handlerCode + "\n  const { forceReconnect, simulateDisconnect } = useMT5Connection("
);

app = app.replace(
  /mlStats={mlStats}/g,
  "mlStats={mlStats}\n            onApplyNewsWeightToML={handleApplyNewsWeightToML}"
);

fs.writeFileSync('src/App.tsx', app);
