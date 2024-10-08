const express = require("express");
const axios = require("axios");
const querystring = require("querystring");
const { LinearUser } = require("../modals/LinearUser.modals");
const linearRoutes = express.Router();
const dotenv = require("dotenv");
dotenv.config();
const { LinearClient } = require("@linear/sdk");
const { LinearUserTask } = require("../modals/LinearTask.modals");

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
    console.log(client, "client info which is now authenticated");

    const me = await client.viewer;

    // Check if the user already exists in the database
    let linearUser = await LinearUser.findOne({ linearUserId: me.id });
    const integrations = [{ integrationName: "Linear", integrationDetails: "User connected to Linear" }];
    if (linearUser) {
      // User exists, update their access token and other details
      linearUser.access_token = access_token;
      linearUser.name = me.name;
      linearUser.email = me.email;
      linearUser.integrations = integrations
      await linearUser.save(); // Save the updated user details
      
      console.log(linearUser, "updated user");
    } else {
      // User does not exist, create a new user
      linearUser = new LinearUser({
        linearUserId: me.id,
        access_token: access_token,
        name: me.name,
        email: me.email,
        integrations : integrations
      });

      await linearUser.save(); // Save the new user
      console.log(linearUser, "new user");
    }

    res.send("You are authenticated. You can close this window now!");
  } catch (error) {
    console.error("Error during OAuth callback:", error);
    res.status(500).send("Failed to authenticate user.");
  }
});

// Import the task model

linearRoutes.post("/create/task/linear", async (req, res) => {
  const { title, description, email } = req.body;

  if (!title || !email) {
    return res.status(400).send("Title and email are required.");
  }

  try {
    const linearUser = await LinearUser.findOne({ email });
    if (!linearUser) {
      return res.status(404).send("User not found in Linear database.");
    }

    const { access_token } = linearUser;
    const client = new LinearClient({
      accessToken: access_token,
    });

    const teams = await client.teams();
    if (!teams || teams.nodes.length === 0) {
      return res.status(400).send("User has no team available.");
    }

    const teamId = teams.nodes[0].id;

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
    if (!data || !data.data || !data.data.issueCreate.success) {
      return res.status(500).send("Failed to create task on Linear.");
    }

    const issue = data.data.issueCreate.issue;
    const issueUrl = `https://linear.app/${linearUser.workspaceSlug}/issue/${issue.id}`;
    console.log(issueUrl, "issue Url to that perticuluer task ");
    // Save the task in your MongoDB database
    const newTask = new LinearUserTask({
      title: issue.title,
      description: issue.description,
      email: email,
      url: issueUrl, // Save the URL to the task in your database
    });

    await newTask.save();

    // Send a response back with the task and URL
    res.send({
      linearTask: issue,
      taskUrl: issueUrl,
      message: "Task successfully created and saved in the database.",
    });
  } catch (error) {
    console.error("Error creating task for user:", error);
    res.status(500).send("Failed to create task for the user.");
  }
});



//remove the user linear authentication
linearRoutes.post("/remove/auth/linear", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send("Email is required to remove the integration.");
  }

  try {
    // Find the user in the database
    const linearUser = await LinearUser.findOne({ email });
    if (!linearUser) {
      return res.status(404).send("User not found.");
    }

    // Remove or clear out their Linear access token (and any other details)
    linearUser.access_token = null; 
    linearUser.integrations = linearUser.integrations.filter(integration => integration.integrationName !== "Linear");
    await linearUser.save(); // Save changes in the database

    res.send({
      message: "Linear integration removed successfully.",
    });
  } catch (error) {
    console.error("Error removing Linear integration:", error);
    res.status(500).send("Failed to remove Linear integration.");
  }
});


// Route to return user information (e.g., Linear access token, name, etc.)
linearRoutes.get("/linear/user-info", async (req, res) => {
  const { email } = req.query;
console.log(email,"email from the query")
  if (!email) {
    return res.status(400).send("Email is required to fetch user info.");
  }

  try {
    // Find the user in the database
    const linearUser = await LinearUser.findOne({ email });

    if (!linearUser) {
      return res.status(404).send("User not found.");
    }

    // Return user info (be mindful of what sensitive data you return)
    res.json({
      email: linearUser.email,
      name: linearUser.name,
      access_token: linearUser.access_token,
      integrations: linearUser.integrations
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).send("Failed to fetch user info.");
  }
});


linearRoutes.get("/get/linear/tasks", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).send("Email is required.");
  }

  try {
    // Find all tasks for this user
    const userTasks = await LinearUserTask.find({ email });

    if (!userTasks || userTasks.length === 0) {
      return res.status(404).send("No tasks found for this user.");
    }

    // Return both task details and URL
    const tasksWithUrls = userTasks.map((task) => ({
      title: task.title,      // Include task title or other identifiers
      url: task.url,          // The corresponding URL
      description: task.description, // Optionally include description
      // Add any other fields if necessary (e.g., task ID)
    }));

    res.json({ tasks: tasksWithUrls });
  } catch (error) {
    console.error("Error fetching tasks for user:", error);
    res.status(500).send("Failed to fetch tasks for user.");
  }
});



module.exports = { linearRoutes };
