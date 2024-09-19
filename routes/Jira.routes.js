const express = require("express");
const axios = require("axios");
const querystring = require("querystring");
const dotenv = require("dotenv");

dotenv.config();

const jiraRoutes = express.Router();

// Environment Variables
const JIRA_CLIENT_ID = process.env.JIRA_CLIENT_ID;
const JIRA_CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET;
const JIRA_REDIRECT_URI = process.env.JIRA_REDIRECT_URI;
const JIRA_AUTH_URL = "https://auth.atlassian.com/authorize";
const JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token";

// Authorization Route
jiraRoutes.get("/auth/jira", (req, res) => {
  const authUrl = `${JIRA_AUTH_URL}?audience=api.atlassian.com&client_id=${JIRA_CLIENT_ID}&scope=read%3Ame&redirect_uri=${JIRA_REDIRECT_URI}&response_type=code&prompt=consent`;
  res.redirect(authUrl);
});

// Callback Route
jiraRoutes.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  console.log(code, "I am getting the code");
  try {
    const response = await axios.post(
      JIRA_TOKEN_URL,
      querystring.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: JIRA_REDIRECT_URI,
        client_id: JIRA_CLIENT_ID,
        client_secret: JIRA_CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    console.log(response, "response after authentication to user to jira");
    const { access_token, refresh_token } = response.data;
    // You can store these tokens in a session or a database for later use

    res.json({ access_token, refresh_token });
  } catch (error) {
    console.error("Error fetching access token:", error);
    res.status(500).send("Authentication failed");
  }
});

module.exports = jiraRoutes;
