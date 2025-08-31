export const INSTRUMENT_MAP = {
  NSEI: 256265,
  BSESN: 265,
  NSEBANK: 260105,
  CNXIT: 260105, // please verify token for IT
  RELIANCE: 738561,
  TCS: 2953217,
  HDFCBANK: 341249,
  INFY: 408065
};

export function getInstrumentToken(symbol) {
  return INSTRUMENT_MAP[symbol];
}

export function getInstrumentInfo(symbol) {
  // can expand more info if needed
  return {
    token: INSTRUMENT_MAP[symbol] || null,
    symbol
  };
}
