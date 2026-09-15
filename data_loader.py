"""
Data Loader Module
Handles all API extraction from Yahoo Finance.
Functions include detailed docstrings for inputs, outputs, and financial purpose.
"""
import streamlit as st
import yfinance as yf
import pandas as pd
import datetime

@st.cache_data(show_spinner=False)
def fetch_historical_data(tickers: list, benchmark: str, horizon_years: int) -> pd.DataFrame:
    """
    Fetches historical daily adjusted closing prices for selected assets and the benchmark.
    Retains NaN values for exact pairwise correlation matching with Excel.
    """
    if not tickers:
        st.info("No tickers provided. Please input valid tickers to proceed.")
        st.stop()

    all_symbols = list(set(tickers + [benchmark]))
    end_date = datetime.datetime.today()
    start_date = end_date - datetime.timedelta(days=365 * horizon_years)
    
    valid_data = {}
    
    # 1. Ticker Validation & API Safety
    for symbol in all_symbols:
        try:
            df = yf.download(symbol, start=start_date, end=end_date, progress=False)
            if df.empty or 'Adj Close' not in df.columns or df['Adj Close'].dropna().empty:
                st.warning(f"Warning: Data for '{symbol}' is invalid, missing, or delisted. It will be excluded from the analysis.")
            else:
                valid_data[symbol] = df['Adj Close'].squeeze()
        except Exception as e:
            st.warning(f"Warning: Failed to download '{symbol}' ({str(e)}). It will be excluded.")

    # 2. Minimum Data Threshold
    if not valid_data:
        st.info("No valid data could be retrieved. Please input valid tickers to proceed.")
        st.stop()
        
    # 3. Preserve Excel-Matched Math (CRITICAL)
    # Combine without any .dropna(), .ffill(), or .bfill() to ensure strict pairwise correlation later
    adj_close = pd.DataFrame(valid_data)
    
    if adj_close.shape[1] < 2:
        st.info("Insufficient valid assets remaining. At least two valid assets (including the benchmark) are required for correlation and Markowitz optimization.")
        st.stop()
        
    return adj_close