import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const usersCol = admin.firestore().collection("Users");

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
    return usersCol
      .doc(uid)
      .set(data)
      .catch((err) => {
        console.log("Error creating user", err);
      });
  });

//Required user to authenticate and data as object: username / firstname / lastname
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
    return usersCol
      .doc(uid)
      .update(updateData)
      .catch((err) => {
        console.log("Error creating user", err);
        throw new functions.https.HttpsError(
          "internal",
          "An error occurred while trying to update user data."
        );
      });
  });

//Increment user's gamesWon by specifying uid as query
export const incrementUserScore = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    const uid: any = req.query.uid;
    if (!uid) sendErrorMsg(400, "No uid passed", res);
    const increment = admin.firestore.FieldValue.increment(1);
    return usersCol
      .doc(uid)
      .update({ gamesWon: increment })
      .then(() => {
        res.status(200).json({
          isOk: true,
          message: "User's gamesWon incremented.",
        });
      })
      .catch((err) => {
        console.log(err);
        sendErrorMsg(404, "No user found with given uid.", res);
      });
  });

//Required uid as query
export const getUserData = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    const uid: any = req.query.uid;
    if (!uid) {
      sendErrorMsg(400, "No uid passed.", res);
    }
    return usersCol
      .doc(uid)
      .get()
      .then((doc) => {
        if (doc.exists) {
          res.status(200).json({
            isOk: true,
            userData: doc.data(),
          });
        } else {
          sendErrorMsg(404, "No user found with given uid.", res);
        }
      })
      .catch((err) => {
        console.log(err);
        sendErrorMsg(500, "Fail to get user document.", res);
      });
  });

//Require numOfPlayers as query
export const getTopScorers = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    let numOfPlayers: any = req.query.numOfPlayers;
    if (!numOfPlayers) {
      sendErrorMsg(400, "No numOfPlayers passed.", res);
    }
    numOfPlayers = Number.parseInt(numOfPlayers);
    let topPlayers: any = [];
    return usersCol
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
        sendErrorMsg(500, "Query failed.", res);
      });
  });

export const addChatMessage = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    const gameId: any = req.query.gameId;
    if (!gameId) sendErrorMsg(400, "No gameId passed.", res);
    const msg = req.body.message;
    if (!msg) sendErrorMsg(400, "No message passed.", res);
    const uid = req.body.uid ? req.body.uid : -1;
    const username = req.body.username ? req.body.username : "anonymous";
    const data = {
      uid: uid,
      username: username,
      message: msg,
      createdAt: admin.firestore.Timestamp.now(),
    };
    return admin
      .database()
      .ref()
      .child("games")
      .child(gameId)
      .push()
      .set(data)
      .then(() => {
        res.status(200).json({
          isOk: true,
          data: data,
        });
      })
      .catch((err) => {
        console.log(err);
        sendErrorMsg(500, "Error while adding message to database.", res);
      });
  });

function sendErrorMsg(errCode: number, msg: string, res: functions.Response) {
  res.status(errCode).json({
    isOk: false,
    message: msg,
  });
}

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
