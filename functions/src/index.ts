import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const users_col = admin.firestore().collection("Users");

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

export const addUserDoc = functions
  .region("asia-southeast2")
  .auth.user()
  .onCreate((user) => {
    const email = user.email;
    const uid = user.uid;
    const data = {
      email: email,
      username: "undefined",
      firstname: "undefined",
      lastname: "undefined",
      gamesWon: 0,
      createdAt: admin.firestore.Timestamp.now(),
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

export const changeUserData = functions
  .region("asia-southeast2")
  .https.onCall((data, context) => {
    const auth = context.auth;
    if (!auth) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Function must be called when authenticated."
      );
    }
    const uid = auth.uid;
    let updateData: Record<string, any> = {
      updatedAt: admin.firestore.Timestamp.now(),
    };
    if (data.username) updateData.username = data.username;
    if (data.firstname) updateData.firstname = data.firstname;
    if (data.lastname) updateData.lastname = data.lastname;
    if (data.gamesWon) updateData.gamesWon = Number(data.gamesWon);
    return admin
      .firestore()
      .collection("Users")
      .doc(uid)
      .update(updateData)
      .catch((err) => {
        console.log("Error creating user", err);
      });
  });

export const getUserData = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    const uid: any = req.query.uid;
    if (!uid) {
      res.status(400).json({
        isOk: false,
        message: "No uid passed.",
      });
    }
    return users_col
      .doc(uid)
      .get()
      .then((doc) => {
        if (doc.exists) {
          res.status(200).json({
            isOk: true,
            userData: doc.data(),
          });
        } else {
          res.status(404).json({
            isOk: false,
            message: "No user found with given uid.",
          });
        }
      })
      .catch((err) => {
        console.log(err);
        res.json({
          isOk: false,
          message: "Fail to get user document.",
        });
      });
  });

export const getTopScorers = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    let numOfPlayers: any = req.query.numOfPlayers;
    if (!numOfPlayers) {
      res.status(400).json({
        isOk: false,
        message: "No numOfPlayers passed.",
      });
    }
    numOfPlayers = Number.parseInt(numOfPlayers);
    let topPlayers: any = [];
    return users_col
      .orderBy("gamesWon", "desc")
      .limit(numOfPlayers)
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          topPlayers.push(doc.data());
        });
      })
      .then(() => {
        res.status(200).json({
          isOk: true,
          topPlayers: topPlayers,
        });
      })
      .catch((err) => {
        console.log(err);
        res.status(404).json({
          isOk: false,
          message: "Query faield.",
        });
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
