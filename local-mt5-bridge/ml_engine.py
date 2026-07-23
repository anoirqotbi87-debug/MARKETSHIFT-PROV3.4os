import pandas as pd
import numpy as np
import MetaTrader5 as mt5
import xgboost as xgb
from sklearn.neural_network import MLPClassifier
from sklearn.ensemble import VotingClassifier
from sklearn.preprocessing import StandardScaler
from ta.momentum import RSIIndicator
from ta.trend import MACD, EMAIndicator
from ta.volatility import BollingerBands, AverageTrueRange
import logging
import threading
import os
import pickle
import time

class MLEngine:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.is_training = False
        self.supported_symbols = ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "BTCUSD", "US30"]
        self.timeframe = mt5.TIMEFRAME_M1
        self.logger = logging.getLogger("uvicorn.error")
        
        self.models_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
        os.makedirs(self.models_dir, exist_ok=True)

    def _get_data(self, symbol, timeframe, num_candles=2000):
        rates = mt5.copy_rates_from_pos(symbol, timeframe, 0, num_candles)
        if rates is None or len(rates) == 0:
            return None
        df = pd.DataFrame(rates)
        df['time'] = pd.to_datetime(df['time'], unit='s')
        df.set_index('time', inplace=True)
        return df

    def _add_features(self, df, symbol):
        # Add Technical Indicators
        df['rsi'] = RSIIndicator(df['close'], window=14).rsi()
        macd = MACD(df['close'])
        df['macd'] = macd.macd()
        df['macd_signal'] = macd.macd_signal()
        df['atr'] = AverageTrueRange(df['high'], df['low'], df['close'], window=14).average_true_range()
        df['ema_50'] = EMAIndicator(df['close'], window=50).ema_indicator()
        df['ema_200'] = EMAIndicator(df['close'], window=200).ema_indicator()
        
        bb = BollingerBands(df['close'])
        df['bb_high'] = bb.bollinger_hband()
        df['bb_low'] = bb.bollinger_lband()
        
        # Price action features
        df['body'] = df['close'] - df['open']
        df['upper_shadow'] = df['high'] - df[['open', 'close']].max(axis=1)
        df['lower_shadow'] = df[['open', 'close']].min(axis=1) - df['low']
        
        # Returns
        df['returns'] = df['close'].pct_change()
        
        # --- SMART MONEY CONCEPTS (SMC) ---
        
        # 1. Fair Value Gaps (FVG)
        # Bullish FVG: Low of current candle is higher than High of candle t-2
        df['fvg_bullish'] = (df['low'] > df['high'].shift(2)).astype(int)
        # Bearish FVG: High of current candle is lower than Low of candle t-2
        df['fvg_bearish'] = (df['high'] < df['low'].shift(2)).astype(int)
        
        # 2. Order Blocks (OB)
        # Bullish OB: Last bearish candle before a strong bullish move (body > 1.5 * ATR)
        is_strong_bullish = (df['close'] - df['open']) > (1.5 * df['atr'])
        last_is_bearish = df['close'].shift(1) < df['open'].shift(1)
        df['ob_bullish'] = (is_strong_bullish & last_is_bearish).astype(int)
        
        # Bearish OB: Last bullish candle before a strong bearish move
        is_strong_bearish = (df['open'] - df['close']) > (1.5 * df['atr'])
        last_is_bullish = df['close'].shift(1) > df['open'].shift(1)
        df['ob_bearish'] = (is_strong_bearish & last_is_bullish).astype(int)
        
        # --- MULTI-TIMEFRAME (MTF) M15 TREND ---
        try:
            m15_df = self._get_data(symbol, mt5.TIMEFRAME_M15, num_candles=500)
            if m15_df is not None:
                m15_ema = EMAIndicator(m15_df['close'], window=50).ema_indicator()
                m15_trend = (m15_df['close'] > m15_ema).astype(int) # 1 if bullish, 0 if bearish
                m15_trend.name = 'mtf_trend_m15'
                
                # Map M15 trend to M1 df
                df['time_m15'] = df.index.floor('15min')
                # we need to make sure index of m15_trend is timezone naive or matches df
                df = df.join(m15_trend, on='time_m15', how='left')
                df['mtf_trend_m15'] = df['mtf_trend_m15'].ffill().fillna(0)
                df.drop(columns=['time_m15'], inplace=True)
            else:
                df['mtf_trend_m15'] = 0
        except Exception as e:
            self.logger.warning(f"Failed to fetch M15 for {symbol}, MTF trend disabled: {e}")
            df['mtf_trend_m15'] = 0

        # Target: 1 if next candle is UP, 0 if DOWN
        df['target'] = (df['close'].shift(-1) > df['close']).astype(int)
        
        df.dropna(inplace=True)
        return df

    def train_all(self):
        self.is_training = True
        self.logger.info("Starting background training for all symbols...")
        for symbol in self.supported_symbols:
            try:
                self.train_symbol(symbol)
            except Exception as e:
                self.logger.error(f"Failed to train {symbol}: {e}")
        self.is_training = False
        self.logger.info("Background training complete.")

    def train_symbol(self, symbol):
        model_path = os.path.join(self.models_dir, f"{symbol}_model.pkl")
        scaler_path = os.path.join(self.models_dir, f"{symbol}_scaler.pkl")
        
        # Check if we have a saved model that is less than 7 days old
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            file_age_days = (time.time() - os.path.getmtime(model_path)) / (24 * 3600)
            if file_age_days < 7.0:
                try:
                    with open(model_path, 'rb') as f:
                        self.models[symbol] = pickle.load(f)
                    with open(scaler_path, 'rb') as f:
                        self.scalers[symbol] = pickle.load(f)
                    self.logger.info(f"Loaded existing model for {symbol} (Age: {file_age_days:.1f} days). Skipping training.")
                    return
                except Exception as e:
                    self.logger.warning(f"Failed to load cached model for {symbol}: {e}. Retraining...")

        self.logger.info(f"Training ML models for {symbol} (M1 Scalping with SMC)...")
        df = self._get_data(symbol, self.timeframe, num_candles=2000)
        if df is None:
            raise ValueError(f"No data for {symbol} in MT5")
            
        df = self._add_features(df, symbol)
        
        features = [
            'rsi', 'macd', 'macd_signal', 'atr', 'ema_50', 'ema_200', 'bb_high', 'bb_low', 
            'body', 'upper_shadow', 'lower_shadow', 'returns',
            'fvg_bullish', 'fvg_bearish', 'ob_bullish', 'ob_bearish', 'mtf_trend_m15'
        ]
        
        X = df[features]
        y = df['target']
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # XGBoost
        xgb_model = xgb.XGBClassifier(n_estimators=100, max_depth=5, learning_rate=0.05, random_state=42)
        
        # MLP (Neural Network proxy)
        mlp_model = MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=500, random_state=42)
        
        # Ensemble
        ensemble = VotingClassifier(estimators=[
            ('xgb', xgb_model),
            ('mlp', mlp_model)
        ], voting='soft')
        
        ensemble.fit(X_scaled, y)
        
        self.models[symbol] = ensemble
        self.scalers[symbol] = scaler
        
        # Save to disk for next time
        try:
            with open(model_path, 'wb') as f:
                pickle.dump(ensemble, f)
            with open(scaler_path, 'wb') as f:
                pickle.dump(scaler, f)
            self.logger.info(f"Saved new model and scaler for {symbol} to disk.")
        except Exception as e:
            self.logger.error(f"Could not save model to disk: {e}")
        
        score = ensemble.score(X_scaled, y)
        self.logger.info(f"Successfully trained {symbol}. Accuracy on train set: {score:.2f}")

    def predict(self, symbol):
        if symbol not in self.models:
            return {"signal": "NEUTRAL", "confidence": 0, "reason": "Model not trained yet"}
            
        df = self._get_data(symbol, self.timeframe, num_candles=300)
        if df is None:
            return {"signal": "NEUTRAL", "confidence": 0, "reason": "Not enough data"}
            
        df = self._add_features(df, symbol)
        
        features = [
            'rsi', 'macd', 'macd_signal', 'atr', 'ema_50', 'ema_200', 'bb_high', 'bb_low', 
            'body', 'upper_shadow', 'lower_shadow', 'returns',
            'fvg_bullish', 'fvg_bearish', 'ob_bullish', 'ob_bearish', 'mtf_trend_m15'
        ]
        
        latest = df.iloc[-1:]
        X = latest[features]
        
        scaler = self.scalers[symbol]
        X_scaled = scaler.transform(X)
        
        model = self.models[symbol]
        probs = model.predict_proba(X_scaled)[0] # [prob_DOWN, prob_UP]
        
        prob_up = probs[1]
        
        if prob_up > 0.55:
            signal = "BUY"
            confidence = prob_up * 100
        elif prob_up < 0.45:
            signal = "SELL"
            confidence = (1 - prob_up) * 100
        else:
            signal = "NEUTRAL"
            confidence = max(prob_up, 1 - prob_up) * 100
            
        reason_parts = [f"RSI: {latest['rsi'].values[0]:.1f}"]
        if latest['fvg_bullish'].values[0] == 1: reason_parts.append("Bullish FVG")
        if latest['fvg_bearish'].values[0] == 1: reason_parts.append("Bearish FVG")
        if latest['ob_bullish'].values[0] == 1: reason_parts.append("Bullish OB")
        if latest['ob_bearish'].values[0] == 1: reason_parts.append("Bearish OB")
        if latest['mtf_trend_m15'].values[0] == 1: reason_parts.append("M15 Trend UP")
        else: reason_parts.append("M15 Trend DOWN")

        return {
            "signal": signal,
            "confidence": round(confidence, 1),
            "reason": " | ".join(reason_parts)
        }

    def start_background_training(self):
        thread = threading.Thread(target=self.train_all)
        thread.daemon = True
        thread.start()
