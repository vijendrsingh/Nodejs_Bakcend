const express = require("express");

const clickupRoutes = express.Router();

clickupRoutes.get("/clickUp/callback", async (req, res) => {
  const { code } = req.query;
  console.log(req.query, "queries");
  console.log(code, "getting code");
  res.send("getting the code");
});

module.exports = { clickupRoutes };
