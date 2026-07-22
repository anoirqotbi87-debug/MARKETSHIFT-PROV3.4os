import React, { useState, useMemo } from 'react';
import { MT5AccountState, ActivePosition, ClosedTrade, MLModelStats, RiskConfig, LogEntry, PriceAlert } from '../../types';
import { PnLEquityChart } from '../PnLEquityChart';
import { EquityBenchmarkChart } from '../EquityBenchmarkChart';
import { DrawdownMonitor } from '../DrawdownMonitor';
import { MarketOverviewSparklines } from '../MarketOverviewSparklines';
import { NewsSentimentModule } from '../NewsSentimentModule';
import { MarketNews } from '../MarketNews';
import { NewsRiskAlertService } from '../NewsRiskAlertService';
import { SymbolCorrelationPanel } from '../SymbolCorrelationPanel';
import { MarketCorrelationHeatmap } from '../MarketCorrelationHeatmap';
import { MarketDepthChart } from '../MarketDepthChart';
import { PortfolioHealthMonitor } from '../PortfolioHealthMonitor';
import { PositionDistributionChart } from '../PositionDistributionChart';
import { FeatureImpactChart } from '../FeatureImpactChart';
import { StrategyValidator } from '../StrategyValidator';
import { PriceAlertsConfig } from '../PriceAlertsConfig';
import { EconomicCalendar } from '../EconomicCalendar';
import { LiveMLLatencyChart } from '../LiveMLLatencyChart';
import { InfrastructureMonitor } from '../InfrastructureMonitor';
import { TradeTagManager, TradeTagPill } from '../TradeTagManager';
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, AlertTriangle, ShieldCheck, XCircle, ArrowUpRight, ArrowDownRight, Download, History, FileSpreadsheet, Filter, Tag, QrCode, Wallet, Search, Calendar, CalendarDays, X, RotateCcw, Fingerprint, BarChart2, Brain, Newspaper, PieChart, Server 
} from 'lucide-react';
import { BiometricAuthModal } from '../BiometricAuthModal';
import { exportTradesToCSV, exportFullReportToCSV } from '../../utils/csvExport';

// Date parser helper for trades with time strings or date strings
function parseTradeDate(timeStr: string): Date {
  if (!timeStr) return new Date();

  const trimmed = timeStr.trim();
  if (trimmed.includes('-') || trimmed.includes('/')) {
    const formatted = trimmed.replace(' ', 'T');
    const parsed = new Date(formatted);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const timeParts = trimmed.split(':');
  if (timeParts.length >= 2) {
    const d = new Date();
    d.setHours(parseInt(timeParts[0], 10) || 0, parseInt(timeParts[1], 10) || 0, parseInt(timeParts[2] || '0', 10) || 0, 0);
    return d;
  }

  return new Date();
}

interface DashboardTabProps {
  accountState: MT5AccountState;
  positions: ActivePosition[];
  setPositions?: React.Dispatch<React.SetStateAction<ActivePosition[]>>;
  closedTrades: ClosedTrade[];
  setClosedTrades?: React.Dispatch<React.SetStateAction<ClosedTrade[]>>;
  mlStats: MLModelStats;
  riskConfig: RiskConfig;
  setRiskConfig?: React.Dispatch<React.SetStateAction<RiskConfig>>;
  logs?: LogEntry[];
  alerts?: PriceAlert[];
  setAlerts?: React.Dispatch<React.SetStateAction<PriceAlert[]>>;
  onTriggerAlertToast?: (alert: PriceAlert, currentPrice: number) => void;
  onClosePosition: (ticket: number) => void;
  onCloseAllPositions: () => void;
  onOpenDepositModal?: () => void;
  onResetCircuitBreaker?: () => void;
  onApplyNewsWeightToML?: (boostPct: number, reason: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  accountState,
  positions,
  setPositions,
  closedTrades = [],
  setClosedTrades,
  mlStats,
  riskConfig,
  setRiskConfig,
  logs = [],
  alerts = [],
  setAlerts,
  onTriggerAlertToast,
  onClosePosition,
  onCloseAllPositions,
  onOpenDepositModal,
  onResetCircuitBreaker,
  onApplyNewsWeightToML
}) => {
  const [isBioModalOpen, setIsBioModalOpen] = useState<boolean>(false);
  const [dashboardSubTab, setDashboardSubTab] = useState<'OVERVIEW' | 'TRADING' | 'RISK' | 'ANALYTICS' | 'INFRASTRUCTURE'>('OVERVIEW');
  const [activeTagFilter, setActiveTagFilter] = useState<string>('ALL');
  const [closedTagFilter, setClosedTagFilter] = useState<string>('ALL');

  // Search & Date Filter States for Closed Trades
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [datePreset, setDatePreset] = useState<'ALL' | 'TODAY' | '7D' | '30D' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Tag helper functions for Active Positions
  const handleAddTagToPosition = (ticket: number, tag: string) => {
    if (!setPositions) return;
    const formatted = tag.startsWith('#') ? tag : `#${tag}`;
    setPositions(prev => prev.map(p => {
      if (p.ticket === ticket) {
        const existing = p.tags || [];
        if (!existing.includes(formatted)) {
          return { ...p, tags: [...existing, formatted] };
        }
      }
      return p;
    }));
  };

  const handleRemoveTagFromPosition = (ticket: number, tag: string) => {
    if (!setPositions) return;
    setPositions(prev => prev.map(p => {
      if (p.ticket === ticket) {
        return { ...p, tags: (p.tags || []).filter(t => t !== tag) };
      }
      return p;
    }));
  };

  // Tag helper functions for Closed Trades
  const handleAddTagToTrade = (ticket: number, tag: string) => {
    if (!setClosedTrades) return;
    const formatted = tag.startsWith('#') ? tag : `#${tag}`;
    setClosedTrades(prev => prev.map(t => {
      if (t.ticket === ticket) {
        const existing = t.tags || [];
        if (!existing.includes(formatted)) {
          return { ...t, tags: [...existing, formatted] };
        }
      }
      return t;
    }));
  };

  const handleRemoveTagFromTrade = (ticket: number, tag: string) => {
    if (!setClosedTrades) return;
    setClosedTrades(prev => prev.map(t => {
      if (t.ticket === ticket) {
        return { ...t, tags: (t.tags || []).filter(t => t !== tag) };
      }
      return t;
    }));
  };

  // Extract all unique tags across positions
  const allActiveTags = Array.from(
    new Set(positions.flatMap(p => p.tags || []))
  );

  // Extract all unique tags across closed trades
  const allClosedTags = Array.from(
    new Set(closedTrades.flatMap(t => t.tags || []))
  );

  // Filter positions
  const filteredPositions = activeTagFilter === 'ALL'
    ? positions
    : positions.filter(p => p.tags?.includes(activeTagFilter));

  // Filter closed trades by Tag, Search Query (ticket/symbol/reason), and Date Range
  const filteredClosedTrades = useMemo(() => {
    return closedTrades.filter(trade => {
      // 1. Tag filter
      if (closedTagFilter !== 'ALL' && !trade.tags?.includes(closedTagFilter)) {
        return false;
      }

      // 2. Search query filter (ticket, symbol, signal reason, close reason, tags)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.trim().toLowerCase();
        const ticketMatch = trade.ticket.toString().includes(q);
        const symbolMatch = trade.symbol.toLowerCase().includes(q);
        const reasonMatch = trade.signalReason.toLowerCase().includes(q);
        const closeReasonMatch = trade.closeReason.toLowerCase().includes(q);
        const tagMatch = trade.tags?.some(t => t.toLowerCase().includes(q));

        if (!ticketMatch && !symbolMatch && !reasonMatch && !closeReasonMatch && !tagMatch) {
          return false;
        }
      }

      // 3. Date / Time range filter
      const tradeDate = parseTradeDate(trade.closeTime || trade.openTime);
      const now = new Date();

      if (datePreset === 'TODAY') {
        const todayStr = now.toISOString().split('T')[0];
        const tradeStr = tradeDate.toISOString().split('T')[0];
        if (todayStr !== tradeStr) return false;
      } else if (datePreset === '7D') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        if (tradeDate < sevenDaysAgo) return false;
      } else if (datePreset === '30D') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        if (tradeDate < thirtyDaysAgo) return false;
      } else if (datePreset === 'CUSTOM') {
        if (startDate) {
          const start = new Date(startDate + 'T00:00:00');
          if (tradeDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate + 'T23:59:59');
          if (tradeDate > end) return false;
        }
      }

      return true;
    });
  }, [closedTrades, closedTagFilter, searchQuery, datePreset, startDate, endDate]);

  // Statistics for the filtered trades subset
  const filteredStats = useMemo(() => {
    const count = filteredClosedTrades.length;
    const totalPnL = filteredClosedTrades.reduce((acc, t) => acc + t.pnl, 0);
    const winningCount = filteredClosedTrades.filter(t => t.pnl > 0).length;
    const winRate = count > 0 ? Math.round((winningCount / count) * 100) : 0;

    return { count, totalPnL, winningCount, winRate };
  }, [filteredClosedTrades]);
  return (
    <div className="space-y-4 text-slate-100">
      
      {/* Circuit Breaker Alert Banner if triggered */}
      {riskConfig.circuitBreakerActive && (
        <div className="bg-red-950/80 border border-red-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-200 shadow-md font-sans">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-bounce" />
            <div className="space-y-0.5">
              <div className="font-bold text-red-300 uppercase font-mono tracking-wide">COUPE-CIRCUIT D'URGENCE ACTIVÉ</div>
              <div className="text-[11px] text-red-200">{riskConfig.circuitBreakerReason || 'Alerte de risque déclenchée. Les nouveaux trades sont verrouillés.'}</div>
            </div>
          </div>

          {onResetCircuitBreaker && (
            <button
              onClick={() => setIsBioModalOpen(true)}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold font-mono text-[11px] transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 uppercase tracking-tight"
            >
              <Fingerprint className="w-4 h-4 text-emerald-200" />
              <span>Réarmer Bot (Biométrie)</span>
            </button>
          )}
        </div>
      )}

      {/* Biometric Prompt Modal for Circuit Breaker Reset */}
      <BiometricAuthModal
        isOpen={isBioModalOpen}
        onClose={() => setIsBioModalOpen(false)}
        onSuccess={() => {
          if (onResetCircuitBreaker) onResetCircuitBreaker();
        }}
        title="Réarmement Sécurisé du Bot MT5"
        description="Empreinte digitale / Face ID requise pour réinitialiser le coupe-circuit et réautoriser le passage d'ordres en production."
        actionLabel="Réarmer Coupe-Circuit"
      />

      {/* Account Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
        <div className="glass-card glass-card-hover p-3 rounded-2xl">
          <div className="text-[11px] text-slate-400 font-sans font-medium">Équité Totale</div>
          <div className="text-base font-bold text-white mt-0.5">
            ${accountState.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5 mt-0.5">
            <TrendingUp className="w-3 h-3" />
            +${accountState.dailyPnL} ({accountState.dailyPnLPct}%)
          </div>
        </div>

        <div className="glass-card glass-card-hover p-3 rounded-2xl relative">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans font-medium">
            <span>Solde Compte</span>
            {onOpenDepositModal && (
              <button
                onClick={onOpenDepositModal}
                className="text-[9px] font-mono font-bold text-emerald-300 hover:text-white bg-emerald-950/90 px-1.5 py-0.5 rounded-lg border border-emerald-700/80 flex items-center gap-1 transition-all shadow-sm"
                title="Dépôt / Retrait Crypto avec QR Code"
              >
                <QrCode className="w-2.5 h-2.5 text-emerald-400" />
                <span>Dépôt QR</span>
              </button>
            )}
          </div>
          <div className="text-base font-bold text-slate-200 mt-0.5">
            ${accountState.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Libre: ${accountState.freeMargin.toFixed(0)}
          </div>
        </div>

        <div className="glass-card glass-card-hover p-3 rounded-2xl">
          <div className="text-[11px] text-slate-400 font-sans font-medium">PnL Latent</div>
          <div className={`text-base font-bold mt-0.5 ${accountState.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {accountState.unrealizedPnL >= 0 ? '+' : ''}${accountState.unrealizedPnL.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 font-sans mt-0.5">
            {positions.length} position(s)
          </div>
        </div>

        <div className="glass-card glass-card-hover p-3 rounded-2xl">
          <div className="text-[11px] text-slate-400 font-sans font-medium">Niveau de Marge</div>
          <div className="text-base font-bold text-indigo-400 mt-0.5">
            {accountState.marginLevelPct}%
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-sans mt-0.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Sain (&gt;500%)
          </div>
        </div>
      </div>

      {/* Dashboard Sub-Tabs Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 font-mono text-xs border-b border-slate-800/80 no-scrollbar">
        <button
          onClick={() => setDashboardSubTab('OVERVIEW')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
            dashboardSubTab === 'OVERVIEW'
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
              : 'bg-slate-950/80 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-900'
          }`}
        >
          <BarChart2 className="w-4 h-4 text-emerald-400" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setDashboardSubTab('TRADING')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
            dashboardSubTab === 'TRADING'
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
              : 'bg-slate-950/80 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-900'
          }`}
        >
          <History className="w-4 h-4 text-purple-400" />
          <span>Trading</span>
        </button>

        <button
          onClick={() => setDashboardSubTab('RISK')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
            dashboardSubTab === 'RISK'
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
              : 'bg-slate-950/80 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-900'
          }`}
        >
          <PieChart className="w-4 h-4 text-cyan-400" />
          <span>Risk</span>
        </button>

        <button
          onClick={() => setDashboardSubTab('ANALYTICS')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
            dashboardSubTab === 'ANALYTICS'
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
              : 'bg-slate-950/80 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-900'
          }`}
        >
          <Brain className="w-4 h-4 text-indigo-300" />
          <span>Analytics</span>
        </button>

        <button
          onClick={() => setDashboardSubTab('INFRASTRUCTURE')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
            dashboardSubTab === 'INFRASTRUCTURE'
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
              : 'bg-slate-950/80 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-900'
          }`}
        >
          <Server className="w-4 h-4 text-emerald-400" />
          <span>Infrastructure</span>
        </button>
      </div>

      {/* 1. OVERVIEW SUB-TAB CONTENT */}
      {dashboardSubTab === 'OVERVIEW' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Market Overview Top 5 Watched Symbols Sparklines */}
          <MarketOverviewSparklines />

          {/* Interactive PnL & Equity Evolution Chart */}
          <PnLEquityChart accountState={accountState} />

          {/* Equity Curve vs Buy & Hold Benchmark Chart */}
          <EquityBenchmarkChart accountState={accountState} />

          {/* Quick Active Positions List inside Overview */}
          {positions.length > 0 && (
            <div className="glass-card rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                <span className="font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                  <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                  Positions Actives en Direct ({positions.length})
                </span>
                <button
                  onClick={() => setDashboardSubTab('TRADING')}
                  className="text-[10px] font-mono font-bold text-indigo-300 hover:text-white underline"
                >
                  Voir tout l'historique →
                </button>
              </div>
              <div className="space-y-2 font-mono">
                {positions.slice(0, 3).map((pos) => (
                  <div key={pos.ticket} className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        pos.type === 'BUY' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                      }`}>
                        {pos.type} {pos.lots}
                      </span>
                      <span className="font-bold text-white">{pos.symbol}</span>
                    </div>
                    <div className={`font-bold text-sm ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. ANALYTICS SUB-TAB CONTENT */}
      {dashboardSubTab === 'ANALYTICS' && (
        <div className="space-y-4 animate-in fade-in">
          {/* ML Live Signal & Confidence Widget */}
          <div className="glass-card p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 uppercase tracking-wide">Signal Inférence ML (XGBoost + LSTM)</span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 text-[10px] font-mono border border-indigo-700/60 font-bold">
                Latence: {mlStats.inferenceTimeMs}ms
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-xl ${
                  mlStats.currentSignal.direction === 'BUY'
                    ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-700/60 status-glow'
                    : 'bg-red-950/90 text-red-400 border border-red-700/60'
                }`}>
                  {mlStats.currentSignal.direction === 'BUY' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-tight font-mono">
                    {mlStats.currentSignal.symbol} : {mlStats.currentSignal.direction}
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">
                    Caractéristiques Clés: RSI + ATR Breakdown
                  </div>
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-sm font-extrabold text-indigo-400">
                  {mlStats.currentSignal.confidence}%
                </div>
                <div className="text-[10px] text-slate-400 font-sans">Score Confiance</div>
              </div>
            </div>
          </div>

          {/* Feature Impact Horizontal Bar Chart (Recharts) for XGBoost + LSTM Ensemble */}
          <FeatureImpactChart mlStats={mlStats} />

          {/* Live ML Inference Latency Real-time Monitoring Chart */}
          <LiveMLLatencyChart mlStats={mlStats} />

          {/* Strategy Validator & ML Feature Toggling Simulation Panel */}
          <StrategyValidator mlStats={mlStats} />
        </div>
      )}

      {/* 5. INFRASTRUCTURE SUB-TAB CONTENT */}
      {dashboardSubTab === 'INFRASTRUCTURE' && (
        <div className="space-y-4 animate-in fade-in">
          <InfrastructureMonitor accountState={accountState} />
        </div>
      )}

      {/* 3. RISK SUB-TAB CONTENT */}
      {dashboardSubTab === 'RISK' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Automated News-Driven Risk Alert & Protective Hedge Service */}
          <NewsRiskAlertService 
            positions={positions}
            riskConfig={riskConfig}
            setRiskConfig={setRiskConfig}
            onTriggerAlertToast={(title, msg, type) => {
              if (onTriggerAlertToast) {
                onTriggerAlertToast({
                  id: `news-toast-${Date.now()}`,
                  symbol: 'MACRO_NEWS',
                  targetPrice: 0,
                  condition: 'ABOVE',
                  createdAt: new Date().toLocaleTimeString('fr-FR'),
                  note: `${title}: ${msg}`,
                  isActive: true
                }, 0);
              }
            }}
          />

          {/* Real-time Market News Headlines & Dynamic Sentiment Score Indicator (-1.0 to +1.0) */}
          <MarketNews onApplyNewsWeightToML={onApplyNewsWeightToML} />

          {/* Real-time Financial News Sentiment Analysis Module */}
          <NewsSentimentModule />

          {/* Macro Economic Calendar & High-Volatility Auto-Trading Guard */}
          <EconomicCalendar />
        </div>
      )}

      {/* 2. TRADING SUB-TAB CONTENT */}
      {dashboardSubTab === 'TRADING' && (
        <div className="space-y-4 animate-in fade-in">





      {/* Active Positions List */}
      <div className="glass-card rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pb-2 border-b border-slate-800">
          <span className="font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
            <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
            Positions MT5 Actives ({positions.length})
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportTradesToCSV(positions, closedTrades)}
              className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 hover:text-white bg-indigo-950/80 border border-indigo-700/60 px-2 py-1 rounded-lg transition-colors font-mono"
              title="Exporter toutes les positions et l'historique vers un fichier CSV"
            >
              <Download className="w-3 h-3" />
              <span>Export CSV</span>
            </button>

            {positions.length > 0 && (
              <button
                onClick={onCloseAllPositions}
                className="text-[11px] font-semibold text-red-400 hover:text-red-300 bg-red-950/60 border border-red-800/80 px-2.5 py-0.5 rounded-lg transition-colors"
              >
                Tout Clôturer
              </button>
            )}
          </div>
        </div>

        {/* Tag Filter Toolbar for Active Positions */}
        {positions.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-mono">
            <span className="text-slate-400 flex items-center gap-1 text-[10px]">
              <Filter className="w-3 h-3 text-indigo-400" />
              <span>Filtre Tag :</span>
            </span>
            <button
              onClick={() => setActiveTagFilter('ALL')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                activeTagFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              TOUS ({positions.length})
            </button>
            {allActiveTags.map(tag => {
              const count = positions.filter(p => p.tags?.includes(tag)).length;
              return (
                <TradeTagPill
                  key={tag}
                  tag={`${tag} (${count})`}
                  isActive={activeTagFilter === tag}
                  onClick={() => setActiveTagFilter(activeTagFilter === tag ? 'ALL' : tag)}
                />
              );
            })}
          </div>
        )}

        {filteredPositions.length === 0 ? (
          <div className="text-center py-6 bg-slate-950/50 rounded-xl border border-slate-800/60 text-xs text-slate-500">
            {activeTagFilter !== 'ALL' 
              ? `Aucune position avec le tag ${activeTagFilter}.` 
              : 'Aucune position ouverte actuellement. Le bot analyse le marché en direct.'}
          </div>
        ) : (
          <div className="space-y-2 font-mono">
            {filteredPositions.map((pos) => (
              <div key={pos.ticket} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        pos.type === 'BUY' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                      }`}>
                        {pos.type} {pos.lots} Lots
                      </span>
                      <span className="font-bold text-white text-sm">{pos.symbol}</span>
                      <span className="text-[10px] text-slate-500">#{pos.ticket}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                      <span>Prix: {pos.openPrice}</span>
                      <span>→ {pos.currentPrice}</span>
                      <span className="text-indigo-400 font-bold">ML {pos.mlConfidence}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <div className={`font-bold text-sm ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-slate-500">SL: {pos.stopLoss}</div>
                    </div>

                    <button
                      onClick={() => onClosePosition(pos.ticket)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                      title="Clôturer cette position"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tag Categorization Control Bar */}
                <div className="pt-2 border-t border-slate-900/80 flex items-center justify-between">
                  <TradeTagManager
                    tags={pos.tags}
                    onAddTag={(tag) => handleAddTagToPosition(pos.ticket, tag)}
                    onRemoveTag={(tag) => handleRemoveTagFromPosition(pos.ticket, tag)}
                  />
                  <span className="text-[9px] text-slate-500 font-sans">{pos.signalReason}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Closed Trades History Section */}
      <div className="glass-card rounded-2xl p-3.5 space-y-3 border border-slate-800">
        
        {/* Section Header & CSV Export */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                <span>Historique des Trades Clôturés</span>
                <span className="px-2 py-0.2 bg-indigo-950 text-indigo-300 border border-indigo-700 text-[10px] rounded-full font-mono">
                  {filteredClosedTrades.length} / {closedTrades.length}
                </span>
              </span>
              <p className="text-[10px] text-slate-400">
                Filtrez vos positions fermées par ticket, symbole ou plage temporelle
              </p>
            </div>
          </div>

          <button
            onClick={() => exportFullReportToCSV(accountState, positions, closedTrades, logs)}
            className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 hover:text-white bg-emerald-950/80 border border-emerald-700/60 px-2.5 py-1 rounded-lg transition-colors font-mono self-start sm:self-auto"
            title="Exporter rapport complet (Compte + Trades + Logs) au format CSV"
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>Rapport CSV</span>
          </button>
        </div>

        {/* Search Bar & Date Filter Controls Toolbar */}
        <div className="space-y-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
          
          {/* Top Row: Search Field & Date Preset Buttons */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            
            {/* Search Input Field */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par ticket (#994180), symbole (EURUSD), motif..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500/80 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  title="Effacer la recherche"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Range Presets Selector */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar font-mono text-[10px]">
              <span className="text-slate-400 flex items-center gap-1 mr-1 text-[10px] shrink-0">
                <CalendarDays className="w-3 h-3 text-indigo-400" />
                <span className="hidden sm:inline">Période:</span>
              </span>
              {[
                { id: 'ALL', label: 'Tous' },
                { id: 'TODAY', label: "Aujourd'hui" },
                { id: '7D', label: '7 Jours' },
                { id: '30D', label: '30 Jours' },
                { id: 'CUSTOM', label: 'Personnalisé' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDatePreset(p.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap border ${
                    datePreset === p.id
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

          </div>

          {/* Custom Date Pickers Drawer (shown when datePreset === 'CUSTOM') */}
          {datePreset === 'CUSTOM' && (
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 font-mono text-[10px] animate-in fade-in">
              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-400">Du :</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-400">Au :</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="px-2 py-1 text-slate-400 hover:text-white bg-slate-900 rounded-lg border border-slate-800 text-[9px]"
                >
                  Effacer Dates
                </button>
              )}
            </div>
          )}

          {/* Tag Filter Row */}
          {closedTrades.length > 0 && allClosedTags.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono">
              <span className="text-slate-400 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3 text-indigo-400" />
                <span>Tag:</span>
              </span>
              <button
                onClick={() => setClosedTagFilter('ALL')}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  closedTagFilter === 'ALL'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                TOUS ({closedTrades.length})
              </button>
              {allClosedTags.map(tag => {
                const count = closedTrades.filter(t => t.tags?.includes(tag)).length;
                return (
                  <TradeTagPill
                    key={tag}
                    tag={`${tag} (${count})`}
                    isActive={closedTagFilter === tag}
                    onClick={() => setClosedTagFilter(closedTagFilter === tag ? 'ALL' : tag)}
                  />
                );
              })}
            </div>
          )}

        </div>

        {/* Filtered Trades Stats Summary & Reset Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[10px] font-mono bg-slate-950/40 p-2 rounded-xl border border-slate-800/60">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400">
              Résultats: <strong className="text-white">{filteredStats.count}</strong> trade(s)
            </span>
            <span className="text-slate-400">
              PnL Filtré: <strong className={`font-bold ${filteredStats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {filteredStats.totalPnL >= 0 ? '+' : ''}${filteredStats.totalPnL.toFixed(2)}
              </strong>
            </span>
            <span className="text-slate-400">
              Taux de Victoire: <strong className="text-emerald-300">{filteredStats.winRate}%</strong> ({filteredStats.winningCount}/{filteredStats.count})
            </span>
          </div>

          {(searchQuery !== '' || datePreset !== 'ALL' || closedTagFilter !== 'ALL' || startDate !== '' || endDate !== '') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setDatePreset('ALL');
                setClosedTagFilter('ALL');
                setStartDate('');
                setEndDate('');
              }}
              className="flex items-center gap-1 text-slate-400 hover:text-white bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-indigo-400" />
              <span>Réinitialiser Filtres</span>
            </button>
          )}
        </div>

        {/* Trades Cards List */}
        {filteredClosedTrades.length === 0 ? (
          <div className="text-center py-6 bg-slate-950/50 rounded-xl border border-slate-800/60 text-xs text-slate-400 space-y-1">
            <div className="font-bold text-slate-300">Aucun trade ne correspond aux critères sélectionnés</div>
            <p className="text-[10px] text-slate-500">
              Essayez de modifier la recherche (ticket/symbole), d'élargir la plage de dates ou de réinitialiser les filtres.
            </p>
          </div>
        ) : (
          <div className="space-y-2 font-mono">
            {filteredClosedTrades.map((trade) => (
              <div key={trade.ticket} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-xs space-y-2 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        trade.type === 'BUY' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                      }`}>
                        {trade.type} {trade.lots}
                      </span>
                      <span className="font-bold text-white text-sm">{trade.symbol}</span>
                      <span className="text-[10px] text-slate-500">#{trade.ticket}</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-indigo-300 rounded border border-slate-700">
                        {trade.closeReason}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 font-sans">
                      <span>Ouv: {trade.openPrice} ({trade.openTime})</span>
                      <span>→ Ferm: {trade.closePrice} ({trade.closeTime})</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-bold text-sm ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      Confiance ML: {trade.mlConfidence}%
                    </div>
                  </div>
                </div>

                {/* Tag Categorization Control Bar */}
                <div className="pt-2 border-t border-slate-900/80 flex items-center justify-between">
                  <TradeTagManager
                    tags={trade.tags}
                    onAddTag={(tag) => handleAddTagToTrade(trade.ticket, tag)}
                    onRemoveTag={(tag) => handleRemoveTagFromTrade(trade.ticket, tag)}
                  />
                  <span className="text-[9px] text-slate-500 font-sans">{trade.signalReason}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
      )}

    </div>
  );
};

