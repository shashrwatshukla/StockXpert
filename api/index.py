from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
# from fastapi.staticfiles import StaticFiles  # Removed for Vercel deployment
# from pathlib import Path  # Removed for Vercel deployment
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import timezone
import requests
import io
import datetime
from typing import List, Optional
from bs4 import BeautifulSoup
import json
import re

app = FastAPI(
    title="StockXpert ",
    description="A Stock Analysis Platform for Indian Markets",
    version="4.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_cache = {}
CACHE_TTL_SECONDS = 3600

def set_cache(key: str, data: dict):
    _cache[key] = {"timestamp": datetime.datetime.now(), "data": data}

def get_cache(key: str):
    if key in _cache:
        cache_entry = _cache[key]
        if (datetime.datetime.now() - cache_entry["timestamp"]).total_seconds() < CACHE_TTL_SECONDS:
            return cache_entry["data"]
    return None

def scrape_nse_data(symbol: str, start_date: str, end_date: str):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Referer': f'https://www.nseindia.com/get-quotes/equity?symbol={symbol}',
            'X-Requested-With': 'XMLHttpRequest'
        }
        
        session = requests.Session()
        page_url = f"https://www.nseindia.com/get-quotes/equity?symbol={symbol}"
        session.get(page_url, headers=headers, timeout=10)

        api_url = f"https://www.nseindia.com/api/historical/cm/equity?symbol={symbol}&series=[\"EQ\"]&from={start_date.strftime('%d-%m-%Y')}&to={end_date.strftime('%d-%m-%Y')}"
        response = session.get(api_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        df = pd.DataFrame(data['data'])
        
        df = df.rename(columns={
            'CH_TIMESTAMP': 'Date',
            'CH_OPENING_PRICE': 'Open',
            'CH_TRADE_HIGH_PRICE': 'High',
            'CH_TRADE_LOW_PRICE': 'Low',
            'CH_CLOSING_PRICE': 'Close',
            'CH_TOTAL_TRADED_QTY': 'Volume'
        })
        
        df['Date'] = pd.to_datetime(df['Date'])
        df = df[['Date', 'Open', 'High', 'Low', 'Close', 'Volume']]
        
        for col in ['Open', 'High', 'Low', 'Close', 'Volume']:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            
        return df.sort_values(by='Date').reset_index(drop=True)

    except Exception as e:
        print(f"NSE Scraping failed for {symbol}: {e}")
        return None

def calculate_bollinger_bands(df: pd.DataFrame, window=20, std_dev=2):
    df['BB_Mid'] = df['Close'].rolling(window=window).mean()
    df['BB_Std'] = df['Close'].rolling(window=window).std()
    df['BB_Upper'] = df['BB_Mid'] + (df['BB_Std'] * std_dev)
    df['BB_Lower'] = df['BB_Mid'] - (df['BB_Std'] * std_dev)
    return df

def calculate_atr(df: pd.DataFrame, window=14):
    df['High-Low'] = df['High'] - df['Low']
    df['High-PrevClose'] = np.abs(df['High'] - df['Close'].shift(1))
    df['Low-PrevClose'] = np.abs(df['Low'] - df['Close'].shift(1))
    df['TR'] = df[['High-Low', 'High-PrevClose', 'Low-PrevClose']].max(axis=1)
    df['ATR'] = df['TR'].rolling(window=window).mean()
    return df

def calculate_macd(df: pd.DataFrame, fast=12, slow=26, signal=9):
    df['EMA12'] = df['Close'].ewm(span=fast, adjust=False).mean()
    df['EMA26'] = df['Close'].ewm(span=slow, adjust=False).mean()
    df['MACD'] = df['EMA12'] - df['EMA26']
    df['Signal'] = df['MACD'].ewm(span=signal, adjust=False).mean()
    df['Histogram'] = df['MACD'] - df['Signal']
    return df

def calculate_rsi(df: pd.DataFrame, window=14):
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).fillna(0)
    loss = (-delta.where(delta < 0, 0)).fillna(0)
    
    avg_gain = gain.rolling(window=window, min_periods=1).mean()
    avg_loss = loss.rolling(window=window, min_periods=1).mean()
    
    rs = avg_gain / avg_loss
    df['RSI'] = 100 - (100 / (1 + rs))
    return df

@app.get("/api/symbols")
async def get_nse_symbols():
    cache_key = "nse_symbols"
    if cached := get_cache(cache_key): 
        return cached
        
    try:
        url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        df = pd.read_csv(io.StringIO(response.text))
        symbols = sorted([s for s in df['SYMBOL'].unique() if isinstance(s, str) and len(s) < 15])
        data = {"symbols": symbols}
        set_cache(cache_key, data)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch symbols: {e}")

@app.get("/api/stock-data/{symbol}")
async def get_stock_data(symbol: str, start_date: str, end_date: str):
    cache_key = f"stock_{symbol}_{start_date}_{end_date}"
    if cached := get_cache(cache_key):
        return cached

    try:
        # Parse dates and clamp to current date
        today = datetime.datetime.utcnow().date()
        start_dt = datetime.datetime.strptime(start_date, '%Y-%m-%d')
        end_dt = datetime.datetime.strptime(end_date, '%Y-%m-%d')
        
        # Ensure dates are not in future
        if start_dt.date() > today:
            start_dt = datetime.datetime.combine(today, datetime.time.min)
        if end_dt.date() > today:
            end_dt = datetime.datetime.combine(today, datetime.time.min)
        
        # Ensure start is before end
        if start_dt > end_dt:
            start_dt, end_dt = end_dt, start_dt

        hist_df = None
        info = {}

        # --- Primary Method: yfinance ---
        try:
            ticker = yf.Ticker(f"{symbol}.NS")
            hist_df = ticker.history(
                start=start_dt, 
                end=end_dt + datetime.timedelta(days=1),  # Include end date
                auto_adjust=False
            )
            if not hist_df.empty:
                info = ticker.info
        except Exception as e:
            print(f"yfinance failed for {symbol}: {e}")
            hist_df = None

        # --- Fallback Method: NSE Scraping ---
        if hist_df is None or hist_df.empty:
            print(f"Trying NSE scraping for {symbol}")
            hist_df = scrape_nse_data(symbol, start_dt, end_dt)
            if hist_df is None or hist_df.empty:
                # Try with wider date range
                wider_start = start_dt - datetime.timedelta(days=30)
                hist_df = scrape_nse_data(symbol, wider_start, end_dt)
                
        # If still no data, try direct Yahoo Finance download
        if hist_df is None or hist_df.empty:
            print(f"Trying direct download for {symbol}")
            try:
                data = yf.download(
                    f"{symbol}.NS",
                    start=start_dt,
                    end=end_dt + datetime.timedelta(days=1),
                    progress=False
                )
                if not data.empty:
                    hist_df = data
                    info = yf.Ticker(f"{symbol}.NS").info
            except Exception as e:
                print(f"Direct download failed: {e}")

        # Final fallback to last available data
        if hist_df is None or hist_df.empty:
            print(f"Fetching last available data for {symbol}")
            try:
                ticker = yf.Ticker(f"{symbol}.NS")
                hist_df = ticker.history(period="1y", auto_adjust=False)
                if not hist_df.empty:
                    info = ticker.info
            except:
                pass

        if hist_df is None or hist_df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"Could not fetch data for {symbol} from any source."
            )

        # Reset index if needed
        if not isinstance(hist_df.index, pd.DatetimeIndex):
            hist_df.reset_index(inplace=True)
            if 'Date' not in hist_df.columns and 'index' in hist_df.columns:
                hist_df.rename(columns={'index': 'Date'}, inplace=True)
        elif 'Date' not in hist_df.columns:
            hist_df.reset_index(inplace=True)
            
        # Ensure we have required columns
        required_cols = ['Date', 'Open', 'High', 'Low', 'Close']
        for col in required_cols:
            if col not in hist_df.columns:
                raise HTTPException(
                    status_code=500,
                    detail=f"Missing {col} column in data"
                )
                
        # Fill missing volumes
        if 'Volume' not in hist_df.columns:
            hist_df['Volume'] = 0

        # Calculate indicators
        hist_df = calculate_bollinger_bands(hist_df)
        hist_df = calculate_atr(hist_df)
        hist_df = calculate_macd(hist_df)
        hist_df = calculate_rsi(hist_df)

        # Format data
        hist_df = hist_df.replace({np.nan: None})
        history_records = hist_df.to_dict(orient='records')
        
        for record in history_records:
            if 'Date' in record and isinstance(record['Date'], (pd.Timestamp, datetime.datetime)):
                record['Date'] = record['Date'].strftime('%Y-%m-%d')

        data = {"history": history_records, "info": info}
        set_cache(cache_key, data)
        return data
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Server error: {str(e)}"
        )

@app.get("/api/batch-prices")
async def get_batch_prices(symbols: str = Query(...)):
    symbol_list = [s.strip().upper() for s in symbols.split(',')]
    prices = {}
    for symbol in symbol_list:
        try:
            ticker = yf.Ticker(f"{symbol}.NS")
            data = ticker.history(period="1d")
            if not data.empty:
                prices[symbol] = data['Close'].iloc[-1]
            else:
                prices[symbol] = "N/A"
        except:
            prices[symbol] = "N/A"
    return prices

@app.get("/api/similar-stocks/{symbol}")
async def get_similar_stocks(symbol: str):
    cache_key = f"similar_{symbol}"
    if cached := get_cache(cache_key): 
        return cached
        
    try:
        ticker = yf.Ticker(f"{symbol}.NS")
        info = ticker.info
        sector = info.get('sector', '')
        
        url = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        df = pd.read_csv(io.StringIO(response.text))
        
        similar_symbols = [s for s in df['SYMBOL'].unique() if s != symbol]
        similar = np.random.choice(similar_symbols, size=min(5, len(similar_symbols)), replace=False).tolist()
        
        similar_data = []
        for sym in similar:
            try:
                ticker = yf.Ticker(f"{sym}.NS")
                data = ticker.history(period="1d")
                price = data['Close'].iloc[-1] if not data.empty else "N/A"
            except:
                price = "N/A"
            similar_data.append({"symbol": sym, "price": price})
        
        result = {"sector": sector, "similar": similar_data}
        set_cache(cache_key, result)
        return result
    except Exception as e:
        return {"sector": "", "similar": [], "error": str(e)}

@app.get("/api/news/{symbol}")
async def get_stock_news(symbol: str):
    cache_key = f"news_{symbol}"
    if cached := get_cache(cache_key): 
        return cached
        
    try:
        url = f"https://www.moneycontrol.com/news/tags/{symbol.lower()}.html"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        news_items = []
        for item in soup.select('li.clearfix')[:5]:
            title_elem = item.select_one('h2 a')
            if not title_elem:
                continue
            title = title_elem.get_text(strip=True)
            link = title_elem['href']
            date_elem = item.select_one('.datetime')
            date = date_elem.get_text(strip=True) if date_elem else ""
            news_items.append({"title": title, "link": link, "date": date})
        
        result = {"news": news_items}
        set_cache(cache_key, result)
        return result
    except Exception as e:
        return {"news": [], "error": str(e)}

# Remove static file mounting for Vercel deployment
# Vercel will handle static file serving automatically
# BASE_DIR = Path(__file__).resolve().parent.parent
# PUBLIC_DIR = BASE_DIR / "public"
# app.mount("/", StaticFiles(directory=PUBLIC_DIR, html=True), name="static")

@app.get("/")
async def root():
    return {"message": "StockXpert API is running!"}