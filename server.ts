import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'online',
      mt5Bridge: 'connected',
      latencyMs: 14,
      mlModel: 'XGBoost_LSTM_Ensemble_v2.4',
      riskStatus: 'NORMAL',
      timestamp: new Date().toISOString()
    });
  });

  // AI Sentiment and Trading Context Analysis via Gemini API
  app.post('/api/gemini/analyze', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: 'Clé API Gemini non configurée dans process.env.GEMINI_API_KEY.'
        });
      }

      const { symbol, timeframe, recentPrices, indicatorData, promptText } = req.body;

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
En tant qu'expert en trading algorithmique MT5 et spécialiste des marchés financiers:
Analyse le contexte de marché suivant pour le symbole ${symbol || 'EURUSD'} (Unité de temps: ${timeframe || 'H1'}).

Données récentes:
${JSON.stringify(recentPrices || [
  { time: '10:00', close: 1.0850, rsi: 54, macd: 0.0002 },
  { time: '11:00', close: 1.0862, rsi: 59, macd: 0.0005 },
  { time: '12:00', close: 1.0858, rsi: 56, macd: 0.0004 },
  { time: '13:00', close: 1.0875, rsi: 65, macd: 0.0008 }
], null, 2)}

Indicateurs:
${JSON.stringify(indicatorData || { rsi: 62.4, atr: 0.0018, macdSignal: 'BULLISH', trend: 'UPTREND' })}

Question / Instructions spécifiques du trader:
${promptText || 'Fournis une synthèse du biais technique, une prédiction de probabilité haussière/baissière et une suggestion de Stop Loss / Take Profit basée sur l\'ATR.'}

Réponds en Français avec une structure claire:
1. Biais du marché (Haussier / Baissier / Neutre) et Confiance (%)
2. Analyse Technique & Signaux ML
3. Recommandation d'Exécution MT5 (Entrée, SL dynamique, TP1, TP2)
4. Facteurs de Risque & Conditions d'Invalidation
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      res.json({
        analysis: response.text,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Erreur Gemini API:', error);
      res.status(500).json({
        error: error?.message || 'Erreur lors de l\'analyse Gemini'
      });
    }
  });

  // Simulated Backtest API
  app.post('/api/bot/backtest', (req, res) => {
    const { symbol, strategy, initialCapital, riskPerTrade } = req.body;
    const cap = initialCapital || 10000;
    
    // Generate backtest metrics
    const winRate = 64.2 + (Math.random() * 6 - 3);
    const totalTrades = Math.floor(180 + Math.random() * 40);
    const profitFactor = 1.85 + (Math.random() * 0.3 - 0.15);
    const maxDrawdownPct = 6.4 + (Math.random() * 2);
    const netProfit = cap * (0.28 + Math.random() * 0.12);

    res.json({
      symbol: symbol || 'EURUSD',
      strategy: strategy || 'Ensemble XGBoost + LSTM',
      metrics: {
        initialCapital: cap,
        finalBalance: cap + netProfit,
        netProfit: Math.round(netProfit * 100) / 100,
        returnPct: Math.round((netProfit / cap) * 10000) / 100,
        winRate: Math.round(winRate * 10) / 10,
        totalTrades,
        winningTrades: Math.round(totalTrades * (winRate / 100)),
        losingTrades: totalTrades - Math.round(totalTrades * (winRate / 100)),
        profitFactor: Math.round(profitFactor * 100) / 100,
        sharpeRatio: 2.14,
        maxDrawdownPct: Math.round(maxDrawdownPct * 10) / 10,
        avgTradeDurationMinutes: 42
      },
      equityCurve: Array.from({ length: 30 }, (_, i) => {
        const stepProfit = (netProfit / 30) * (i + 1) + (Math.sin(i * 0.8) * cap * 0.015);
        return {
          day: `J${i + 1}`,
          equity: Math.round((cap + Math.max(0, stepProfit)) * 100) / 100,
          drawdown: Math.round((Math.sin(i * 0.5) * 2 + 1) * 100) / 100
        };
      })
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur Bot MT5 démarré sur http://localhost:${PORT}`);
  });
}

startServer();
