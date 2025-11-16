// Route Express permettant de rafraîchir un access_token Spotify à partir d'un refresh_token.
// À monter dans votre backend existant via `app.use(require('./refresh-token'))` par exemple.

const { URLSearchParams } = require("node:url");
const express = require("express");
const axios = require("axios");

const router = express.Router();

router.post("/refresh-token", async (req, res) => {
  const { refresh_token: refreshToken } = req.body || {};

  if (!refreshToken) {
    return res.status(400).json({ error: "Missing refresh_token" });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[refresh-token] Missing Spotify client credentials in environment variables.");
    return res
      .status(500)
      .json({ error: "Spotify client credentials are not configured on the server." });
  }

  const payload = new URLSearchParams();
  payload.append("grant_type", "refresh_token");
  payload.append("refresh_token", refreshToken);

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const { data } = await axios.post(
      "https://accounts.spotify.com/api/token",
      payload.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    if (!data?.access_token) {
      return res.status(502).json({ error: "Spotify did not return an access token." });
    }

    return res.json({ access_token: data.access_token });
  } catch (error) {
    console.error("[refresh-token] Spotify refresh failed:", error.response?.data || error.message);
    const status = error.response?.status ?? 500;
    return res.status(status).json({ error: "Unable to refresh Spotify token." });
  }
});

module.exports = router;
