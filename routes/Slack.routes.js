const express = require("express");
const axios = require("axios");
const { SlackUser } = require("../modals/SlackUser.modals");
const slackRouter = express.Router();
const dotenv = require("dotenv");
const TaskDetails = require("../modals/TasksDetails.modals");
dotenv.config();
slackRouter.get("/slack/oauth_redirect", async (req, res) => {
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

slackRouter.post("/task/details/creation", async (req, res) => {
    const { email, title, description } = req.body;
  
    try {
      // Store the task in the database
      const newTask = new TaskDetails({
        title,
        description,
        email,
        access_token,
      });
  
      await newTask.save();
  
      // Find the user by email to get the stored webhook URL
      const slackUser = await SlackUser.findOne({ email });
      
      if (!slackUser) {
        return res.status(404).json({ message: "Slack user not found" });
      }
  
      const webhookUrl = slackUser.webhook_url;
  
      if (!webhookUrl) {
        return res.status(400).json({ message: "Webhook URL is missing for this user" });
      }
  
      // Send Slack notification using the retrieved webhookUrl
      await axios.post(webhookUrl, {
        text: `A new task has been created by Vijendra Chouhan: *${title}* \nDescription: ${
          description || "No description"
        }`,
      });
  
      // Return success message after both task creation and Slack notification
      res.status(201).json({
        message: "Task created successfully, and notification sent to Slack",
      });
    } catch (error) {
      console.error("Error creating task or sending Slack notification:", error);
      res.status(500).json({ message: "Failed to create task or send notification to Slack" });
    }
  });
  
module.exports = { slackRouter };
