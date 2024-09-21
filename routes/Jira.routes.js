const express = require("express");
const axios = require("axios");
const querystring = require("querystring");
const dotenv = require("dotenv");
const { JiraUser } = require("../modals/JiraUser.modals");
const { JiraTask } = require("../modals/JiraTask.modals");

dotenv.config();

const jiraRoutes = express.Router();

const JIRA_CLIENT_ID = process.env.JIRA_CLIENT_ID;
const JIRA_CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET;
const JIRA_REDIRECT_URI = process.env.JIRA_REDIRECT_URI;
const JIRA_AUTH_URL = "https://auth.atlassian.com/authorize";
const JIRA_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const JIRA_USER_INFO_URL = "https://api.atlassian.com/oauth/token/validate"; // Example URL for user info
//auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=Cs8tr5nDtynEROb6WORPQ2PTaS0cexxK&scope=read%3Ajira-work%20read%3Ajira-user%20write%3Ajira-work%20manage%3Ajira-webhook&redirect_uri=https%3A%2F%2Fnodejs-bakcend.onrender.com%2Fcallback%2Fjira&state=${YOUR_USER_BOUND_VALUE}&response_type=code&prompt=consent
// Authorization Route
https: jiraRoutes.get("/auth/jira", (req, res) => {
  const authUrl = `${JIRA_AUTH_URL}?audience=api.atlassian.com&client_id=${JIRA_CLIENT_ID}&scope=read%3Ajira-work%20read%3Ajira-user%20write%3Ajira-work%20manage%3Ajira-webhook&redirect_uri=https%3A%2F%2Fnodejs-bakcend.onrender.com%2Fcallback%2Fjira&response_type=code&prompt=consent`;
  res.redirect(authUrl);
});

// Callback Route
jiraRoutes.get("/callback/jira", async (req, res) => {
  const { code } = req.query;
  console.log(code, "I m getting the code");
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
    console.log(response, "getting from the auth");
    const { access_token } = response.data;
    console.log("Access token obtained: ", access_token);
    // Fetch user info
    const userInfoResponse = await axios.get("https://api.atlassian.com/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    console.log(userInfoResponse, "user info from the jira");

    let jiraUser = await JiraUser.findOne({
      email: userInfoResponse.data.email,
    });

    if (jiraUser) {
      // User exists, update their access token and other details
      jiraUser.access_token = access_token;
      jiraUser.jiraUserId = userInfoResponse.data.account_id;
      jiraUser.email = userInfoResponse.data.email;

      await jiraUser.save(); // Save the updated user details

      console.log(jiraUser, "updated user");
    } else {
      // User does not exist, create a new user
      jiraUser = new JiraUser({
        jiraUserId: userInfoResponse.data.account_id,
        access_token: access_token,
        email: userInfoResponse.data.email,
      });

      await jiraUser.save(); // Save the new user
      console.log(jiraUser, "new user");
    }
    res.json({
      message: "Authentication successful now you can close the winodw now!",
    });
  } catch (error) {
    console.error("Error fetching access token or user info:", error);
    res.status(500).send("Authentication failed");
  }
});

// Route to create a Jira task
jiraRoutes.post("/create-task/jira", async (req, res) => {
  const { email, summary, description } = req.body;

  try {
    // Step 1: Fetch the Jira user from the database
    const user = await JiraUser.findOne({ email });
    if (!user) {
      return res.status(400).send("User not found");
    }

    // Step 2: Fetch available Jira projects for the authenticated user
    const projectsResponse = await axios.get(
      "https://cleankoding-team-r3s9eq79.atlassian.net/rest/api/3/project",
      {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(projectsResponse, "project details response");

    const projects = projectsResponse.data;
    if (!projects || projects.length === 0) {
      return res.status(400).send("No projects found for the user");
    }

    // Step 3: Select a project key (e.g., the first project)
    const projectKey = projects[0].key; // You can change logic to select a project dynamically
    console.log(`Using project key: ${projectKey}`);

    // Step 4: Create a Jira task in the selected project
    const createTaskResponse = await axios.post(
      "https://cleankoding-team-r3s9eq79.atlassian.net/rest/api/3/issue",
      {
        fields: {
          project: {
            key: projectKey, // Use the fetched project key
          },
          summary,
          description,
          issuetype: {
            name: "Task", // This can be changed to other issue types
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(createTaskResponse, "creating task response");
    const { key: taskId } = createTaskResponse.data;

    // Step 5: Save task info to the database
    await JiraTask.updateOne(
      { taskId },
      {
        email,
        taskId,
        summary,
        description,
      },
      { upsert: true }
    );

    // Step 6: Respond with the task creation details
    res.json(createTaskResponse.data);
  } catch (error) {
    console.error("Error creating Jira task:", error);
    res.status(500).send("Failed to create task");
  }
});

module.exports = jiraRoutes;
