const express = require("express");
const axios = require("axios");
const querystring = require("querystring");
const { LinearUser } = require("../modals/LinearUser.modals");
const linearRoutes = express.Router();

linearRoutes.get("auth/linear", (req, res) => {
  const authUrl = "https://linear.app/oauth/authorize";
  const params = querystring.stringify({
    client_id: process.env.LINEAR_CLIENT_ID,
    redirect_uri: process.env.LINEAR_REDIRECT_URI,
    response_type: "code",
    scope: "read write",
  });
  console.log(authUrl, "auth Url ");
  console.log(params, "params");
  // Redirect the user to Linear's authorization page
  res.redirect(`${authUrl}?${params}`);
});

// Step 2: Callback URL to capture authorization code
linearRoutes.get("callback/auth/linear", async (req, res) => {
  const { code } = req.query;
  console.log(code, "getting code");

  if (!code) {
    return res.status(400).send("Authorization code missing.");
  }

  try {
    // Step 3: Exchange authorization code for access token
    const tokenUrl = "https://api.linear.app/oauth/token";
    const tokenData = {
      grant_type: "authorization_code",
      code: code,
      redirect_uri: process.env.LINEAR_REDIRECT_URI,
      client_id: process.env.LINEAR_CLIENT_ID,
      client_secret: process.env.LINEAR_CLIENT_SECRET,
    };

    const tokenResponse = await axios.post(
      tokenUrl,
      querystring.stringify(tokenData),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    console.log(tokenResponse.data, "response after authenticating the user");

    // Step 4: Fetch user details from Linear API (GraphQL)
    const userResponse = await axios.post(
      "https://api.linear.app/graphql",
      {
        query: `
          query {
            viewer {
              id
              email
              name
              team {
                id
                name
              }
            }
          }`,
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(userResponse.data, "user info for user");
    const userInfo = userResponse.data.data.viewer;
    const { email, team } = userInfo;
    console.log(userInfo, "user information for email and team");

    // Save user info in the database
    const linearUser = new LinearUser({
      accessToken: access_token,
      refreshToken: refresh_token,
      email,
      teamId: team.id,
      teamName: team.name,
    });

    await linearUser.save();

    res.send(`User info stored for ${email}`);
  } catch (error) {
    console.error("Error during OAuth callback:", error);
    res.status(500).send("Failed to authenticate user.");
  }
});

linearRoutes.get("get-teams", async (req, res) => {
  const { accessToken } = req.query;

  if (!accessToken) {
    return res.status(400).send("Access token is required.");
  }

  try {
    // Fetch teams from Linear API
    const response = await axios.post(
      "https://api.linear.app/graphql",
      {
        query: `
            query {
              teams {
                nodes {
                  id
                  name
                }
              }
            }
          `,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Handle the response
    const { data } = response;
    console.log(data, "team id Data");
    res.send(data.data.teams.nodes);
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).send("Failed to fetch teams.");
  }
});

linearRoutes.post("create-task", async (req, res) => {
  const { accessToken, title, description, teamId } = req.body;

  if (!accessToken || !title) {
    return res.status(400).send("Access token and title are required.");
  }

  try {
    const response = await axios.post(
      "https://api.linear.app/graphql",
      {
        query: `
            mutation {
              issueCreate(input: {
                title: "${title}",
                description: "${description || ""}",
                teamId: "${teamId || ""}"
              }) {
                success
                issue {
                  id
                  title
                  description
                }
              }
            }
          `,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { data } = response;
    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    res.send(data.data.issueCreate.issue);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).send("Failed to create task.");
  }
});

module.exports = { linearRoutes };
