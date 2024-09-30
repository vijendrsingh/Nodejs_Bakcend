const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const clickupRoutes = express.Router();
const axios = require("axios");
const { ClickUpUser } = require("../modals/ClickUpUser.modal");
const { ClickUpTask } = require("../modals/ClickUpTask.modal");

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
    const teamResponse = await axios.get(
      "https://api.clickup.com/api/v2/team",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    console.log(teamResponse, "team getting ");
    const teams = teamResponse.data.teams;
    const teamId = teams[0].id; // Modify as needed
    console.log(teamId, "team id ");

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
    const spaceId = spaces[0].id; // Modify as needed
    console.log(spaceId, "space id");

    const folderResponse = await axios.get(
      `https://api.clickup.com/api/v2/space/${spaceId}/folder`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    console.log(folderResponse, "folder response");
    const folders = folderResponse.data.folders;

    let listId;
    if (folders.length > 0) {
      const folderId = folders[0].id; // Modify as needed

      const listResponse = await axios.get(
        `https://api.clickup.com/api/v2/folder/${folderId}/list`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const lists = listResponse.data.lists;
      console.log(listResponse, "list response");
      listId = lists[0].id; // Modify as needed
    }

    console.log(listId, teamId, "list id");
    return { listId, teamId }; // Return both listId and teamId
  } catch (error) {
    console.error("Error fetching ClickUp List ID:", error);
    return null; // Optionally return null on error
  }
}




clickupRoutes.post("/create/task/clickup", async (req, res) => {
  const { title, description, email, assignees, priority, due_date } = req.body;

  // Validate request
  if (!title || !email) {
    return res.status(400).send("Title and email are required.");
  }


  
  try {
    const clickUpUser = await ClickUpUser.findOne({ email });
    if (!clickUpUser) {
      return res.status(404).send("User not found in ClickUp database.");
    }

    const { accessToken } = clickUpUser;
    const { listId, teamId } = await getClickUpListId(accessToken);

    // Create the task in ClickUp
    const taskResponse = await axios.post(
      `https://api.clickup.com/api/v2/list/${listId}/task?custom_task_ids=true&team_id=${teamId}`, // Include query parameters as needed
      {
        name: title,
        description: description || "", // optional
        assignees: assignees || [], // array of assignee IDs
        archived: false,
        tags: [], // Optional tags
        status: "Open", // Default status
        priority: priority || null, // Optional priority
        due_date: due_date || null, // Optional due date
        due_date_time: false,
        start_date: null, // Optional start date
        start_date_time: false,
        points: null, // Optional points
        notify_all: true, // Notify all users
        parent: null, // If creating a subtask
        links_to: null, // Linked tasks
        check_required_custom_fields: true, // Enforce required custom fields
        custom_fields: [], // Array of custom fields if needed
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const taskData = taskResponse.data;

    // Store the task details in your backend (MongoDB)
    const newTask = new ClickUpTask({
      taskId: taskData.id,
      name: taskData.name,
      description: taskData.description,
      email: email,
      taskUrl: `https://app.clickup.com/t/${taskData.id}`,
    });

    await newTask.save();

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
