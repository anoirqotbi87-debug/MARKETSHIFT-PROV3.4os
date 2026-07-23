import MetaTrader5 as mt5
import threading
import time
import logging

class TradeEngine:
    def __init__(self):
        self.logger = logging.getLogger("uvicorn.error")
        self.trailing_stop_active = True
        self.trailing_step_points = 50 # 5 pips
        self.risk_percent = 0.02 # 2% risk

    def start_trailing_stop_daemon(self):
        def loop():
            while True:
                if self.trailing_stop_active:
                    self._process_trailing_stops()
                time.sleep(5)
                
        thread = threading.Thread(target=loop)
        thread.daemon = True
        thread.start()
        self.logger.info("Trailing stop daemon started.")

    def _process_trailing_stops(self):
        positions = mt5.positions_get()
        if positions is None:
            return
            
        for pos in positions:
            symbol_info = mt5.symbol_info(pos.symbol)
            if symbol_info is None:
                continue
                
            point = symbol_info.point
            
            # Simple trailing stop logic
            if pos.type == mt5.POSITION_TYPE_BUY:
                # If price moved up
                new_sl = pos.price_current - (self.trailing_step_points * point)
                # If current SL is lower than new calculated SL, move it up
                if pos.sl < new_sl and pos.price_current > pos.price_open + (self.trailing_step_points * point):
                    request = {
                        "action": mt5.TRADE_ACTION_SLTP,
                        "position": pos.ticket,
                        "symbol": pos.symbol,
                        "sl": new_sl,
                        "tp": pos.tp
                    }
                    mt5.order_send(request)
                    
            elif pos.type == mt5.POSITION_TYPE_SELL:
                new_sl = pos.price_current + (self.trailing_step_points * point)
                if (pos.sl > new_sl or pos.sl == 0.0) and pos.price_current < pos.price_open - (self.trailing_step_points * point):
                    request = {
                        "action": mt5.TRADE_ACTION_SLTP,
                        "position": pos.ticket,
                        "symbol": pos.symbol,
                        "sl": new_sl,
                        "tp": pos.tp
                    }
                    mt5.order_send(request)

    def calculate_lot_size(self, symbol):
        account_info = mt5.account_info()
        if account_info is None:
            return 0.01
            
        free_margin = account_info.margin_free
        # Use 2% of free margin
        risk_amount = free_margin * self.risk_percent
        
        # Determine margin required for 1 lot
        margin_per_lot = mt5.order_calc_margin(mt5.ORDER_TYPE_BUY, symbol, 1.0, mt5.symbol_info_tick(symbol).ask)
        if margin_per_lot is None or margin_per_lot == 0:
            return 0.01
            
        lots = risk_amount / margin_per_lot
        
        symbol_info = mt5.symbol_info(symbol)
        if symbol_info:
            # Round to volume_step
            step = symbol_info.volume_step
            lots = round(lots / step) * step
            lots = max(symbol_info.volume_min, min(lots, symbol_info.volume_max))
        else:
            lots = max(0.01, round(lots, 2))
            
        return float(round(lots, 2))

    def execute_trade(self, symbol, direction):
        symbol_info = mt5.symbol_info(symbol)
        if not symbol_info or not symbol_info.visible:
            if not mt5.symbol_select(symbol, True):
                raise ValueError(f"Symbol {symbol} not found")

        volume = self.calculate_lot_size(symbol)
        point = symbol_info.point
        tick = mt5.symbol_info_tick(symbol)
        
        # Example ATR based SL/TP - we will use fixed points for simplicity 
        # 10 pips SL, 20 pips TP
        sl_points = 100
        tp_points = 200

        if direction.upper() == 'BUY':
            order_type = mt5.ORDER_TYPE_BUY
            price = tick.ask
            sl = price - sl_points * point
            tp = price + tp_points * point
        else:
            order_type = mt5.ORDER_TYPE_SELL
            price = tick.bid
            sl = price + sl_points * point
            tp = price - tp_points * point

        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": volume,
            "type": order_type,
            "price": price,
            "sl": sl,
            "tp": tp,
            "deviation": 20,
            "magic": 234000,
            "comment": "MarketShift AI",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }

        result = mt5.order_send(request)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            raise Exception(f"Order failed: {result.comment} (Code: {result.retcode})")
            
        return {
            "ticket": result.order,
            "volume": result.volume,
            "price": result.price
        }

    def close_position(self, ticket):
        positions = mt5.positions_get(ticket=ticket)
        if not positions or len(positions) == 0:
            raise ValueError("Position not found")
            
        pos = positions[0]
        tick = mt5.symbol_info_tick(pos.symbol)
        
        if pos.type == mt5.POSITION_TYPE_BUY:
            order_type = mt5.ORDER_TYPE_SELL
            price = tick.bid
        else:
            order_type = mt5.ORDER_TYPE_BUY
            price = tick.ask
            
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": pos.symbol,
            "volume": pos.volume,
            "type": order_type,
            "position": pos.ticket,
            "price": price,
            "deviation": 20,
            "magic": 234000,
            "comment": "Close MarketShift",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        result = mt5.order_send(request)
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            raise Exception(f"Close failed: {result.comment} (Code: {result.retcode})")
            
        return {"status": "closed", "ticket": ticket}
