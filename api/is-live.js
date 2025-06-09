const fetch = require('node-fetch');

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAppToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
    grant_type: 'client_credentials'
  });
  const resp = await fetch(`https://id.twitch.tv/oauth2/token?${params}`);
  const { access_token, expires_in } = await resp.json();

  cachedToken = access_token;
  tokenExpiresAt = now + (expires_in - 60) * 1000; // refresh 1m early
  return access_token;
}

module.exports = async (req, res) => {
  try {
    const token = await getAppToken();
    const username = process.env.TWITCH_USERNAME; 
    const helix = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${username}`,
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${token}`
        }
      }
    ).then(r => r.json());

    const live = Array.isArray(helix.data) && helix.data.length > 0;
    res.json({ live });
  } catch (err) {
    console.error('Error checking Twitch live status:', err);
    res.status(500).json({ error: 'internal error' });
  }
};
