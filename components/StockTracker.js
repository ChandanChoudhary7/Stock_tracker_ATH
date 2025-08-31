import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const StockTracker = ({ selectedSymbol }) => {
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Auto-refresh timer
  const [refreshTimer, setRefreshTimer] = useState(null);
  const [nextRefresh, setNextRefresh] = useState(0);
  
  // Market status
  const [marketStatus, setMarketStatus] = useState('Unknown');
  
  // Check if market is open (client-side)
  const isMarketOpen = () => {
    const now = new Date();
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const day = istTime.getDay();
    
    if (day === 0 || day === 6) return false;
    
    const currentMinutes = hours * 60 + minutes;
    const marketStart = 9 * 60 + 15;
    const marketEnd = 15 * 60 + 30;
    
    return currentMinutes >= marketStart && currentMinutes <= marketEnd;
  };
  
  // Fetch stock data
  const fetchStockData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setIsRefreshing(true);
    setError('');
    
    try {
      console.log(`🔄 Fetching data for ${selectedSymbol.symbol}`);
      const response = await axios.get(`/api/stock?symbol=${encodeURIComponent(selectedSymbol.symbol)}`, {
        timeout: 15000
      });
      
      if (response.data) {
        setStockData(response.data);
        setLastUpdate(new Date());
        setMarketStatus(response.data.marketState === 'REGULAR' ? 'Open' : 'Closed');
        
        console.log('✅ Data fetched successfully:', response.data);
      } else {
        throw new Error('No data received');
      }
    } catch (err) {
      console.error('❌ Error fetching stock data:', err.message);
      setError(`Failed to fetch data: ${err.message}`);
      
      // Keep old data if available
      if (!stockData) {
        setStockData({
          price: 0,
          change: 0,
          changePercent: 0,
          previousClose: 0,
          dayHigh: 0,
          dayLow: 0,
          athPrice: 0,
          athDate: null,
          error: true
        });
      }
    } finally {
      if (showLoading) setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedSymbol, stockData]);
  
  // Manual refresh handler
  const handleManualRefresh = () => {
    fetchStockData(true);
  };
  
  // Setup auto-refresh
  useEffect(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
    
    const marketOpen = isMarketOpen();
    const refreshInterval = marketOpen ? 30000 : 300000; // 30s during market hours, 5min otherwise
    
    const timer = setInterval(() => {
      fetchStockData(false); // Auto-refresh without loading indicator
    }, refreshInterval);
    
    setRefreshTimer(timer);
    
    // Countdown timer
    const countdownTimer = setInterval(() => {
      setNextRefresh(prev => {
        if (prev <= 1) {
          return refreshInterval / 1000;
        }
        return prev - 1;
      });
    }, 1000);
    
    setNextRefresh(refreshInterval / 1000);
    
    return () => {
      if (timer) clearInterval(timer);
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [selectedSymbol, fetchStockData]);
  
  // Initial data fetch when symbol changes
  useEffect(() => {
    fetchStockData(true);
  }, [selectedSymbol, fetchStockData]);
  
  // Calculate correction from ATH
  const calculateCorrection = () => {
    if (!stockData || !stockData.athPrice) return null;
    
    const correctionPercent = ((stockData.price - stockData.athPrice) / stockData.athPrice) * 100;
    const pointsDiff = Math.abs(stockData.price - stockData.athPrice);
    
    return {
      percent: Math.round(correctionPercent * 100) / 100,
      points: Math.round(pointsDiff * 100) / 100,
      isBelow: correctionPercent < 0
    };
  };
  
  const correction = calculateCorrection();
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  // Format number
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };
  
  // Format volume
  const formatVolume = (volume) => {
    if (volume >= 10000000) {
      return `${(volume / 10000000).toFixed(1)}Cr`;
    } else if (volume >= 100000) {
      return `${(volume / 100000).toFixed(1)}L`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume?.toString() || '0';
  };
  
  if (loading && !stockData) {
    return (
      <div className="tracker-container loading">
        <div className="loading-spinner"></div>
        <p>Loading {selectedSymbol.label} data...</p>
      </div>
    );
  }
  
  return (
    <div className="tracker-container">
      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}
      
      <div className="stock-header">
        <div className="stock-info">
          <h2 className="stock-name">{selectedSymbol.label}</h2>
          <div className="stock-meta">
            <span className={`market-status ${marketStatus.toLowerCase()}`}>
              {marketStatus === 'Open' ? '🟢' : '🔴'} Market {marketStatus}
            </span>
            {stockData?.isDemo && (
              <span className="demo-badge">📊 Demo Data</span>
            )}
            {stockData?.isLive && (
              <span className="live-badge">🔴 Live Data</span>
            )}
          </div>
        </div>
        
        <div className="refresh-controls">
          <button 
            className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
            onClick={handleManualRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? '🔄' : '↻'} Refresh
          </button>
          <div className="next-refresh">
            Next: {nextRefresh}s
          </div>
        </div>
      </div>
      
      {stockData && (
        <>
          <div className="price-section">
            <div className="current-price">
              {formatCurrency(stockData.price)}
            </div>
            
            <div className={`price-change ${stockData.change >= 0 ? 'positive' : 'negative'}`}>
              <span className="change-amount">
                {stockData.change >= 0 ? '+' : ''}{formatCurrency(stockData.change)}
              </span>
              <span className="change-percent">
                ({stockData.change >= 0 ? '+' : ''}{stockData.changePercent}%)
              </span>
            </div>
          </div>
          
          {/* ATH Section */}
          {stockData.athPrice && (
            <div className="ath-section">
              <div className="ath-header">All-Time High</div>
              <div className="ath-price">
                {formatCurrency(stockData.athPrice)}
              </div>
              {stockData.athDateFormatted && (
                <div className="ath-date">
                  on {stockData.athDateFormatted}
                </div>
              )}
            </div>
          )}
          
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Previous Close</div>
              <div className="stat-value">{formatCurrency(stockData.previousClose)}</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-label">Day High</div>
              <div className="stat-value">{formatCurrency(stockData.dayHigh)}</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-label">Day Low</div>
              <div className="stat-value">{formatCurrency(stockData.dayLow)}</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-label">Volume</div>
              <div className="stat-value">{formatVolume(stockData.volume)}</div>
            </div>
          </div>
          
          {correction && (
            <div className="correction-section">
              <div className={`correction-card ${correction.isBelow ? 'below' : 'above'}`}>
                <div className="correction-header">
                  {correction.isBelow ? 'Below ATH' : 'Above ATH'}
                </div>
                <div className="correction-value">
                  {correction.percent}%
                </div>
                <div className="correction-detail">
                  {formatNumber(correction.points)} points {correction.isBelow ? 'below' : 'above'} ATH
                </div>
              </div>
            </div>
          )}
          
          <div className="update-info">
            {lastUpdate && (
              <p>
                Last updated: {lastUpdate.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StockTracker;
