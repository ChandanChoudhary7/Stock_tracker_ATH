import axios from 'axios';

// Cache for ATH data (24 hours)
const ATH_CACHE = new Map();
const ATH_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Cache for current price data (30 seconds)
const PRICE_CACHE = new Map();
const PRICE_CACHE_DURATION = 30 * 1000; // 30 seconds

// Helper function to check if market is open (IST)
function isMarketOpen() {
  const now = new Date();
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const day = istTime.getDay();
  
  // Weekend check
  if (day === 0 || day === 6) return false;
  
  const currentMinutes = hours * 60 + minutes;
  const marketStart = 9 * 60 + 15; // 9:15 AM
  const marketEnd = 15 * 60 + 30;  // 3:30 PM
  
  return currentMinutes >= marketStart && currentMinutes <= marketEnd;
}

// Fetch historical data and calculate dynamic ATH based on closing prices
async function fetchDynamicATH(symbol) {
  const cacheKey = `ATH_${symbol}`;
  const cached = ATH_CACHE.get(cacheKey);
  const now = Date.now();

  // Check if cached data is still valid
  if (cached && now - cached.timestamp < ATH_CACHE_DURATION) {
    console.log(`📦 ATH Cache hit for ${symbol}`);
    return cached.data;
  }

  console.log(`🔍 Fetching historical data for ATH calculation: ${symbol}`);

  const endpoints = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=max&interval=1d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?range=max&interval=1d`
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://finance.yahoo.com/'
        }
      });

      if (response.data?.chart?.result?.[0]) {
        const result = response.data.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators?.quote?.[0];
        
        if (!quotes?.close || !quotes?.volume || !timestamps) {
          continue;
        }

        const closes = quotes.close;
        const volumes = quotes.volume;
        let athClose = 0;
        let athIndex = 0;

        // Calculate ATH based on highest closing price with positive volume
        closes.forEach((price, index) => {
          if (price !== null && volumes[index] > 0 && price > athClose) {
            athClose = price;
            athIndex = index;
          }
        });

        if (athClose > 0) {
          const athTimestamp = timestamps[athIndex] * 1000; // Convert to milliseconds
          const athDate = new Date(athTimestamp);

          const athData = {
            athPrice: Math.round(athClose * 100) / 100,
            athDate: athDate.toISOString().split('T')[0], // YYYY-MM-DD format
            athDateFormatted: athDate.toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          };

          // Cache the result
          ATH_CACHE.set(cacheKey, {
            data: athData,
            timestamp: now
          });

          console.log(`✅ ATH calculated for ${symbol}: ₹${athData.athPrice} on ${athData.athDateFormatted}`);
          return athData;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch ATH from ${endpoint}:`, error.message);
      continue;
    }
  }

  console.warn(`❌ Failed to calculate ATH for ${symbol}, returning fallback`);
  return null;
}

// Parse current price data from Yahoo Finance
function parseYahooResponse(data) {
  try {
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    
    const meta = result.meta;
    const price = meta.regularMarketPrice || meta.previousClose;
    const previousClose = meta.previousClose || meta.chartPreviousClose;
    
    if (!price || price <= 0) return null;
    
    return {
      price: Math.round(price * 100) / 100,
      previousClose: Math.round(previousClose * 100) / 100,
      change: Math.round((price - previousClose) * 100) / 100,
      changePercent: Math.round(((price - previousClose) / previousClose) * 10000) / 100,
      dayHigh: Math.round((meta.regularMarketDayHigh || price) * 100) / 100,
      dayLow: Math.round((meta.regularMarketDayLow || price) * 100) / 100,
      volume: meta.regularMarketVolume || 0,
      marketState: meta.marketState || 'UNKNOWN',
      currency: meta.currency || 'INR',
      symbol: meta.symbol,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error parsing Yahoo response:', error);
    return null;
  }
}

// Fetch current stock data with caching
async function fetchCurrentStockData(symbol) {
  const cacheKey = `PRICE_${symbol}`;
  const cached = PRICE_CACHE.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < PRICE_CACHE_DURATION) {
    console.log(`📦 Price cache hit for ${symbol}`);
    return cached.data;
  }

  const endpoints = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}`
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': 'https://finance.yahoo.com/'
        }
      });
      
      if (response.data?.chart) {
        const parsed = parseYahooResponse(response.data);
        if (parsed) {
          PRICE_CACHE.set(cacheKey, {
            data: parsed,
            timestamp: now
          });
          console.log(`✅ Current price fetched for ${symbol}: ₹${parsed.price}`);
          return parsed;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch current price from ${endpoint}:`, error.message);
      continue;
    }
  }
  return null;
}

// Generate fallback demo data
function generateDemoData(symbol) {
  const basePrice = symbol.includes('NSEI') ? 25000 : 
                   symbol.includes('BSESN') ? 82000 :
                   symbol.includes('BANK') ? 52000 :
                   symbol.includes('RELIANCE') ? 2800 :
                   symbol.includes('TCS') ? 4200 :
                   symbol.includes('HDFC') ? 1800 : 1000;
  
  const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
  const price = Math.round(basePrice * (1 + variation) * 100) / 100;
  const previousClose = Math.round(basePrice * 100) / 100;
  const change = Math.round((price - previousClose) * 100) / 100;
  const changePercent = Math.round((change / previousClose) * 10000) / 100;
  
  const athPrice = Math.round(price * 1.18 * 100) / 100;
  const athDate = new Date();
  athDate.setMonth(athDate.getMonth() - Math.floor(Math.random() * 24)); 
  
  return {
    price,
    previousClose,
    change,
    changePercent,
    dayHigh: Math.round(price * 1.01 * 100) / 100,
    dayLow: Math.round(price * 0.99 * 100) / 100,
    volume: Math.floor(Math.random() * 10000000),
    marketState: isMarketOpen() ? 'REGULAR' : 'CLOSED',
    currency: 'INR',
    symbol,
    timestamp: new Date().toISOString(),
    athPrice,
    athDate: athDate.toISOString().split('T')[0],
    athDateFormatted: athDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    isDemo: true
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { symbol } = req.query;
  
  if (!symbol) {
    return res.status(400).json({ error: 'Symbol parameter is required' });
  }
  
  console.log(`🔄 Processing request for symbol: ${symbol}`);
  
  try {
    const [currentData, athData] = await Promise.all([
      fetchCurrentStockData(symbol),
      fetchDynamicATH(symbol)
    ]);
    
    if (currentData) {
      const response = {
        ...currentData,
        ...(athData || {}),
        isLive: true
      };
      
      console.log(`✅ Sending live data for ${symbol}`);
      return res.status(200).json(response);
    }
    
    console.log(`⚠️ Live data failed, returning fallback demo for ${symbol}`);
    const demoData = generateDemoData(symbol);
    return res.status(200).json(demoData);
    
  } catch (error) {
    console.error(`💥 API Error for ${symbol}:`, error.message);
    const demoData = generateDemoData(symbol);
    return res.status(200).json(demoData);
  }
}
