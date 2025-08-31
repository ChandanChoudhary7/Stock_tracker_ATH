import { useState, useEffect } from 'react';
import Head from 'next/head';
import StockTracker from '../components/StockTracker';

export const SUPPORTED_SYMBOLS = [
  { label: "Nifty 50", symbol: "NSEI", type: "index" },
  { label: "BSE Sensex", symbol: "BSESN", type: "index" },
  { label: "Bank Nifty", symbol: "NSEBANK", type: "index" },
  { label: "Nifty IT", symbol: "CNXIT", type: "index" },
  { label: "Reliance", symbol: "RELIANCE", type: "stock" },
  { label: "TCS", symbol: "TCS", type: "stock" },
  { label: "HDFC Bank", symbol: "HDFCBANK", type: "stock" },
  { label: "Infosys", symbol: "INFY", type: "stock" }
];

export default function Home() {
  const [selectedSymbol, setSelectedSymbol] = useState(SUPPORTED_SYMBOLS[0]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  function handleSymbolChange(e) {
    const symbol = SUPPORTED_SYMBOLS.find(s => s.symbol === e.target.value);
    if (symbol) setSelectedSymbol(symbol);
  }

  if (!isClient) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading Stock Tracker ...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Live Stock & Index Tracker</title>
        <meta name="description" content="Live stock and index tracking with dynamic ATH." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
      </Head>

      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">📈 Live Stock & Index Tracker</h1>
          <p className="app-subtitle">Real-time prices, volume, dynamic ATH and more</p>

          <div className="symbol-selector">
            <label htmlFor="symbol-select" className="symbol-label">Select Symbol</label>
            <select
              id="symbol-select"
              onChange={handleSymbolChange}
              value={selectedSymbol.symbol}
              className="symbol-select"
            >
              <optgroup label="Indices">
                {SUPPORTED_SYMBOLS.filter(s => s.type === "index").map(s => (
                  <option key={s.symbol} value={s.symbol}>{s.label}</option>
                ))}
              </optgroup>
              <optgroup label="Stocks">
                {SUPPORTED_SYMBOLS.filter(s => s.type === "stock").map(s => (
                  <option key={s.symbol} value={s.symbol}>{s.label}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </header>

        <main className="main-content">
          <StockTracker selectedSymbol={selectedSymbol} />
        </main>

        <footer className="app-footer">
          <p>© 2025 Live Stock Tracker - Powered by Kite Connect API</p>
        </footer>
      </div>
    </>
  );
}
