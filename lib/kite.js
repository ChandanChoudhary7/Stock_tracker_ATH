import { KiteConnect } from "kiteconnect";

class KiteService {
  constructor() {
    this.apiKey = process.env.KITE_API_KEY;
    this.apiSecret = process.env.KITE_SECRET;
    this.accessToken = process.env.KITE_ACCESS_TOKEN;

    this.kite = new KiteConnect({ api_key: this.apiKey, debug: false });

    if (this.accessToken) {
      this.kite.setAccessToken(this.accessToken);
    } else {
      throw new Error("Missing Kite Connect Access Token");
    }
  }

  async getHistoricalData(instrumentToken, from, to, interval = "day") {
    return await this.kite.getHistoricalData(instrumentToken, interval, from, to);
  }

  async getQuote(instruments) {
    return await this.kite.getQuote(instruments);
  }
}

export default KiteService;
