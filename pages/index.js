import { useState, useEffect } from 'react';
import Head from 'next/head';
import StockTracker from '../components/StockTracker';

const SUPPORTED_SYMBOLS = [
  {
    label: "Nifty 50",
    symbol: "^NSEI",
    type: "index"
  },
  {
    label: "BSE Sensex",
    symbol: "^BSESN",
    type: "index"
  },
  {
    label: "Bank Nifty",
    symbol: "^NSEBANK",
    type: "index"
  },
  {
    label: "Nifty IT",
    symbol: "^CNXIT",
    type: "index"
  },
  {
    label: "Reliance Industries",
    symbol: "RELIANCE.NS",
    type: "stock"
  },
  {
    label: "TCS",
    symbol: "TCS.NS",
    type: "stock"
  },
  {
    label: "HDFC Bank",
    symbol: "HDFCBANK.NS",
    type: "stock"
  },
  {
    label: "Infosys",
    symbol: "INFY.NS",
    type: "stock"
  }
];

export default function Home() {
  const [selectedSymbol, setSelectedSymbol] = useState(SUPPORTED_SYMBOLS[0]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSymbolChange = (e) => {
    const symbol = SUPPORTED_SYMBOLS.find(s => s.symbol === e.target.value);
    setSelectedSymbol(symbol);
  };

  if (!isClient) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Stock Tracker...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Live Stock & Index Tracker - Dynamic ATH</title>
        <meta name="description" content="Track live stock prices with dynamic All-Time High calculations and correction percentages" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#1f2937" />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Stock Tracker" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Stock Tracker" />
        
        {/* Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
      </Head>

      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">
            📈 Stock & Index Tracker
          </h1>
          <p className="app-subtitle">Live prices with dynamic ATH calculation</p>
          
          <div className="symbol-selector">
            <label htmlFor="symbol-select" className="symbol-label">
              Select Stock/Index:
            </label>
            <select 
              id="symbol-select"
              className="symbol-select" 
              value={selectedSymbol.symbol} 
              onChange={handleSymbolChange}
            >
              <optgroup label="Indices">
                {SUPPORTED_SYMBOLS.filter(s => s.type === 'index').map(symbol => (
                  <option key={symbol.symbol} value={symbol.symbol}>
                    {symbol.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Stocks">
                {SUPPORTED_SYMBOLS.filter(s => s.type === 'stock').map(symbol => (
                  <option key={symbol.symbol} value={symbol.symbol}>
                    {symbol.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </header>

        <main className="main-content">
          <StockTracker selectedSymbol={selectedSymbol} />
        </main>

        <footer className="app-footer">
          <p>© 2025 Live Stock Tracker • Real-time data with dynamic ATH</p>
        </footer>
      </div>
    </>
  );
}
