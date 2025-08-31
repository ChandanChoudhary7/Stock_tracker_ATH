import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const StockTracker = ({ selectedSymbol }) => {
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTimer, setRefreshTimer] = useState(null);
  const [nextRefresh, setNextRefresh] = useState(0);
  const [marketStatus, setMarketStatus] = useState('Unknown');

  // Helpers:

  function isMarketOpen() {
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 3600000);
    const day = ist.getDay();
    if (day === 0 || day === 6) return false;
    const minutes = ist.getHours()*60 + ist.getMinutes();
    return minutes >= (9*60+15) && minutes <= (15*60+30);
  }

  // Fetch data:

  const fetchStockData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setIsRefreshing(true);
    setError('');
    try {
      const res = await axios.get(`/api/stock?symbol=${selectedSymbol.symbol}`, {
        timeout: 10000
      });
      if (res.data) {
        setStockData(res.data);
        setLastUpdate(new Date());
        setMarketStatus(res.data.marketState === 'REGULAR' ? 'Open' : 'Closed');
      } else {
        throw new Error('No data received');
      }
    } catch (err) {
      setError('Failed to load stock data: ' + err.message);
      if (!stockData) {
        setStockData({ error: true });
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedSymbol, stockData]);

  const handleRefreshClick = () => {
    fetchStockData(true);
  };

  // Auto refresh:

  useEffect(() => {
    fetchStockData(true);

    if (refreshTimer) clearInterval(refreshTimer);

    const open = isMarketOpen();
    const intervalMs = open ? 30000 : 300000; // 30s or 5 min

    const timer = setInterval(fetchStockData, intervalMs);
    setRefreshTimer(timer);

    let countdown = intervalMs / 1000;
    setNextRefresh(countdown);
    const countdownTimer = setInterval(() => {
      setNextRefresh((c) => (c <= 1 ? countdown : c -1));
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(countdownTimer);
    };
  }, [fetchStockData]);

  // Calculate correction and upside %:

  function calculateCorrections() {
    if (!stockData || !stockData.athPrice || stockData.error) return null;
    const price = stockData.price;
    const ath = stockData.athPrice;
    const diff = price - ath;
    const correctionPercent = ((diff) / ath)*100;
    const upsidePercent = ((ath - price) / price)*100;
    return {
      correctionPercent: Math.round(correctionPercent*100)/100,
      upsidePercent: Math.round(upsidePercent*100)/100,
      diffPoints: Math.round(Math.abs(diff)*100)/100,
      isBelow: correctionPercent < 0
    };
  }

  const corr = calculateCorrections();

  // Formatters:

  function formatCurrency(v) {
    if (v === null || v === undefined) return '-';
    return v.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatNumber(v) {
    return v?.toLocaleString('en-IN') || '-';
  }

  function formatVolume(v) {
    if (!v) return "0";
    if (v > 10000000) return (v / 10000000).toFixed(2) + " Cr";
    if (v > 100000) return (v / 100000).toFixed(2) + " L";
    if (v > 1000) return (v / 1000).toFixed(2) + " K";
    return v.toString();
  }

  if (loading && !stockData) {
    return (
      <div className="tracker-container loading">
        <div className="loading-spinner"/>
        <p>Loading data for {selectedSymbol.label}...</p>
      </div>
    );
  }

  return (
    <div className="tracker-container">
      {error && <div className="error-banner">⚠️ {error}</div>}

      <div className="stock-header">
        <div className="stock-info">
          <h2 className="stock-name">{selectedSymbol.label}</h2>
          <div className="stock-meta">
            <span className={`market-status ${marketStatus.toLowerCase()}`}>
              {marketStatus === 'Open' ? '🟢 Market Open' : '🔴 Market Closed'}
            </span>
            {stockData?.isLive && <span className="live-badge">🔴 Live Data</span>}
            {stockData?.isDemo && <span className="demo-badge">📊 Demo Data</span>}
          </div>
        </div>

        <div className="refresh-controls">
          <button 
            className={"refresh-btn " + (isRefreshing ? "refreshing" : "")} 
            onClick={handleRefreshClick}
            disabled={isRefreshing}
          >
            {isRefreshing ? "🔄 Refreshing..." : "↻ Refresh"}
          </button>
          <div className="next-refresh">
            Next update in {nextRefresh}s
          </div>
        </div>
      </div>

      {stockData && !stockData.error && (
        <>
        <div className="price-section">
          <div className="current-price">{formatCurrency(stockData.price)}</div>
          <div className={"price-change " + (stockData.change >= 0 ? "positive" : "negative")}>
            <span>{stockData.change >=0 ? "+" : ""}{formatCurrency(stockData.change)}</span>
            <span>({stockData.change >=0 ? "+" : ""}{stockData.changePercent}%)</span>
          </div>
        </div>

        <div className="ath-section">
          <div className="ath-header">All-Time High</div>
          <div className="ath-price">{formatCurrency(stockData.athPrice)}</div>
          {stockData.athDateFormatted &&
            <div className="ath-date">on {stockData.athDateFormatted}</div>
          }
        </div>

        <div className="stats-grid">
          <div className="stat-item"><strong>Previous Close</strong><br/>{formatCurrency(stockData.previousClose)}</div>
          <div className="stat-item"><strong>Day High</strong><br/>{formatCurrency(stockData.dayHigh)}</div>
          <div className="stat-item"><strong>Day Low</strong><br/>{formatCurrency(stockData.dayLow)}</div>
          <div className="stat-item"><strong>Volume</strong><br/>{formatVolume(stockData.volume)}</div>
        </div>

        {corr && (
          <div className="correction-section">
            <div className="corrections-grid">
              <div className={"correction-card " + (corr.isBelow ? "below" : "above")}>
                <div className="correction-header">{corr.isBelow ? "Below ATH" : "Above ATH"}</div>
                <div className="correction-value">{corr.correctionPercent}%</div>
                <div className="correction-detail">{formatNumber(corr.diffPoints)} points {corr.isBelow ? "below" : "above"} ATH</div>
              </div>

              {corr.isBelow ? (
                <div className="upside-card">
                  <div className="upside-header">Upside to ATH</div>
                  <div className="upside-value">+{corr.upsidePercent}%</div>
                  <div className="upside-detail">Potential gain to reach ATH</div>
                </div>
              ) : (
                <div className="ath-exceeded-card">
                  <div className="ath-exceeded-header">🎉 New High Territory 🎉</div>
                  <div className="ath-exceeded-detail">Current price exceeds ATH</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="update-info">
          <p>Last updated: {lastUpdate?.toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</p>
        </div>
        </>
      )}
    </div>
  );
};

export default StockTracker;
