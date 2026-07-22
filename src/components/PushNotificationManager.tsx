import React, { useState, useEffect } from 'react';
import { PushNotification } from '../types';
import { 
  Bell, BellRing, X, ShieldAlert, TrendingUp, TrendingDown, Zap, CheckCircle2, AlertTriangle, Radio, Sparkles, Filter, Trash2, Smartphone, Volume2, Play
} from 'lucide-react';

interface PushNotificationManagerProps {
  onNotificationAdded?: (notification: PushNotification) => void;
  customNotifications?: PushNotification[];
  isOpenCenter?: boolean;
  onToggleCenter?: () => void;
}

export const initialPushNotifications: PushNotification[] = [
  {
    id: 'push-1',
    title: 'Exécution d’Ordre MT5',
    body: 'Achat 0.50 lot EURUSD exécuté à 1.08500 (SL: 1.0820, TP: 1.0920). Signal ML: 84.5%',
    timestamp: 'Il y a 2 min',
    category: 'TRADE_EXECUTION',
    severity: 'SUCCESS',
    symbol: 'EURUSD',
    read: false
  },
  {
    id: 'push-2',
    title: 'Alerte Mouvement Majeur de Prix',
    body: 'EURUSD +28 pips en 5 min. Volatilité ATR supérieure au seuil institutionnel.',
    timestamp: 'Il y a 12 min',
    category: 'PRICE_ALERT',
    severity: 'INFO',
    symbol: 'EURUSD',
    read: true
  },
  {
    id: 'push-3',
    title: 'Signal Haussier XAU/USD (Or)',
    body: 'XAUUSD franchit $2,385.00/oz. Confiance du modèle LSTM Ensemble: 79.2%',
    timestamp: 'Il y a 35 min',
    category: 'ML_SIGNAL',
    severity: 'INFO',
    symbol: 'XAUUSD',
    read: true
  },
  {
    id: 'push-4',
    title: 'Contrôle Risque & Coupe-Circuit',
    body: 'Vérification du Drawdown Journalier OK (2.4% / Max 3.0%). Protection active.',
    timestamp: 'Il y a 1h',
    category: 'CIRCUIT_BREAKER',
    severity: 'SUCCESS',
    read: true
  }
];

export const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({
  onNotificationAdded,
  customNotifications,
  isOpenCenter = false,
  onToggleCenter
}) => {
  const [notifications, setNotifications] = useState<PushNotification[]>(initialPushNotifications);
  const [activeToast, setActiveToast] = useState<PushNotification | null>(null);
  const [isAutoPushEnabled, setIsAutoPushEnabled] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(isOpenCenter);

  // Sync internal state if prop changes
  useEffect(() => {
    setIsDrawerOpen(isOpenCenter);
  }, [isOpenCenter]);

  // Handle auto-simulated notifications background interval
  useEffect(() => {
    if (!isAutoPushEnabled) return;

    const interval = setInterval(() => {
      // Pick random simulated event
      const sampleEvents: Omit<PushNotification, 'id' | 'timestamp' | 'read'>[] = [
        {
          title: 'Breakout Prix EUR/USD',
          body: 'Cassure de résistance technique à 1.0880! Momentum haussier fort.',
          category: 'PRICE_ALERT',
          severity: 'INFO',
          symbol: 'EURUSD'
        },
        {
          title: 'Signal ML High-Confidence',
          body: 'Nouveau signal XGBoost détecté sur XAUUSD: BUY 0.10 lot (88.4% Confiance).',
          category: 'ML_SIGNAL',
          severity: 'SUCCESS',
          symbol: 'XAUUSD'
        },
        {
          title: 'Spike de Volatilité GBP/USD',
          body: 'Variation rapide de -22 pips suite à publication économique UK.',
          category: 'PRICE_ALERT',
          severity: 'WARNING',
          symbol: 'GBPUSD'
        },
        {
          title: 'Ajustement Dynamic SL/TP',
          body: 'Trailing Stop déplacé à 1.0865 pour sécuriser +$85.00 de profit.',
          category: 'TRADE_EXECUTION',
          severity: 'SUCCESS',
          symbol: 'EURUSD'
        }
      ];

      const chosen = sampleEvents[Math.floor(Math.random() * sampleEvents.length)];
      const newNotif: PushNotification = {
        ...chosen,
        id: `push-${Date.now()}`,
        timestamp: 'À l’instant',
        read: false
      };

      pushNewNotification(newNotif);
    }, 25000); // Trigger every 25 seconds

    return () => clearInterval(interval);
  }, [isAutoPushEnabled]);

  const pushNewNotification = (notif: PushNotification) => {
    setNotifications(prev => [notif, ...prev]);
    setActiveToast(notif);
    if (onNotificationAdded) {
      onNotificationAdded(notif);
    }

    // Auto dismiss toast after 5 seconds
    setTimeout(() => {
      setActiveToast(current => (current?.id === notif.id ? null : current));
    }, 5500);
  };

  const handleManualTestTrigger = (type: 'PRICE' | 'TRADE' | 'BREAKER') => {
    let testNotif: PushNotification;

    if (type === 'PRICE') {
      testNotif = {
        id: `push-${Date.now()}`,
        title: 'TEST: Mouvement Flambée de Prix',
        body: 'XAU/USD bondit de +$15.20/oz en 3 minutes suite à une ruée vers l’or physique.',
        timestamp: 'À l’instant',
        category: 'PRICE_ALERT',
        severity: 'INFO',
        symbol: 'XAUUSD',
        read: false
      };
    } else if (type === 'TRADE') {
      testNotif = {
        id: `push-${Date.now()}`,
        title: 'TEST: Clôture d’Ordre avec Gain',
        body: 'Take Profit déclenché sur Ordre #994205 (XAUUSD). Profit encaissé: +$100.50 (+0.42%).',
        timestamp: 'À l’instant',
        category: 'TRADE_EXECUTION',
        severity: 'SUCCESS',
        symbol: 'XAUUSD',
        pnl: 100.50,
        read: false
      };
    } else {
      testNotif = {
        id: `push-${Date.now()}`,
        title: 'ALERTE CRITIQUE: Coupe-Circuit Risque',
        body: 'COUPE-CIRCUIT DÉCLENCHÉ! Perte quotidienne de -3.2% atteinte. Interdiction immédiate de passer de nouveaux ordres.',
        timestamp: 'À l’instant',
        category: 'CIRCUIT_BREAKER',
        severity: 'CRITICAL',
        read: false
      };
    }

    pushNewNotification(testNotif);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setActiveToast(null);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = selectedFilter === 'ALL'
    ? notifications
    : notifications.filter(n => n.category === selectedFilter);

  const getCategoryBadge = (cat: PushNotification['category']) => {
    switch (cat) {
      case 'PRICE_ALERT':
        return { label: 'ALERTE PRIX', bg: 'bg-amber-950/80 border-amber-700/80 text-amber-300', icon: TrendingUp };
      case 'TRADE_EXECUTION':
        return { label: 'EXÉCUTION TRADE', bg: 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300', icon: CheckCircle2 };
      case 'CIRCUIT_BREAKER':
        return { label: 'COUPE-CIRCUIT', bg: 'bg-red-950/80 border-red-700/80 text-red-300', icon: ShieldAlert };
      case 'ML_SIGNAL':
        return { label: 'SIGNAL ML', bg: 'bg-indigo-950/80 border-indigo-700/80 text-indigo-300', icon: Sparkles };
      default:
        return { label: 'SYSTÈME', bg: 'bg-slate-800 text-slate-300 border-slate-700', icon: Zap };
    }
  };

  return (
    <>
      {/* 1. Android Top Push Notification Toast Overlay */}
      {activeToast && (
        <div className="absolute top-12 left-2 right-2 z-50 animate-slideDown font-sans">
          <div className="bg-slate-900/95 border border-indigo-500/60 rounded-2xl p-3 shadow-2xl backdrop-blur-md space-y-2 text-slate-100 ring-1 ring-indigo-500/30">
            
            {/* Header Toast Line */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-[9px]">
                  M
                </div>
                <span className="font-bold text-white uppercase tracking-tight">MARKETSHIFT PUSH</span>
                <span>• {activeToast.timestamp}</span>
              </div>

              <div className="flex items-center gap-2">
                {(() => {
                  const badge = getCategoryBadge(activeToast.category);
                  const Icon = badge.icon;
                  return (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-1 ${badge.bg}`}>
                      <Icon className="w-2.5 h-2.5" />
                      {badge.label}
                    </span>
                  );
                })()}

                <button 
                  onClick={() => setActiveToast(null)} 
                  className="p-1 text-slate-400 hover:text-white rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Toast Body */}
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                {activeToast.severity === 'CRITICAL' && <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />}
                {activeToast.severity === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {activeToast.title}
              </h4>
              <p className="text-[11px] text-slate-300 font-sans leading-tight">
                {activeToast.body}
              </p>
            </div>

            {/* Animated Time Progress Dismiss Bar */}
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 animate-shrinkWidth" />
            </div>

          </div>
        </div>
      )}

      {/* 2. Notification Center Launcher Toggle Button (Rendered inline in mobile app bar) */}
      <div className="relative">
        <button
          onClick={() => {
            const nextState = !isDrawerOpen;
            setIsDrawerOpen(nextState);
            if (onToggleCenter) onToggleCenter();
            if (nextState) markAllAsRead();
          }}
          className="relative p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-all"
          title="Ouvrir le Centre de Notifications Push"
        >
          {unreadCount > 0 ? (
            <BellRing className="w-4 h-4 text-indigo-400 animate-bounce" />
          ) : (
            <Bell className="w-4 h-4 text-slate-300" />
          )}

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-mono font-bold flex items-center justify-center border border-slate-950 animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* 3. Push Notification Center Modal / Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-fadeIn font-sans">
          <div className="relative w-full max-w-md glass-card rounded-3xl p-5 border border-indigo-500/40 shadow-2xl space-y-4 bg-slate-900/95 text-slate-100 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-950 border border-indigo-700/60 rounded-xl text-indigo-400 status-glow">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Notifications Push Android MT5
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Flux d'alertes en temps réel (Prix, Ordres & Coupe-Circuit)
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  if (onToggleCenter) onToggleCenter();
                }}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Test Actions Toolbar */}
            <div className="space-y-1.5 font-mono text-[10px]">
              <div className="text-slate-400 flex items-center justify-between">
                <span>Déclencher une Alerte de Test :</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-indigo-300">
                  <input
                    type="checkbox"
                    checked={isAutoPushEnabled}
                    onChange={(e) => setIsAutoPushEnabled(e.target.checked)}
                    className="accent-indigo-500 rounded"
                  />
                  <span>Push Arrière-Plan Auto</span>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleManualTestTrigger('PRICE')}
                  className="px-2 py-1.5 bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border border-amber-800 rounded-xl font-bold transition-all text-[10px]"
                >
                  + Alerte Prix
                </button>
                <button
                  onClick={() => handleManualTestTrigger('TRADE')}
                  className="px-2 py-1.5 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800 rounded-xl font-bold transition-all text-[10px]"
                >
                  + Test Exec Trade
                </button>
                <button
                  onClick={() => handleManualTestTrigger('BREAKER')}
                  className="px-2 py-1.5 bg-red-950/80 hover:bg-red-900/80 text-red-300 border border-red-800 rounded-xl font-bold transition-all text-[10px]"
                >
                  + Coupe-Circuit
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-mono border-b border-slate-800/80">
              {['ALL', 'PRICE_ALERT', 'TRADE_EXECUTION', 'CIRCUIT_BREAKER', 'ML_SIGNAL'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                    selectedFilter === filter 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {filter === 'ALL' ? 'TOUTES' : filter.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Notification History Stream */}
            <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-72 scrollbar-thin font-sans text-xs">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-mono text-xs">
                  Aucune notification push enregistrée dans ce filtre.
                </div>
              ) : (
                filteredNotifications.map((n) => {
                  const badge = getCategoryBadge(n.category);
                  const Icon = badge.icon;

                  return (
                    <div 
                      key={n.id}
                      className={`p-3 rounded-2xl border transition-all space-y-1.5 ${
                        n.severity === 'CRITICAL'
                          ? 'bg-red-950/40 border-red-800/80'
                          : n.severity === 'SUCCESS'
                          ? 'bg-emerald-950/30 border-emerald-800/60'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className={`px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${badge.bg}`}>
                          <Icon className="w-2.5 h-2.5" />
                          {badge.label}
                        </span>
                        <span className="text-slate-400">{n.timestamp}</span>
                      </div>

                      <div>
                        <h5 className="font-bold text-white text-xs flex items-center gap-1.5">
                          {n.title}
                        </h5>
                        <p className="text-[11px] text-slate-300 leading-snug">
                          {n.body}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>{notifications.length} notifications enregistrées</span>
              <button
                onClick={clearAllNotifications}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Effacer Historique</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
