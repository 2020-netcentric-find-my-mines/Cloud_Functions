import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// import * as firebase from 'firebase';

admin.initializeApp();

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

export const addUserDoc = functions.region('asia-southeast2').auth.user().onCreate((user) => {
  const email = user.email;
  const uid = user.uid;
  const data = {
    email: email,
    username: "",
    firstName: "",
    lastName: "",
    gamesWon: 0,
    createdAt: admin.database.ServerValue.TIMESTAMP,
  };
  return admin
    .firestore()
    .collection("Users")
    .doc(uid)
    .set(data)
    .catch((err) => {
      console.log("Error creating user", err);
    });
});

// export const addMessage = functions.region('asia-southeast2').https.onRequest((req, res) => {
//   const name = req.body.name;
//   const message = req.body.message;
//   console.log(name, message);
//   res.status(200).json({
//     isOK: true,
//     name: name,
//     message: message,
//   });
// })
