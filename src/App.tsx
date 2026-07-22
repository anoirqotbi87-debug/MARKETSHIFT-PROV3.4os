import React, { useState, useEffect, useCallback } from 'react';
import { ViewMode, ThemeMode, MT5AccountState, ActivePosition, ClosedTrade, MLModelStats, RiskConfig, LogEntry } from './types';
import { auth, db, isMockConfig } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { MobileSimulatorView } from './components/MobileSimulatorView';
import { ArchitectureDocView } from './components/ArchitectureDocView';
import { useMT5Connection } from './hooks/useMT5Connection';
import { ReconnectionToast } from './components/ReconnectionToast';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>('simulator');

  // Theme Mode ('cyber_dark' | 'high_contrast_pro') with localStorage persistence
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('marketshift_theme_mode');
      if (saved && ['high_contrast_pro', 'cyber_dark', 'neon_synthwave', 'arctic_light', 'monochrome_terminal'].includes(saved)) {
        return saved as ThemeMode;
      }
    } catch {
      // fallback if localStorage disabled
    }
    return 'neon_synthwave';
  });

  // Apply theme class to document root for global CSS overrides
  useEffect(() => {
    try {
      localStorage.setItem('marketshift_theme_mode', themeMode);
    } catch {
      // ignore
    }
    
    document.documentElement.classList.remove('theme-high-contrast', 'theme-neon-synthwave', 'theme-arctic-light', 'theme-monochrome-terminal');
    
    // Add current theme class
    if (themeMode === 'high_contrast_pro') {
      document.documentElement.classList.add('theme-high-contrast');
    } else if (themeMode === 'neon_synthwave') {
      document.documentElement.classList.add('theme-neon-synthwave');
    } else if (themeMode === 'arctic_light') {
      document.documentElement.classList.add('theme-arctic-light');
    } else if (themeMode === 'monochrome_terminal') {
      document.documentElement.classList.add('theme-monochrome-terminal');
    }
  }, [themeMode]);

  // MT5 Account State
  const [accountState, setAccountState] = useState<MT5AccountState>({
    accountNumber: '84920412',
    broker: 'IC Markets',
    server: 'ICMarketsSC-Demo',
    balance: 10000.00,
    equity: 10240.50,
    freeMargin: 9680.00,
    marginLevelPct: 1820.4,
    unrealizedPnL: 240.50,
    dailyPnL: 240.50,
    dailyPnLPct: 2.40,
    currency: 'USD',
    isPaperTrading: true,
    isConnected: true,
    pingMs: 14
  });

  // Active MT5 Positions
  const [positions, setPositions] = useState<ActivePosition[]>([
    {
      ticket: 994201,
      symbol: 'EURUSD',
      type: 'BUY',
      lots: 0.50,
      openPrice: 1.0850,
      currentPrice: 1.0878,
      stopLoss: 1.0820,
      takeProfit: 1.0920,
      pnl: 140.00,
      pnlPct: 1.29,
      openTime: '10:14:22',
      magicNumber: 88492,
      mlConfidence: 84.5,
      signalReason: 'RSI Bullish Divergence + XGBoost High Probability',
      tags: ['#Scalp', '#AlgoML']
    },
    {
      ticket: 994205,
      symbol: 'XAUUSD',
      type: 'BUY',
      lots: 0.10,
      openPrice: 2380.50,
      currentPrice: 2390.55,
      stopLoss: 2368.00,
      takeProfit: 2410.00,
      pnl: 100.50,
      pnlPct: 0.42,
      openTime: '11:02:10',
      magicNumber: 88492,
      mlConfidence: 79.2,
      signalReason: 'LSTM Sequence Pattern Match + Order Book Imbalance',
      tags: ['#DayTrade', '#Gold']
    }
  ]);

  // Closed MT5 Trades History
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([

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
  ]);

  // ML Model Stats
  const [mlStats, setMlStats] = useState<MLModelStats>({
    modelName: 'XGBoost_LSTM_Ensemble_v2.4',
    architecture: 'XGBoost + LSTM Ensemble',
    accuracy: 68.4,
    f1Score: 0.72,
    inferenceTimeMs: 2.4,
    lastRetrained: '2026-07-20 04:00',
    featuresCount: 38,
    currentSignal: {
      symbol: 'EURUSD',
      direction: 'BUY',
      confidence: 84.5,
      features: [
        { name: 'RSI Bullish Divergence', impact: 0.35 },
        { name: 'Order Book Imbalance', impact: 0.29 },
        { name: 'ATR Volatility Ratio', impact: 0.25 },
        { name: 'LSTM Sequence Pattern', impact: 0.22 },
        { name: 'News Sentiment NLP', impact: 0.18 },
        { name: 'MACD Histogram Momentum', impact: 0.15 },
        { name: 'Bollinger %B Compression', impact: 0.11 },
        { name: 'EMA(200) Trend Distance', impact: 0.08 }
      ]
    }
  });

  // Risk Configuration
  const [riskConfig, setRiskConfig] = useState<RiskConfig>({
    maxRiskPerTradePct: 1.0,
    maxDailyLossPct: 3.0,
    maxTotalDrawdownPct: 8.0,
    maxOpenPositions: 3,
    atrMultiplierSL: 1.8,
    atrMultiplierTP: 3.2,
    useTrailingStop: true,
    trailingStopAtr: 1.5,
    useKellyCriterion: true,
    circuitBreakerActive: false,
    enableNewsSentimentFilter: true,
    minNewsSentimentScore: -0.60
  });

  // Log Entries Stream
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: new Date().toLocaleTimeString(),
      level: 'INFO',
      module: 'SYSTEM',
      message: 'Bot MT5 Android ML initialisé. Connexion au Bridge ZeroMQ réussie (14ms).'
    },
    {
      id: '2',
      timestamp: new Date().toLocaleTimeString(),
      level: 'ML_PRED',
      module: 'ML_ENGINE',
      message: 'Inférence ONNX effectuée pour EURUSD : Signal BUY (Confiance: 84.5%).'
    },
    {
      id: '3',
      timestamp: new Date().toLocaleTimeString(),
      level: 'MT5_EXEC',
      module: 'MT5_BRIDGE',
      message: 'Ordre #994201 BUY 0.50 EURUSD exécuté. SL: 1.0820, TP: 1.0920.'
    }
  ]);

  // Callback to append logs from connection hook
  const handleAddConnectionLog = useCallback((message: string, level: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' = 'INFO') => {
    setLogs(prev => [
      {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        level,
        module: 'MT5_BRIDGE',
        message
      },
      ...prev
    ]);
  }, []);

  // Hook for MT5 automatic reconnection with exponential backoff

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
            { name: `NLP Impact: ${reason.substring(0, 20)}...`, impact: Math.abs(boostPct) },
            ...prev.currentSignal.features
          ].slice(0, 8)
        }
      };
    });
    
    setLogs(prev => [
      {
        id: `log-news-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: 'ML_PRED',
        module: 'ML_ENGINE',
        message: `NLP News Weight appliqué: ${boostPct > 0 ? '+' : ''}${(boostPct * 100).toFixed(1)}% (${reason})`
      },
      ...prev
    ]);
  };

  const { forceReconnect, simulateDisconnect } = useMT5Connection(
    accountState,
    setAccountState,
    riskConfig,
    {
      baseDelayMs: 2000,
      maxDelayMs: 30000,
      maxAttempts: 5,
      onLogAdd: handleAddConnectionLog
    }
  );

  // Handle Triggering Circuit Breaker
  const handleTriggerCircuitBreaker = () => {
    setRiskConfig(prev => ({
      ...prev,
      circuitBreakerActive: true,
      circuitBreakerReason: 'Arrêt d\'urgence déclenché manuellement depuis l\'application Android.',
      circuitBreakerTriggeredAt: new Date().toLocaleTimeString()
    }));

    setLogs(prev => [
      {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        level: 'CIRCUIT_BREAKER',
        module: 'RISK_ENGINE',
        message: 'COUPE-CIRCUIT D\'URGENCE DÉCLENCHÉ: Nouveau trade verrouillé.'
      },
      ...prev
    ]);
  };

  // Handle Resetting Circuit Breaker
  const handleResetCircuitBreaker = () => {
    setRiskConfig(prev => ({
      ...prev,
      circuitBreakerActive: false,
      circuitBreakerReason: undefined,
      circuitBreakerTriggeredAt: undefined
    }));

    setLogs(prev => [
      {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        level: 'SUCCESS',
        module: 'RISK_ENGINE',
        message: 'Coupe-circuit réarmé. Le bot reprend l\'analyse normale.'
      },
      ...prev
    ]);
  };


  useEffect(() => {
    if (isMockConfig || !auth) {
      setUser({ uid: 'mock-user-123', email: 'demo@example.com' } as User);
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && db) {
        // Load data from Firestore
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.riskConfig) setRiskConfig(data.riskConfig);
        }
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Save risk config to firestore when it changes (debounce could be added, but simplistic for now)
  useEffect(() => {
    if (isMockConfig || !db) return;
    
    if (user && !authLoading) {
      setDoc(doc(db, 'users', user.uid), { riskConfig }, { merge: true }).catch(console.error);
    }
  }, [riskConfig, user, authLoading]);

  // Periodic heartbeat simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setAccountState(prev => {
        const jitter = (Math.random() * 2 - 1);
        return {
          ...prev,
          pingMs: Math.max(8, Math.floor(14 + jitter))
        };
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  if (authLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* App Header */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        accountState={accountState}
        setAccountState={setAccountState}
        riskConfig={riskConfig}
            setRiskConfig={setRiskConfig}
        onTriggerCircuitBreaker={handleTriggerCircuitBreaker}
        onResetCircuitBreaker={handleResetCircuitBreaker}
        onForceReconnect={forceReconnect}
        onSimulateDisconnect={simulateDisconnect}
      />

      {/* Main View Area */}
      <main className="pb-12">
        {viewMode === 'simulator' ? (
          <MobileSimulatorView
            accountState={accountState}
            setAccountState={setAccountState}
            positions={positions}
            setPositions={setPositions}
            closedTrades={closedTrades}
            setClosedTrades={setClosedTrades}
            mlStats={mlStats}
            onApplyNewsWeightToML={handleApplyNewsWeightToML}
            riskConfig={riskConfig}
            setRiskConfig={setRiskConfig}
            logs={logs}
            setLogs={setLogs}
            onTriggerCircuitBreaker={handleTriggerCircuitBreaker}
            onResetCircuitBreaker={handleResetCircuitBreaker}
          />
        ) : (
          <ArchitectureDocView />
        )}
        <ReconnectionToast reconnectionState={accountState.reconnectionState} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>BotTrading MT5 Android ML — Architecture & Engine Hub</div>
          <div className="text-[11px]">Développé avec React 19, Tailwind CSS, Express, ZeroMQ & Gemini AI</div>
        </div>
      </footer>

    </div>
  );
}
