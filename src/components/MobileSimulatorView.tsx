import React, { useState, useEffect } from 'react';
import { 
  ActiveTabSimulator, MT5AccountState, ActivePosition, ClosedTrade, MLModelStats, RiskConfig, LogEntry, PriceAlert 
} from '../types';
import { DashboardTab } from './tabs/DashboardTab';
import { MLEngineTab } from './tabs/MLEngineTab';
import { MT5BridgeTab } from './tabs/MT5BridgeTab';
import { RiskTab } from './tabs/RiskTab';
import { BacktesterTab } from './tabs/BacktesterTab';
import { LogsTab } from './tabs/LogsTab';
import { AIAssistantTab } from './tabs/AIAssistantTab';
import { ExportModal } from './ExportModal';
import { DepositWithdrawModal } from './DepositWithdrawModal';
import { DailyProfitProgressBar } from './DailyProfitProgressBar';
import { ClosedTradesChart } from './ClosedTradesChart';
import { PushNotificationManager } from './PushNotificationManager';
import { PriceAlertToastOverlay, ActiveToastAlert } from './PriceAlertToastOverlay';

import { 
  LayoutDashboard, Cpu, Server, Shield, BarChart, Terminal, Sparkles, Smartphone, Wifi, Battery, Signal, Download, Wallet, Settings, Home, Activity
} from 'lucide-react';

interface MobileSimulatorViewProps {
  accountState: MT5AccountState;
  setAccountState: React.Dispatch<React.SetStateAction<MT5AccountState>>;
  positions: ActivePosition[];
  setPositions: React.Dispatch<React.SetStateAction<ActivePosition[]>>;
  closedTrades: ClosedTrade[];
  setClosedTrades: React.Dispatch<React.SetStateAction<ClosedTrade[]>>;
  mlStats: MLModelStats;
  riskConfig: RiskConfig;
  setRiskConfig: React.Dispatch<React.SetStateAction<RiskConfig>>;
  logs: LogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
  onTriggerCircuitBreaker: () => void;
  onResetCircuitBreaker: () => void;
  onApplyNewsWeightToML?: (boostPct: number, reason: string) => void;
  executeTrade?: (symbol: string, direction: 'BUY' | 'SELL') => Promise<any>;
  closePosition?: (ticket: number) => Promise<any>;
}

export const MobileSimulatorView: React.FC<MobileSimulatorViewProps> = ({
  accountState,
  setAccountState,
  positions,
  setPositions,
  closedTrades,
  setClosedTrades,
  mlStats,
  riskConfig,
  setRiskConfig,
  logs,
  setLogs,
  onTriggerCircuitBreaker,
  onResetCircuitBreaker,
  onApplyNewsWeightToML,
  executeTrade,
  closePosition
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTabSimulator>('dashboard');
  const [showDeviceFrame, setShowDeviceFrame] = useState<boolean>(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);

  // Price Alerts State
  const [alerts, setAlerts] = useState<PriceAlert[]>([
    {
      id: 'alert-1',
      symbol: 'EURUSD',
      condition: 'ABOVE',
      targetPrice: 1.0890,
      note: 'Résistance H4 Majeure',
      enabled: true,
      isTriggered: false,
      createdAt: '10:00:00'
    },
    {
      id: 'alert-2',
      symbol: 'XAUUSD',
      condition: 'ABOVE',
      targetPrice: 2400.00,
      note: 'Seuil Psychologique $2,400',
      enabled: true,
      isTriggered: false,
      createdAt: '10:15:00'
    },
    {
      id: 'alert-3',
      symbol: 'BTCUSD',
      condition: 'BELOW',
      targetPrice: 63500.00,
      note: 'Support Liquidation Longs',
      enabled: true,
      isTriggered: false,
      createdAt: '10:30:00'
    }
  ]);

  // Active Toast Notifications Overlay
  const [activeToasts, setActiveToasts] = useState<ActiveToastAlert[]>([]);

  // Trigger Toast Notification function
  const handleTriggerAlertToast = (alert: PriceAlert, currentPrice: number) => {
    const timeStr = new Date().toLocaleTimeString();
    const toastId = `toast-${Date.now()}-${Math.random()}`;

    const newToast: ActiveToastAlert = {
      id: toastId,
      alert,
      triggeredPrice: currentPrice,
      timestamp: timeStr
    };

    setActiveToasts(prev => [newToast, ...prev]);

    // Add log entry in terminal
    setLogs(prev => [
      {
        id: `log-alert-${Date.now()}`,
        timestamp: timeStr,
        level: 'INFO',
        module: 'ANDROID_UI',
        message: `🔔 ALERTE PRIX DÉCLENCHÉE: ${alert.symbol} a franchi le seuil de ${alert.targetPrice} (Prix actuel: ${currentPrice}). ${alert.note ? `[${alert.note}]` : ''}`
      },
      ...prev
    ]);

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      setActiveToasts(prev => prev.filter(t => t.id !== toastId));
    }, 8000);
  };

  const handleDismissToast = (id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  };

  // Monitor prices and automatically trigger active price alerts
  useEffect(() => {
    if (!alerts || alerts.length === 0) return;

    alerts.forEach(alert => {
      if (!alert.enabled || alert.isTriggered) return;

      const pos = positions.find(p => p.symbol === alert.symbol);
      if (!pos) return;

      const price = pos.currentPrice;
      const isCrossed = alert.condition === 'ABOVE' ? price >= alert.targetPrice : price <= alert.targetPrice;

      if (isCrossed) {
        const timeStr = new Date().toLocaleTimeString();
        setAlerts(prev => prev.map(a => a.id === alert.id ? {
          ...a,
          isTriggered: true,
          triggeredAt: timeStr,
          triggeredPrice: price
        } : a));

        handleTriggerAlertToast(alert, price);
      }
    });
  }, [positions, alerts]);

  const handleClosePosition = async (ticket: number) => {
    if (closePosition) {
      try {
        await closePosition(ticket);
        // Optimistic update
        setPositions(prev => prev.filter(p => p.ticket !== ticket));
      } catch (e) {
        console.error("Failed to close position", e);
      }
    } else {
      // Fallback
      setPositions(prev => prev.filter(p => p.ticket !== ticket));
    }
  };

  const handleCloseAllPositions = async () => {
    if (closePosition) {
      for (const pos of positions) {
        try {
          await closePosition(pos.ticket);
        } catch (e) {
          console.error(`Failed to close position ${pos.ticket}`, e);
        }
      }
      setPositions([]);
    } else {
      setPositions([]);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const bottomNav = [
    { id: 'dashboard', label: 'Accueil', icon: Home },
    { id: 'ml_engine', label: 'IA Signals', icon: Activity },
    { id: 'risk_security', label: 'Risque', icon: Shield },
    { id: 'ai_assistant', label: 'Assistant', icon: Sparkles },
    { id: 'mt5_bridge', label: 'Réglages', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Toast Notification Overlay for Price Alerts */}
      <PriceAlertToastOverlay toasts={activeToasts} onDismiss={handleDismissToast} />
      
      {/* Top Controller Options */}
      <div className="flex items-center justify-between mb-6 glass-card p-3.5 rounded-2xl">
        <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-300">
          <Smartphone className="w-4 h-4 text-indigo-400" />
          <span className="uppercase tracking-wider font-mono text-[11px]">Simulateur Android MarketShift Pro Mobile-First</span>
        </div>

        <button
          onClick={() => setShowDeviceFrame(!showDeviceFrame)}
          className="px-3.5 py-1.5 bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-300 rounded-xl text-xs font-mono font-bold border border-indigo-700/50 transition-all shadow-sm"
        >
          {showDeviceFrame ? 'MASQUER CADRE TÉLÉPHONE' : 'AFFICHER CADRE TÉLÉPHONE'}
        </button>
      </div>

      {/* Main Container */}
      <div className="flex justify-center">
        <div className={`w-full transition-all relative ${
          showDeviceFrame ? 'max-w-md bg-slate-950 android-bezel p-1.5 my-2' : 'max-w-4xl bg-slate-950/90 glass-card rounded-2xl p-4'
        }`}>
          
          {/* Smartphone Top Notch & Status Bar if frame active */}
          {showDeviceFrame && (
            <div className="pt-2 px-4 pb-2 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/80">
              <span className="font-semibold text-white font-mono">09:41</span>
              <div className="w-20 h-3.5 bg-slate-900 rounded-full mx-auto border border-slate-800" />
              <div className="flex items-center gap-1.5 text-slate-300">
                <Signal className="w-3 h-3 text-indigo-400" />
                <Wifi className="w-3 h-3 text-indigo-400" />
                <Battery className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>
          )}

          {/* App Bar inside Mobile App */}
          <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${accountState.isConnected ? 'bg-emerald-400 status-glow' : 'bg-red-500'}`} />
              <span className="font-bold text-xs text-white uppercase tracking-tight">MARKETSHIFT PRO CONTROL</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Push Notification Manager Bell & Center Drawer */}
              <PushNotificationManager />

              <button
                onClick={() => setIsDepositModalOpen(true)}
                className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-300 hover:text-white bg-emerald-950/80 border border-emerald-700/60 px-2 py-1 rounded-xl transition-all shadow-sm"
                title="Financement crypto avec QR code et demande de retrait"
              >
                <Wallet className="w-3 h-3 text-emerald-400" />
                <span>DÉPÔT / RETRAIT</span>
              </button>

              <button
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-1 text-[10px] font-mono font-bold text-indigo-300 hover:text-white bg-indigo-950/80 border border-indigo-700/60 px-2 py-1 rounded-xl transition-all shadow-sm"
                title="Exporter l'historique des trades et les logs vers un fichier CSV"
              >
                <Download className="w-3 h-3 text-indigo-400" />
                <span className="hidden sm:inline">EXPORTER</span> CSV
              </button>

              <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 uppercase hidden sm:inline-block">
                {accountState.isPaperTrading ? 'Paper Demo' : 'MT5 Réel'}
              </span>
            </div>
          </div>

          {/* Header Daily Profit Goal Progress Bar */}
          <DailyProfitProgressBar accountState={accountState} />

          {/* Active Tab Screen Content - Expanded Height to accommodate Bottom Bar */}
          <div className="p-3 pb-24 min-h-[550px] relative overflow-y-auto no-scrollbar">
            {activeTab === 'dashboard' && (
              <div className="space-y-3">
                <ClosedTradesChart closedTrades={closedTrades} />
              <DashboardTab
                accountState={accountState}
                positions={positions}
                setPositions={setPositions}
                closedTrades={closedTrades}
                setClosedTrades={setClosedTrades}
                mlStats={mlStats}
                riskConfig={riskConfig}
                setRiskConfig={setRiskConfig}
                logs={logs}
                alerts={alerts}
                setAlerts={setAlerts}
                onTriggerAlertToast={handleTriggerAlertToast}
                onClosePosition={handleClosePosition}
                onCloseAllPositions={handleCloseAllPositions}
                onOpenDepositModal={() => setIsDepositModalOpen(true)}
                onResetCircuitBreaker={onResetCircuitBreaker}
                onApplyNewsWeightToML={onApplyNewsWeightToML}
                executeTrade={executeTrade}
              />
              </div>
            )}

            {activeTab === 'ml_engine' && (
              <MLEngineTab mlStats={mlStats} />
            )}

            {activeTab === 'mt5_bridge' && (
              <MT5BridgeTab accountState={accountState} />
            )}

            {activeTab === 'risk_security' && (
              <RiskTab
                riskConfig={riskConfig}
                setRiskConfig={setRiskConfig}
                onTriggerCircuitBreaker={onTriggerCircuitBreaker}
                onResetCircuitBreaker={onResetCircuitBreaker}
                onApplyNewsWeightToML={onApplyNewsWeightToML}
              />
            )}

            {activeTab === 'backtester' && (
              <BacktesterTab />
            )}

            {activeTab === 'terminal_logs' && (
              <LogsTab logs={logs} onClearLogs={handleClearLogs} />
            )}

            {activeTab === 'ai_assistant' && (
              <AIAssistantTab />
            )}
          </div>

          {/* 2026 Bottom Navigation Bar */}
          <div className="absolute bottom-6 left-0 right-0 px-4 z-50">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl flex items-center justify-between px-2 py-2 shadow-2xl shadow-indigo-900/20">
              {bottomNav.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ActiveTabSimulator)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all min-w-[64px] ${
                      isActive
                        ? 'text-indigo-400'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-indigo-600/20' : 'bg-transparent'}`}>
                      <Icon className={`w-5 h-5 ${isActive ? 'scale-110 drop-shadow-md' : 'scale-100'}`} />
                    </div>
                    <span className={`text-[9px] font-semibold tracking-wide ${isActive ? 'font-bold' : ''}`}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Smartphone Home Bar if frame active */}
          {showDeviceFrame && (
            <div className="py-2 flex justify-center">
              <div className="w-28 h-1 bg-slate-700 rounded-full" />
            </div>
          )}

        </div>
      </div>

      {/* Export CSV Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        accountState={accountState}
        positions={positions}
        closedTrades={closedTrades}
        logs={logs}
      />

      {/* Crypto Deposit / Withdraw Modal with QR Code */}
      <DepositWithdrawModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        accountState={accountState}
        setAccountState={setAccountState}
        setLogs={setLogs}
      />

    </div>
  );
};
