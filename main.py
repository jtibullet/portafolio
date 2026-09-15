"""
Main Application Module

Entry point for the Streamlit quantitative portfolio application.
Coordinates UI and Data loading. No math calculations in Phase 1.
"""

import streamlit as st
from ui_components import render_sidebar
from data_loader import fetch_historical_data, fetch_exchange_rate

def main():
    st.set_page_config(page_title="Quant Portfolio Builder", layout="wide")
    
    st.title("Institutional Quantitative Portfolio")
    st.markdown("### Phase 1: Project Setup & Historical Data Extraction")

    # 1. Render Sidebar UI
    selected_tickers, selected_benchmark, horizon_years = render_sidebar()

    # 2. Fetch Exchange Rate
    with st.spinner("Fetching exchange rate..."):
        usd_clp_rate = fetch_exchange_rate('CLP=X')
        
    st.metric(label="Current USD/CLP Exchange Rate", value=f"${usd_clp_rate:,.2f}")

    # 3. Data Extraction Pipeline
    if not selected_tickers:
        st.warning("Please select at least one asset in the sidebar.")
        return

    with st.spinner(f"Fetching {horizon_years}-year historical data for {len(selected_tickers)} assets and {selected_benchmark}..."):
        df = fetch_historical_data(selected_tickers, selected_benchmark, horizon_years)

    # 4. Data Verification
    if not df.empty:
        st.success("Data extraction and date filtering completed successfully.")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Raw Data: Head")
            st.dataframe(df.head())
            
        with col2:
            st.subheader("Raw Data: Tail")
            st.dataframe(df.tail())
    else:
        st.error("Failed to load historical data. Please check the tickers and try again.")

if __name__ == "__main__":
    main()
