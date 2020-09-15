import * as functions from 'firebase-functions';

const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

const admin = require('firebase-admin');
admin.initializeApp();

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

export const entries = functions.https.onRequest(app);
