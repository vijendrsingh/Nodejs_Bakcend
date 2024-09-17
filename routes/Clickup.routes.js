const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const clickupRoutes = express.Router();
const axios = require("axios");
const { ClickUpUser } = require("../modals/ClickUpUser.modal");

clickupRoutes.get("/auth/callback/clickup", async (req, res) => {
  const { code } = req.query;
  console.log(req.query, "queries");

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
    console.log(tokenResponse, "response of the click up Oauth");

    const accessToken = tokenResponse.data.access_token;
    const refreshToken = tokenResponse.data.refresh_token;
    // Fetch user info
    const userInfoResponse = await axios.get(
      "https://api.clickup.com/api/v2/user",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    console.log(userInfoResponse, "user info of clickup");
    const userInfo = userInfoResponse.data.user;
    const email = userInfo.email;

    // Check if the user already exists
    let clickUpUser = await ClickUpUser.findOne({ email });

    if (clickUpUser) {
      // Update existing user details if they exist
      clickUpUser.accessToken = accessToken;
      clickUpUser.refreshToken = refreshToken;
      clickUpUser.userName = userInfo.username;
      await clickUpUser.save();
    } else {
      // Create a new user
      clickUpUser = new ClickUpUser({
        clickUpUserId: userInfo.id,
        email: userInfo.email,
        accessToken: accessToken,
        refreshToken: refreshToken,
        userName: userInfo.username,
      });
      await clickUpUser.save();
    }

    res.send(`You are authenticated. You can close this window now!`);
  } catch (error) {
    console.error("Error fetching token or user info:", error);
    res.status(500).send("Error fetching token or user info");
  }
});
async function getClickUpListId(accessToken) {
  try {
    // Step 1: Get Teams
    console.log(accessToken, "access token");
    const teamResponse = await axios.get(
      "https://api.clickup.com/api/v2/team",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    console.log(teamResponse, "team response");
    const teams = teamResponse.data.teams;
    const teamId = teams[0].id; // Assuming you're picking the first team, modify as needed.

    // Step 2: Get Spaces in Team
    const spaceResponse = await axios.get(
      `https://api.clickup.com/api/v2/team/${teamId}/space`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    console.log(spaceResponse, "space response");
    const spaces = spaceResponse.data.spaces;
    const spaceId = spaces[0].id; // Assuming you're picking the first space, modify as needed.

    // Step 3: Get Lists in Space (direct lists, if no folders)
    const listResponse = await axios.get(
      `https://api.clickup.com/api/v2/space/${spaceId}/list`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    console.log(listResponse, "list response");
    const lists = listResponse.data.lists;
    const listId = lists[0].id; // Assuming you're picking the first list, modify as needed.

    console.log("List ID:", listId);
    return listId;
  } catch (error) {
    console.error("Error fetching ClickUp List ID:", error);
  }
}

clickupRoutes.post("/create/task/clickup", async (req, res) => {
  const { title, description, email } = req.body;

  // Validate request
  if (!title || !email) {
    return res.status(400).send("Title and email are required.");
  }

  try {
    // Find the authenticated ClickUp user
    const clickUpUser = await ClickUpUser.findOne({ email });
    if (!clickUpUser) {
      return res.status(404).send("User not found in ClickUp database.");
    }

    const { accessToken } = clickUpUser;

    // Get the listId (from the previous step where we fetched the list)
    const listId = await getClickUpListId(accessToken); // Assuming you already have this function
    console.log(listId, "list id of clickup list");
    // Create the task in ClickUp
    const taskResponse = await axios.post(
      `https://api.clickup.com/api/v2/list/${listId}/task`,
      {
        name: title,
        description: description || "", // optional description
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(taskResponse, "task creation response");
    const taskData = taskResponse.data;

    // Store the task details in your backend (MongoDB)
    const newTask = new ClickUpTask({
      taskId: taskData.id, // Task ID from ClickUp
      title: taskData.name, // Title of the task
      description: taskData.description, // Description of the task
      email: email, // User's email who created the task
      taskUrl: `https://app.clickup.com/t/${taskData.id}`,
    });

    await newTask.save(); // Save the task in the database

    // Send the task and task URL back to the frontend
    res.send({
      task: newTask,
      taskUrl: `https://app.clickup.com/t/${taskData.id}`,
      message: "Task successfully created and saved in the database.",
    });
  } catch (error) {
    console.error("Error creating task or saving in the backend:", error);
    res.status(500).send("Failed to create task or save task details.");
  }
});

module.exports = { clickupRoutes };
