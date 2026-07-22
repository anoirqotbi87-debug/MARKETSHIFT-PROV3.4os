import React, { useState, useEffect, useRef, useCallback, Dispatch, SetStateAction } from 'react';
import { MT5AccountState, ReconnectionState } from '../types';

interface UseMT5ConnectionOptions {
  baseDelayMs?: number;
  maxDelayMs?: number;
  maxAttempts?: number;
  onLogAdd?: (message: string, level?: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR') => void;
}

export function useMT5Connection(
  accountState: MT5AccountState,
  setAccountState: Dispatch<SetStateAction<MT5AccountState>>,
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

  // Auto-reconnection loop with exponential backoff
  useEffect(() => {
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
  }, [accountState.isConnected, reconnectionState.attempt, getBackoffDelay, setAccountState, onLogAdd]);

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
