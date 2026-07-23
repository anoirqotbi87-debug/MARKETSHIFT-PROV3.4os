import React, { useState, useEffect, useRef, useCallback, Dispatch, SetStateAction } from 'react';
import { MT5AccountState, ReconnectionState, MLModelStats } from '../types';

interface UseMT5ConnectionOptions {
  baseDelayMs?: number;
  maxDelayMs?: number;
  maxAttempts?: number;
  onLogAdd?: (message: string, level?: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR') => void;
}

export function useMT5Connection(
  accountState: MT5AccountState,
  setAccountState: Dispatch<SetStateAction<MT5AccountState>>,
  riskConfig: any,
  setMlStats: Dispatch<SetStateAction<MLModelStats>>,
  options: UseMT5ConnectionOptions = {}
) {
  const {
    baseDelayMs = 2000,
    maxDelayMs = 30000,
    maxAttempts = 5,
    onLogAdd
  } = options;

  const [reconnectionState, setReconnectionState] = useState<ReconnectionState>({
    isReconnecting: false,
    attempt: 0,
    maxAttempts,
    backoffDelayMs: baseDelayMs,
    remainingMs: baseDelayMs,
    progressPct: 0,
    nextAttemptInSec: baseDelayMs / 1000,
    lastDisconnectReason: 'Pertes de paquets TCP ZeroMQ Socket'
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const currentDelayRef = useRef<number>(baseDelayMs);

  // Calculate exponential backoff delay
  const getBackoffDelay = useCallback((attemptNumber: number) => {
    // delay = min(baseDelay * 2^(attempt - 1), maxDelay)
    const exponential = baseDelayMs * Math.pow(2, Math.max(0, attemptNumber - 1));
    return Math.min(exponential, maxDelayMs);
  }, [baseDelayMs, maxDelayMs]);

  // Force Reconnect Immediately
  const forceReconnect = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (onLogAdd) {
      onLogAdd('Reconnexion manuelle forcée initiée...', 'INFO');
    }

    setReconnectionState(prev => ({
      ...prev,
      isReconnecting: true,
      remainingMs: 0,
      progressPct: 100,
      nextAttemptInSec: 0
    }));

    setTimeout(() => {
      setAccountState(prev => ({
        ...prev,
        isConnected: true,
        pingMs: Math.floor(10 + Math.random() * 8)
      }));

      setReconnectionState(prev => ({
        ...prev,
        isReconnecting: false,
        attempt: 0,
        progressPct: 0
      }));

      if (onLogAdd) {
        onLogAdd('Connexion au Bridge ZeroMQ MT5 rétablie avec succès (12ms)!', 'SUCCESS');
      }
    }, 600);
  }, [setAccountState, onLogAdd]);

  // Simulate intentional disconnect
  const simulateDisconnect = useCallback((reason: string = 'Interruption réseau simulée (ZeroMQ Heartbeat Timeout)') => {
    setAccountState(prev => ({
      ...prev,
      isConnected: false
    }));

    setReconnectionState(prev => ({
      ...prev,
      lastDisconnectReason: reason,
      attempt: 1,
      isReconnecting: true
    }));

    if (onLogAdd) {
      onLogAdd(`Déconnexion MT5 détectée: ${reason}`, 'WARNING');
    }
  }, [setAccountState, onLogAdd]);

  // MetaApi Data Fetcher
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const fetchMetaApi = async () => {
      if (riskConfig?.useLocalBridge || !riskConfig?.metaApiToken || !riskConfig?.metaApiAccountId) return;
      try {
        // Step 1: Get the account region from the provisioning API
        const provRes = await fetch(`https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${riskConfig.metaApiAccountId}`, {
          headers: { 'auth-token': riskConfig.metaApiToken }
        });
        
        if (!provRes.ok) {
          const errText = await provRes.text();
          if (onLogAdd) onLogAdd(`Erreur MetaApi Provisioning (${provRes.status}): ${errText.substring(0, 50)}`, 'ERROR');
          return;
        }
        
        const provData = await provRes.json();
        const region = provData.region || 'new-york'; // fallback if not present
        
        // Step 2: Fetch account information from the region-specific client API
        const res = await fetch(`https://mt-client-api-v1.${region}.agiliumtrade.ai/users/current/accounts/${riskConfig.metaApiAccountId}/account-information`, {
          headers: { 'auth-token': riskConfig.metaApiToken }
        });
        
        if (res.ok) {
          const data = await res.json();
          setAccountState(prev => ({
            ...prev,
            balance: data.balance || prev.balance,
            equity: data.equity || prev.equity,
            freeMargin: data.freeMargin || prev.freeMargin,
            marginLevelPct: data.marginLevel || prev.marginLevelPct,
            broker: data.broker || prev.broker,
            server: data.server || prev.server,
            currency: data.currency || prev.currency,
            accountNumber: data.login?.toString() || prev.accountNumber,
            isConnected: true
          }));
          if (onLogAdd && !interval) onLogAdd(`Données MetaApi synchronisées avec succès (${region}).`, 'SUCCESS');
        } else {
          const errText = await res.text();
          console.error("MetaApi HTTP Error:", res.status, errText);
          if (onLogAdd) onLogAdd(`Erreur MetaApi Client (${res.status}): ${errText.substring(0, 50)}`, 'ERROR');
        }
      } catch (e: any) {
         console.error("MetaApi Fetch Error:", e);
         if (onLogAdd) onLogAdd(`Échec de connexion MetaApi: ${e.message}`, 'ERROR');
      }
    };

    if (!riskConfig?.useLocalBridge && riskConfig?.metaApiToken && riskConfig?.metaApiAccountId) {
      if (onLogAdd) onLogAdd('Connexion à MetaApi initiée...', 'INFO');
      fetchMetaApi();
      interval = setInterval(fetchMetaApi, 5000); // Polling every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [riskConfig?.useLocalBridge, riskConfig?.metaApiToken, riskConfig?.metaApiAccountId, setAccountState]);

  // Local Python Bridge Data Fetcher
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const fetchLocalBridge = async () => {
      if (!riskConfig?.useLocalBridge || !riskConfig?.localBridgeIp) return;
      
      try {
        let ip = riskConfig.localBridgeIp;
        // ensure format has http://
        if (!ip.startsWith('http://') && !ip.startsWith('https://')) {
          ip = 'http://' + ip;
        }

        const res = await fetch(`${ip}/account-information`);
        
        if (res.ok) {
          const data = await res.json();
          setAccountState(prev => ({
            ...prev,
            balance: data.balance || prev.balance,
            equity: data.equity || prev.equity,
            freeMargin: data.freeMargin || prev.freeMargin,
            marginLevelPct: data.marginLevel || prev.marginLevelPct,
            broker: data.broker || prev.broker,
            server: data.server || prev.server,
            currency: data.currency || prev.currency,
            accountNumber: data.login?.toString() || prev.accountNumber,
            isConnected: true
          }));
          
          if (onLogAdd && !interval) onLogAdd(`Connecté au Local Bridge MT5 avec succès.`, 'SUCCESS');
          
          // --- AI ML Prediction Fetch ---
          try {
            const mlStart = performance.now();
            const predRes = await fetch(`${ip}/predict?symbol=EURUSD`);
            if (predRes.ok) {
              const predData = await predRes.json();
              const mlEnd = performance.now();
              setMlStats(prev => ({
                ...prev,
                inferenceTimeMs: Number((mlEnd - mlStart).toFixed(1)),
                lastRetrained: new Date().toLocaleTimeString(),
                currentSignal: {
                  ...prev.currentSignal,
                  symbol: 'EURUSD',
                  direction: predData.signal,
                  confidence: predData.confidence,
                  features: [
                    { name: predData.reason || 'Analyse Technique MT5', impact: 0.40 },
                    ...prev.currentSignal.features.slice(0, 5)
                  ]
                }
              }));
            }
          } catch (e) {
            console.error("ML Predict Error:", e);
          }
          // ------------------------------
          
        } else {
          const errText = await res.text();
          if (onLogAdd) onLogAdd(`Erreur Local Bridge (${res.status}): ${errText.substring(0, 50)}`, 'ERROR');
        }
      } catch (e: any) {
         if (onLogAdd) onLogAdd(`Échec de connexion Local Bridge: ${e.message}`, 'ERROR');
      }
    };

    if (riskConfig?.useLocalBridge && riskConfig?.localBridgeIp) {
      if (onLogAdd) onLogAdd('Connexion au Serveur Local Python initiée...', 'INFO');
      fetchLocalBridge();
      interval = setInterval(fetchLocalBridge, 5000); // Polling every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [riskConfig?.useLocalBridge, riskConfig?.localBridgeIp, setAccountState]);

  // Auto-reconnection loop with exponential backoff (for simulator / base)
  useEffect(() => {
    if (riskConfig?.metaApiToken || riskConfig?.useLocalBridge) return; // Disable simulator logic if using real API or local bridge
    
    if (accountState.isConnected) {
      if (timerRef.current) clearInterval(timerRef.current);
      setReconnectionState(prev => ({
        ...prev,
        isReconnecting: false,
        attempt: 0,
        progressPct: 0
      }));
      return;
    }

    // If disconnected, handle backoff loop
    let currentAttempt = reconnectionState.attempt || 1;
    const delay = getBackoffDelay(currentAttempt);
    currentDelayRef.current = delay;
    startTimeRef.current = Date.now();

    setReconnectionState(prev => ({
      ...prev,
      isReconnecting: true,
      attempt: currentAttempt,
      backoffDelayMs: delay,
      remainingMs: delay,
      progressPct: 0,
      nextAttemptInSec: Number((delay / 1000).toFixed(1))
    }));

    if (onLogAdd && currentAttempt === 1) {
      onLogAdd(`Démarrage du protocole de reconnexion automatique (Backoff Exponentiel #1, ${delay / 1000}s)...`, 'WARNING');
    }

    // Interval to update smooth progress bar
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, delay - elapsed);
      const progress = Math.min(100, (elapsed / delay) * 100);

      setReconnectionState(prev => ({
        ...prev,
        remainingMs: remaining,
        progressPct: progress,
        nextAttemptInSec: Number((remaining / 1000).toFixed(1))
      }));

      // When countdown reaches zero, attempt connection!
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);

        // Determine if attempt succeeds (e.g., attempt >= 2 will succeed for smooth demo)
        const isSuccess = currentAttempt >= 2 || Math.random() < 0.3;

        if (isSuccess) {
          setAccountState(prev => ({
            ...prev,
            isConnected: true,
            pingMs: Math.floor(12 + Math.random() * 6)
          }));

          setReconnectionState(prev => ({
            ...prev,
            isReconnecting: false,
            attempt: 0,
            progressPct: 100
          }));

          if (onLogAdd) {
            onLogAdd(`Reconnexion réussie à la tentative #${currentAttempt}! Session ZeroMQ restaurée.`, 'SUCCESS');
          }
        } else {
          // Failed attempt, increment backoff for next attempt
          const nextAttempt = currentAttempt + 1;
          if (onLogAdd) {
            onLogAdd(`Échec tentative #${currentAttempt}. Passage à la tentative #${nextAttempt} avec délai augmenté.`, 'WARNING');
          }

          setReconnectionState(prev => ({
            ...prev,
            attempt: nextAttempt
          }));
        }
      }
    }, 60);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [accountState.isConnected, reconnectionState.attempt, getBackoffDelay, setAccountState, onLogAdd, riskConfig?.metaApiToken]);

  // Keep reconnectionState synced into accountState.reconnectionState
  useEffect(() => {
    setAccountState(prev => {
      if (prev.reconnectionState?.attempt === reconnectionState.attempt &&
          prev.reconnectionState?.progressPct === reconnectionState.progressPct &&
          prev.reconnectionState?.isReconnecting === reconnectionState.isReconnecting) {
        return prev;
      }
      return {
        ...prev,
        reconnectionState
      };
    });
  }, [reconnectionState, setAccountState]);

  return {
    reconnectionState,
    forceReconnect,
    simulateDisconnect
  };
}
