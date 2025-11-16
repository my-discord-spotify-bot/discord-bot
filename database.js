const axios = require("axios");

module.exports = {
  async get_account(userId) {
    try {
      const response = await axios.get(`${process.env.BACKEND_BASE_URL}/get-token?code=${encodeURIComponent(userId)}`);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération du compte:", error.message);
      return null;
    }
  },

  async update_account(userId, updates) {
    try {
      const response = await axios.post(`${process.env.BACKEND_BASE_URL}/update-account`, {
        userId,
        ...updates,
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du compte:", error.message);
      return null;
    }
  },
};
