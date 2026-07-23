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

class MLEngine:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.is_training = False
        self.supported_symbols = ["EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "BTCUSD", "US30"]
        self.timeframe = mt5.TIMEFRAME_M1
        self.logger = logging.getLogger("uvicorn.error")

    def _get_data(self, symbol, num_candles=2000):
        rates = mt5.copy_rates_from_pos(symbol, self.timeframe, 0, num_candles)
        if rates is None or len(rates) == 0:
            return None
        df = pd.DataFrame(rates)
        df['time'] = pd.to_datetime(df['time'], unit='s')
        df.set_index('time', inplace=True)
        return df

    def _add_features(self, df):
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
        self.logger.info(f"Training ML models for {symbol} (M1 Scalping)...")
        df = self._get_data(symbol, num_candles=2000) # Reduced to 2000 to avoid No Data errors on M1
        if df is None:
            raise ValueError(f"No data for {symbol} in MT5")
            
        df = self._add_features(df)
        
        features = ['rsi', 'macd', 'macd_signal', 'atr', 'ema_50', 'ema_200', 'bb_high', 'bb_low', 'body', 'upper_shadow', 'lower_shadow', 'returns']
        
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
        
        score = ensemble.score(X_scaled, y)
        self.logger.info(f"Successfully trained {symbol}. Accuracy on train set: {score:.2f}")

    def predict(self, symbol):
        if symbol not in self.models:
            return {"signal": "NEUTRAL", "confidence": 0, "reason": "Model not trained yet"}
            
        df = self._get_data(symbol, num_candles=300)
        if df is None:
            return {"signal": "NEUTRAL", "confidence": 0, "reason": "Not enough data"}
            
        df = self._add_features(df)
        
        features = ['rsi', 'macd', 'macd_signal', 'atr', 'ema_50', 'ema_200', 'bb_high', 'bb_low', 'body', 'upper_shadow', 'lower_shadow', 'returns']
        
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
            
        return {
            "signal": signal,
            "confidence": round(confidence, 1),
            "reason": f"RSI: {latest['rsi'].values[0]:.1f} | MACD: {latest['macd'].values[0]:.4f}"
        }

    def start_background_training(self):
        thread = threading.Thread(target=self.train_all)
        thread.daemon = True
        thread.start()
