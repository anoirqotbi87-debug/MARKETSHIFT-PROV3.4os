from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import MetaTrader5 as mt5
from pydantic import BaseModel
import logging

import threading
import time
from datetime import datetime

from ml_engine import MLEngine
from trade_engine import TradeEngine

app = FastAPI(title="Local MT5 Bridge for MarketShift Pro")

# Global Instances
ml_engine = MLEngine()
trade_engine = TradeEngine()

# In-memory Logs
server_logs = []
def add_log(message, level="INFO"):
    log_entry = {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "level": level,
        "message": message
    }
    server_logs.insert(0, log_entry)
    if len(server_logs) > 100:
        server_logs.pop()
    logging.info(f"[{level}] {message}")

def auto_trade_daemon():
    add_log("Démarrage du Daemon Auto-Trading (M1 Scalping)...", "SUCCESS")
    symbols_to_trade = ["EURUSD", "GBPUSD", "BTCUSD"] # Focus on major ones that trained well
    while True:
        try:
            time.sleep(60) # M1 cycle
            if ml_engine.is_training:
                continue
            
            for symbol in symbols_to_trade:
                # Check if we already have a position open for this symbol
                positions = mt5.positions_get(symbol=symbol)
                if positions is not None and len(positions) > 0:
                    continue # Wait until current trade is closed
                    
                prediction = ml_engine.predict(symbol)
                signal = prediction.get("signal", "NEUTRAL")
                confidence = prediction.get("confidence", 0)
                
                if signal in ["BUY", "SELL"] and confidence > 75.0:
                    add_log(f"Cycle IA: Signal {signal} détecté sur {symbol} (Confiance: {confidence}%). Tentative d'exécution...", "INFO")
                    try:
                        res = trade_engine.execute_trade(symbol, signal)
                        add_log(f"✅ Trade Auto EXÉCUTÉ: {signal} {symbol} (Ticket: {res['ticket']})", "SUCCESS")
                    except Exception as e:
                        add_log(f"❌ Échec de l'Auto-Trade {symbol}: {str(e)}", "ERROR")
        except Exception as e:
            add_log(f"Erreur dans le daemon Auto-Trade: {str(e)}", "ERROR")
            time.sleep(10)

# Allow CORS for the React mobile app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    # Initialize connection to the MT5 terminal
    if not mt5.initialize():
        logging.error(f"initialize() failed, error code = {mt5.last_error()}")
        raise Exception("Failed to connect to MetaTrader 5 terminal. Is MT5 open?")
    logging.info("Connected to MetaTrader 5!")
    # Start ML Engine background training
    ml_engine.start_background_training()
    # Start Trade Engine background trailing stops
    trade_engine.start_trailing_stop_daemon()
    
    # Start Auto Trade Daemon
    at_thread = threading.Thread(target=auto_trade_daemon)
    at_thread.daemon = True
    at_thread.start()

@app.on_event("shutdown")
def shutdown_event():
    mt5.shutdown()

@app.get("/account-information")
def get_account_information():
    account_info = mt5.account_info()
    if account_info is None:
        raise HTTPException(status_code=500, detail="Could not retrieve account info")
    
    # Return formatted info matching what the React app expects from MetaApi
    return {
        "balance": account_info.balance,
        "equity": account_info.equity,
        "freeMargin": account_info.margin_free,
        "marginLevel": account_info.margin_level,
        "broker": account_info.company,
        "server": account_info.server,
        "currency": account_info.currency,
        "login": account_info.login,
        "name": account_info.name
    }

@app.get("/positions")
def get_positions():
    positions = mt5.positions_get()
    if positions is None:
        return []
    
    formatted_positions = []
    for pos in positions:
        formatted_positions.append({
            "ticket": pos.ticket,
            "symbol": pos.symbol,
            "type": "BUY" if pos.type == mt5.POSITION_TYPE_BUY else "SELL",
            "lots": pos.volume,
            "openPrice": pos.price_open,
            "currentPrice": pos.price_current,
            "pnl": pos.profit,
            "stopLoss": pos.sl,
            "takeProfit": pos.tp,
            "openTime": pos.time,
            "magicNumber": pos.magic
        })
    return formatted_positions

@app.get("/history")
def get_history():
    import datetime
    # Get last 24 hours of deals
    from_date = datetime.datetime.now() - datetime.timedelta(days=1)
    to_date = datetime.datetime.now()
    deals = mt5.history_deals_get(from_date, to_date)
    if deals is None:
        return []
        
    formatted_deals = []
    for deal in deals:
        if deal.entry == mt5.DEAL_ENTRY_OUT: # Only closed trades
            formatted_deals.append({
                "ticket": deal.ticket,
                "symbol": deal.symbol,
                "type": "BUY" if deal.type == mt5.DEAL_TYPE_BUY else "SELL",
                "lots": deal.volume,
                "openPrice": 0.0, # Deal OUT doesn't have open price easily accessible without order ticket
                "closePrice": deal.price,
                "pnl": deal.profit,
                "closeTime": deal.time,
                "magicNumber": deal.magic
            })
    return formatted_deals

class TradeRequest(BaseModel):
    symbol: str
    direction: str

class CloseRequest(BaseModel):
    ticket: int

@app.post("/trade")
def execute_trade(req: TradeRequest):
    try:
        res = trade_engine.execute_trade(req.symbol, req.direction)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/close")
def close_position(req: CloseRequest):
    try:
        res = trade_engine.close_position(req.ticket)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/predict")
def predict_signal(symbol: str = "EURUSD"):
    try:
        result = ml_engine.predict(symbol)
        return result
    except Exception as e:
        logging.error(f"Prediction error for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/logs")
def get_logs():
    return server_logs

@app.get("/ping")
def ping():
    return {"status": "ok"}

