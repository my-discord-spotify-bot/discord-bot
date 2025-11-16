const axios = require("axios");
const { backendBaseUrl } = require("../config");

const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";

class SpotifyAccountNotLinkedError extends Error {
  constructor() {
    super("Spotify account is not linked to this Discord user.");
    this.name = "SpotifyAccountNotLinkedError";
  }
}

function buildAxiosConfig(requestConfig = {}, accessToken) {
  const config = {
    ...requestConfig,
    headers: {
      ...(requestConfig.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  };

  if (!config.baseURL && config.url && !/^https?:\/\//.test(config.url)) {
    config.baseURL = SPOTIFY_API_BASE_URL;
  }

  return config;
}

async function fetchLinkedTokens(userId) {
  const url = `${backendBaseUrl}/get-token?code=${encodeURIComponent(userId)}`;

  try {
    const { data } = await axios.get(url);

    if (!data || !data.access_token) {
      throw new SpotifyAccountNotLinkedError();
    }

    return data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new SpotifyAccountNotLinkedError();
    }

    throw error;
  }
}

async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new Error("Missing refresh token to refresh access token.");
  }

  const url = `${backendBaseUrl}/refresh-token`;
  const { data } = await axios.post(url, { refresh_token: refreshToken });

  if (!data || !data.access_token) {
    throw new Error("Backend did not return a refreshed access token.");
  }

  return data.access_token;
}

async function performSpotifyRequest(userId, requestConfig = {}) {
  const tokens = await fetchLinkedTokens(userId);

  try {
    return await axios(buildAxiosConfig(requestConfig, tokens.access_token));
  } catch (error) {
    if (error.response?.status === 401 && tokens.refresh_token) {
      const newAccessToken = await refreshAccessToken(tokens.refresh_token);
      return await axios(buildAxiosConfig(requestConfig, newAccessToken));
    }

    throw error;
  }
}

async function handleSpotifyError(
  interaction,
  error,
  fallbackMessage = "❌ Impossible de communiquer avec Spotify pour le moment."
) {
  if (error instanceof SpotifyAccountNotLinkedError) {
    return interaction.editReply({
      content:
        "Je n'ai pas trouvé de compte Spotify lié à ton profil. Utilise `/linkspotify` pour commencer.",
    });
  }

  if (error.response?.status === 404) {
    const reason = error.response.data?.error?.reason;

    if (reason === "NO_ACTIVE_DEVICE") {
      return interaction.editReply({
        content:
          "Spotify n'a trouvé aucun appareil actif. Lance la lecture sur un appareil puis réessaie.",
      });
    }
  }

  console.error("[spotify] API error:", error.response?.data || error.message);

  return interaction.editReply({
    content: fallbackMessage,
  });
}

module.exports = {
  performSpotifyRequest,
  fetchLinkedTokens,
  refreshAccessToken,
  handleSpotifyError,
  SpotifyAccountNotLinkedError,
};
