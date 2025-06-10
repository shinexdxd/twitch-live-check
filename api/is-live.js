const fetch = require('node-fetch');

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAppToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  const params = new URLSearchParams({
    client_id:     process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
    grant_type:    'client_credentials'
  });

  const resp = await fetch('https://id.twitch.tv/oauth2/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Twitch token error ${resp.status}: ${text}`);
  }

  const { access_token, expires_in } = await resp.json();
  cachedToken     = access_token;
  tokenExpiresAt  = now + (expires_in - 60) * 1000; // refresh 1m early
  return access_token;
}

module.exports = async (req, res) => {
  // 1) CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://shine.cool');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2) Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const token    = await getAppToken();
    const username = process.env.TWITCH_USERNAME;
    const helix    = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${username}`,
      {
        headers: {
          'Client-ID':     process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`
        }
      }
    ).then(r => r.json());

    res.json({ live: Array.isArray(helix.data) && helix.data.length > 0 });
  } catch (err) {
    console.error('🔥 Function error:', err);
    res.status(500).json({ error: err.message });
  }
};
