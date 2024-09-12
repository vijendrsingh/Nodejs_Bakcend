const express = require("express");
const axios = require("axios");
const querystring = require("querystring");
const { LinearUser } = require("../modals/LinearUser.modals");
const linearRoutes = express.Router();
const dotenv = require("dotenv");
dotenv.config();
const { LinearClient } = require("@linear/sdk");

linearRoutes.get("/auth/linear", (req, res) => {
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
linearRoutes.get("/callback/auth/linear", async (req, res) => {
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

    const client = new LinearClient({
      accessToken: access_token,
    });
    console.log(client, "client info which is now autheticate ");
    const me = await client.viewer;

    const linearUser = new LinearUser({
      linearUserId: me.id,
      access_token: access_token,
      name: me.name,
      email: me.email,
    });

    await linearUser.save();
    console.log(linearUser, "users");
    res.send(`Your are authenticated now you can close this window!`);
  } catch (error) {
    console.error("Error during OAuth callback:", error);
    res.status(500).send("Failed to authenticate user.");
  }
});

linearRoutes.post("/create/task/linear", async (req, res) => {
  const { title, description, email } = req.body;

  // Validate the required fields
  if (!title || !email) {
    return res.status(400).send("Title and email are required.");
  }

  try {
    // Find the user in the Linear database using the email
    const linearUser = await LinearUser.findOne({ email });
    if (!linearUser) {
      return res.status(404).send("User not found in Linear database.");
    }

    const { access_token } = linearUser;

    // Create a new Linear client for this user
    const client = new LinearClient({
      accessToken: access_token,
    });

    // Get the user's teamId (assuming they have access to a team)
    const teams = await client.teams();
    // if (!teams || teams.nodes.length === 0) {
    //   return res.status(400).send("User has no team available.");
    // }
    console.log(teams,"users teams info")
    const teamId = teams.nodes[0].id; // You can select the first team or modify this logic
    console.log(teamId,"team id ")
    // Create a new task for the user
    const response = await axios.post(
      "https://api.linear.app/graphql",
      {
        query: `
          mutation {
            issueCreate(input: {
              title: "${title}",
              description: "${description || ""}",
              teamId: "${teamId}"
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
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { data } = response;
    console.log(data,"taks creation info")
    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    res.send(data.data.issueCreate.issue);
  } catch (error) {
    console.error("Error creating task for user:", error);
    res.status(500).send("Failed to create task for the user.");
  }
});


module.exports = { linearRoutes };



// linearRoutes.get("/get-teams", async (req, res) => {
//   const { accessToken } = req.query;

//   if (!accessToken) {
//     return res.status(400).send("Access token is required.");
//   }

//   try {
//     // Fetch teams from Linear API
//     const response = await axios.post(
//       "https://api.linear.app/graphql",
//       {
//         query: `
//             query {
//               teams {
//                 nodes {
//                   id
//                   name
//                 }
//               }
//             }
//           `,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     // Handle the response
//     const { data } = response;
//     console.log(data, "team id Data");
//     res.send(data.data.teams.nodes);
//   } catch (error) {
//     console.error("Error fetching teams:", error);
//     res.status(500).send("Failed to fetch teams.");
//   }
// });

// linearRoutes.post("/create-task", async (req, res) => {
//   const { accessToken, title, description, teamId } = req.body;

//   if (!accessToken || !title) {
//     return res.status(400).send("Access token and title are required.");
//   }

//   try {
//     const response = await axios.post(
//       "https://api.linear.app/graphql",
//       {
//         query: `
//             mutation {
//               issueCreate(input: {
//                 title: "${title}",
//                 description: "${description || ""}",
//                 teamId: "${teamId || ""}"
//               }) {
//                 success
//                 issue {
//                   id
//                   title
//                   description
//                 }
//               }
//             }
//           `,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     const { data } = response;
//     if (data.errors) {
//       throw new Error(data.errors[0].message);
//     }

//     res.send(data.data.issueCreate.issue);
//   } catch (error) {
//     console.error("Error creating task:", error);
//     res.status(500).send("Failed to create task.");
//   }
// });
