const express = require("express");
const axios = require("axios");
const { SlackUser } = require("../modals/SlackUser.modals");
const slackRouter = express.Router();
const dotenv = require("dotenv")
dotenv.config()
slackRouter.get("slack/oauth_redirect", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Authorization code is missing");
  }
  console.log(code, "I am getting the code here !!!!!");
  try {
    // Exchange the authorization code for an access token
    const response = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      null,
      {
        params: {
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          code: code,
          redirect_uri: process.env.SLACK_REDIRECT_URI,
        },
      }
    );

    const { access_token, authed_user, team, incoming_webhook } = response.data;
    const { channel, url: webhook_url } = incoming_webhook;

    if (!access_token) {
      return res.status(400).send("Failed to obtain access token");
    }

    // Fetch user info to get the email
    const userInfoResponse = await axios.get(
      `https://slack.com/api/users.info?user=${authed_user.id}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const { user } = userInfoResponse.data;
    const userEmail = user.profile.email;
    console.log(userEmail, "user emails ");
    // Store the details in MongoDB
    const slackUser = new SlackUser({
      access_token,
      authed_user_id: authed_user.id,
      team_id: team.id,
      channel_id: channel,
      webhook_url,
      email: userEmail,
    });

    await slackUser.save();

    res.send("Authorization successful! You can now close this window.");
  } catch (error) {
    console.error("Error exchanging code for access token:", error);
    res.status(500).send("An error occurred during the authorization process");
  }
});

// Route to send a message to a Slack user
slackRouter.post("send-message", async (req, res) => {
  const { userId, message } = req.body;

  // const user = users[userId];
  // if (!user) {
  //   return res.status(404).send("User not found");
  // }

  try {
    await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: userId,
        text: message,
      },
      {
        headers: {
          Authorization: `Bearer ${access_token_one}`,
        },
      }
    );

    res.send("Message sent successfully");
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).send("Failed to send message");
  }
});

slackRouter.post("notify-task", async (req, res) => {
  const { title, description, webhookUrl } = req.body;

  if (!title || !webhookUrl) {
    return res.status(400).send("Task title and webhook URL are required.");
  }

  try {
    await axios.post(webhookUrl, {
      text: `A new task has been created: *${title}* \nDescription: ${
        description || "No description"
      }`,
    });

    res.send("Notification sent to Slack successfully.");
  } catch (error) {
    console.error("Error sending message to Slack:", error);
    res.status(500).send("Failed to send message to Slack.");
  }
});

slackRouter.post("task/details/creation", async (req, res) => {
  const { email, title, description, access_token } = req.body;

  // Validate that all required fields are provided
  if (!email || !title || !description || !access_token) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Store the task in the database
    const newTask = new TaskDetails({
      title,
      description,
      email: email,
      accessTokenGet: access_token,
    });

    await newTask.save();

    // Here, you can make use of the access token (for example, Slack API interaction)
    // For now, let's just return the created task and a success message

    res.status(201).json({
      message: "Task created successfully",
      task: newTask,
    });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
});

module.exports = { slackRouter };
