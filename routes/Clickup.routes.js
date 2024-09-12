const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const clickupRoutes = express.Router();
const axios = require("axios");

clickupRoutes.get("/clickUp/callback", async (req, res) => {
  const { code } = req.query;
  console.log(req.query, "queries");
  console.log(code, "getting code");

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(
      "https://api.clickup.com/api/v2/oauth/token",
      {
        code,
        grant_type: "authorization_code",
        redirect_uri: process.env.CLICKUP_REDIRECT_URI,
        client_id: process.env.CLICKUP_CLIENT_ID,
        client_secret: process.env.CLICKUP_CLIENT_SECRET,
      }
    );
    console.log(tokenResponse, "respone for click up");
    const accessToken = tokenResponse.data.access_token;
    console.log(accessToken, "click up access token");
    // Fetch user info
    const userInfoResponse = await axios.get(
      "https://api.clickup.com/api/v2/user",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    console.log(userInfoResponse, "user details which now authenticated");
    const userInfo = userInfoResponse.data;

    res.send(`User Info: ${JSON.stringify(userInfo)}`);
  } catch (error) {
    console.error("Error fetching token or user info:", error);
    res.status(500).send("Error fetching token or user info");
  }
});

module.exports = { clickupRoutes };
