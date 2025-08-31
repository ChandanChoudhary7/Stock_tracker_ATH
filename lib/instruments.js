export const INSTRUMENT_MAP = {
  NSEI: 256265,
  BSESN: 265,
  NSEBANK: 260105,
  CNXIT: 260105, // Please verify token
  RELIANCE: 738561,
  TCS: 2953217,
  HDFCBANK: 341249,
  INFY: 408065
};

export function getInstrumentToken(symbol) {
  return INSTRUMENT_MAP[symbol];
}
