"""
UI Components Module

Handles the Streamlit sidebar and layout components.
"""

import streamlit as st

def render_sidebar():
    """
    Renders the Streamlit sidebar with inputs for assets, benchmark, and time horizon.

    Returns:
        tuple: (selected_tickers, selected_benchmark, horizon_years)
    """
    st.sidebar.header("Portfolio Configuration")

    # Dynamic multiselect for assets (max 7)
    default_tickers = ['IAU', 'PLTR', 'EWY', 'ITA', 'SOXX', 'FDVV', 'EIS']
    
    selected_tickers = st.sidebar.multiselect(
        "Select Assets (Up to 7)",
        options=default_tickers + ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'SPY', 'QQQ'],
        default=default_tickers,
        max_selections=7
    )

    # Dropdown for Benchmark
    benchmarks = ['ACWI', 'SPY', 'QQQ', 'DIA']
    selected_benchmark = st.sidebar.selectbox(
        "Select Benchmark",
        options=benchmarks,
        index=0
    )

    # Radio button for Time Horizon
    horizon_mapping = {
        "1 Year": 1,
        "3 Years": 3,
        "5 Years": 5
    }
    selected_horizon_label = st.sidebar.radio(
        "Time Horizon",
        options=list(horizon_mapping.keys()),
        index=0
    )
    horizon_years = horizon_mapping[selected_horizon_label]

    return selected_tickers, selected_benchmark, horizon_years
