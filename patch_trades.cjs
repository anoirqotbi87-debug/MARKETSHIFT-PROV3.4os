const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const trades = `
    {
      ticket: 994180,
      symbol: 'EURUSD',
      type: 'BUY',
      lots: 0.25,
      openPrice: 1.0820,
      closePrice: 1.0865,
      stopLoss: 1.0790,
      takeProfit: 1.0865,
      pnl: 112.50,
      pnlPct: 1.04,
      openTime: '2026-07-21 08:15:00',
      closeTime: '2026-07-21 09:42:15',
      magicNumber: 88492,
      mlConfidence: 81.0,
      closeReason: 'TP_HIT'
    },
    {
      ticket: 994181,
      symbol: 'GBPUSD',
      type: 'SELL',
      lots: 0.10,
      openPrice: 1.2500,
      closePrice: 1.2480,
      stopLoss: 1.2550,
      takeProfit: 1.2400,
      pnl: 20.00,
      pnlPct: 0.16,
      openTime: '2026-07-21 10:00:00',
      closeTime: '2026-07-21 10:30:00',
      magicNumber: 88492,
      mlConfidence: 75.0,
      closeReason: 'MANUAL'
    },
    {
      ticket: 994182,
      symbol: 'USDJPY',
      type: 'BUY',
      lots: 0.50,
      openPrice: 150.00,
      closePrice: 149.50,
      stopLoss: 149.50,
      takeProfit: 151.00,
      pnl: -250.00,
      pnlPct: -1.66,
      openTime: '2026-07-21 11:00:00',
      closeTime: '2026-07-21 11:45:00',
      magicNumber: 88492,
      mlConfidence: 60.0,
      closeReason: 'SL_HIT'
    },
    {
      ticket: 994183,
      symbol: 'XAUUSD',
      type: 'BUY',
      lots: 0.05,
      openPrice: 2000.00,
      closePrice: 2010.00,
      stopLoss: 1990.00,
      takeProfit: 2020.00,
      pnl: 50.00,
      pnlPct: 0.50,
      openTime: '2026-07-21 12:00:00',
      closeTime: '2026-07-21 14:00:00',
      magicNumber: 88492,
      mlConfidence: 88.0,
      closeReason: 'MANUAL'
    }
`;

code = code.replace(/const \[closedTrades, setClosedTrades\] = useState<ClosedTrade\[\]>\(\[[\s\S]*?\]\);/, `const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([\n${trades}  ]);`);
fs.writeFileSync('src/App.tsx', code);
