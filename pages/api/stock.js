import axios from 'axios';
import KiteService from '../../lib/kite';
import { getInstrumentToken } from '../../lib/instruments';

const ATH_CACHE = new Map();
const PRICE_CACHE = new Map();
const ATH_CACHE_TIME = 24 * 60 * 60 * 1000;
const PRICE_CACHE_TIME = 30 * 1000;

function isMarketOpen() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 3600000);
  const day = ist.getDay();
  if(day === 0 || day === 6) return false;
  const minutes = ist.getHours() * 60 + ist.getMinutes();
  return minutes >= (9*60 + 15) && minutes <= (15*60 + 30);
}

async function fetchKiteHistoricalATH(symbol) {
  const cacheKey = 'ath_' + symbol;
  const cached = ATH_CACHE.get(cacheKey);
  if(cached && Date.now() - cached.ts < ATH_CACHE_TIME) return cached.data;

  try {
    const kite = new KiteService();
    const token = getInstrumentToken(symbol);
    if(!token) return null;

    const to = new Date();
    const from = new Date();
    from.setFullYear(to.getFullYear() - 5);

    const candles = await kite.getHistoricalData(token, from.toISOString().split('T')[0], to.toISOString().split('T')[0]);
    if(!candles?.length) return null;

    let athClose = 0;
    let athDate = null;
    for (const c of candles) {
      if (c.close && c.volume && c.close > athClose) {
        athClose = c.close;
        athDate = new Date(c.date);
      }
    }

    if(athClose > 0) {
      const data = {
        athPrice: Math.round(athClose * 100) / 100,
        athDate: athDate.toISOString().split('T')[0],
        athDateFormatted: athDate.toLocaleDateString('en-IN', { year:'numeric', month:'long', day:'numeric' })
      };
      ATH_CACHE.set(cacheKey, { data, ts: Date.now() });
      return data;
    }
  } catch (err) {
    console.error('Kite ATH fetch error:', err.message);
  }
  return null;
}

async function fetchKitePrice(symbol) {
  const cacheKey = 'price_' + symbol;
  const cached = PRICE_CACHE.get(cacheKey);
  if(cached && Date.now() - cached.ts < PRICE_CACHE_TIME) return cached.data;

  try {
    const kite = new KiteService();
    const token = getInstrumentToken(symbol);
    if(!token) return null;

    const fullSymbol = `NSE:${symbol}`;
    const quotes = await kite.getQuote([fullSymbol]);
    const quote = quotes[fullSymbol];
    if(!quote) return null;

    const price = {
      price: Math.round(quote.last_price * 100) / 100,
      previousClose: Math.round(quote.ohlc?.close * 100) / 100 || Math.round(quote.last_price * 100) / 100,
      change: Math.round((quote.last_price - (quote.ohlc?.close || quote.last_price)) * 100) / 100,
      changePercent: Math.round(((quote.last_price - (quote.ohlc?.close || quote.last_price)) / (quote.ohlc?.close || quote.last_price)) * 10000) / 100,
      dayHigh: Math.round((quote.ohlc?.high || quote.last_price) * 100) / 100,
      dayLow: Math.round((quote.ohlc?.low || quote.last_price) * 100) / 100,
      volume: quote.volume || 0,
      marketState: isMarketOpen() ? 'REGULAR' : 'CLOSED',
      currency: 'INR',
      symbol,
      timestamp: new Date().toISOString()
    };
    PRICE_CACHE.set(cacheKey, { data: price, ts: Date.now() });
    return price;
  } catch (err) {
    console.error('Kite price fetch error:', err.message);
    return null;
  }
}

export default async function handler(req,res) {
  if(req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { symbol } = req.query;
  if(!symbol) return res.status(400).json({ error: 'Missing symbol parameter' });

  try {
    const [priceData, athData] = await Promise.all([
      fetchKitePrice(symbol),
      fetchKiteHistoricalATH(symbol)
    ]);
    if(priceData) {
      res.status(200).json({ ...priceData, ...athData, isLive:true });
    } else {
      res.status(200).json({ error: 'Unable to fetch live data, please try again later.' });
    }
  } catch (e) {
    console.error('API handler error:', e.message);
    res.status(500).json({ error: 'Server error' });
  }
}
