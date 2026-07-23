from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import MetaTrader5 as mt5
from pydantic import BaseModel
import logging

from ml_engine import MLEngine

app = FastAPI(title="Local MT5 Bridge for MarketShift Pro")

# Global ML Engine Instance
ml_engine = MLEngine()

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

@app.on_event("shutdown")
def shutdown_event():
    mt5.shutdown()

@app.get("/account-information")
def get_account_information():
    account_info = mt5.account_info()
    if account_info is None:
        raise HTTPException(status_code=500, detail="Could not retrieve account info")
    
    # Return formatted info matching what the React app expects from MetaApi
    # React expects: balance, equity, freeMargin, marginLevel, broker, server, currency, login
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
        })
    return formatted_positions

@app.get("/predict")
def predict_signal(symbol: str = "EURUSD"):
    try:
        result = ml_engine.predict(symbol)
        return result
    except Exception as e:
        logging.error(f"Prediction error for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ping")
def ping():
    return {"status": "ok"}
