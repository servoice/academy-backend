"use strict";
require("dotenv").config();

const express = require("express");

const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dialogflow = require("@google-cloud/dialogflow");

const app = express();

app.use(helmet());

const corsOptions = {
  origin: 'https://servoice.net',
  optionsSuccessStatus: 200 
}

app.use(cors(corsOptions));

app.use(bodyParser.json());

app.use(morgan("combined"));

// send intent and return response
app.post("/intent", async (req, res) => {
  const data = req.body;
  const projectId = process.env.PROJECTID;
  const sessionId = data.session.conversationId;
  const query = data.userMessage.message;
  const languageCode = "en-US";
  const privateKey = process.env.PRIVATE_KEY;
  const clientEmail = process.env.CLIENT_EMAIL;

  const config = {
    credentials: {
      private_key: privateKey,
      client_email: clientEmail,
    },
  };

  const sessionClient = new dialogflow.SessionsClient(config);

  const sessionPath = sessionClient.projectAgentSessionPath(
    projectId,
    sessionId
  );

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: query,
        languageCode: languageCode,
      },
    },
  };

  const responses = await sessionClient.detectIntent(request);
  console.log(responses)
  const response = responses[0].queryResult.action;
  console.log("RESPONSE==",response);
  try {
    if (response === "input.unknown") {
      return res.json({
        botMessage: null, // null to skip to next step
        nextModuleNickname: "more.context", // to be asked one more time in the chat loop
        responseExpected: false, //webhook already in flow. Don't want users to get stuck in a loop
      });
    } else if (response === "academy.generalhelp") {
      return res.json({
        botMessage: responses[0].queryResult.fulfillmentText,
        //nextModuleNickname: "more.context", // not using here so user can ask another question
        responseExpected: true, //included small talk in loop as they may ask more silly questions
      });
    } else if (response.includes("smalltalk")) {
      // not the best way using includes but it works for the MVP
      return res.json({
        botMessage: responses[0].queryResult.fulfillmentText,
        //nextModuleNickname: "more.context", // not using here so user can ask another question
        responseExpected: true, //included small talk in loop as they may ask more silly questions
      });
    } else {
      return res.json({ botMessage: responses[0].queryResult.fulfillmentText });
    }
  } catch (e) {
    console.log(e);
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Internal Serverless Error");
});

module.exports = app;
