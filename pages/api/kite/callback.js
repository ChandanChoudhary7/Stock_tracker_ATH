import { KiteConnect } from "kiteconnect";

export default async function handler(req, res) {
  const apiKey = process.env.KITE_API_KEY;
  const apiSecret = process.env.KITE_SECRET;
  const request_token = req.query.request_token;

  if (!request_token) {
    res.status(400).send("Missing request_token");
    return;
  }

  const kite = new KiteConnect({ api_key: apiKey });
  try {
    const session = await kite.generateSession(request_token, apiSecret);
    const access_token = session.access_token;
    console.log("Access Token:", access_token);
    res.status(200).json({
      message: "Authentication successful",
      access_token,
      instructions: "Store this key in .env.local as KITE_ACCESS_TOKEN and restart server"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
