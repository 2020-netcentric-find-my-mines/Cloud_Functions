import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const usersCol = admin.firestore().collection("Users");
const gamesRef = admin.database().ref("games");

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

//Automatically add user documents in firestore once an account is created
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
      totalGamesWon: 0,
      gamesWonDay: 0,
      gamesWonWeek: 0,
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

//Increment user's games won by specifying uid as query
export const incrementUserScore = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    const uid: any = req.query.uid;
    if (!uid) sendErrorMsg(400, "No uid passed", res);
    const increment = admin.firestore.FieldValue.increment(1);
    return usersCol
      .doc(uid)
      .update({
        totalGamesWon: increment,
        gamesWonDay: increment,
        gamesWonWeek: increment,
        updatedAt: admin.firestore.Timestamp.now(),
      })
      .then(() => {
        res.status(200).json({
          isOk: true,
          message: "User's games won incremented.",
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

//Required numOfPlayers and timeRange (day / week / allTime) as query
export const getTopScorers = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    let numOfPlayers: any = req.query.numOfPlayers;
    if (!numOfPlayers) sendErrorMsg(400, "No numOfPlayers passed.", res);
    const timeRange: any = req.query.timeRange;
    if (!timeRange) sendErrorMsg(400, "No timeRange passed.", res);
    if (timeRange !== "day" && timeRange !== "week" && timeRange !== "allTime")
      sendErrorMsg(
        400,
        "timeRange passed is not day / week / month / allTime.",
        res
      );
    let orderByField = "totalGamesWon";
    if (timeRange === "day") orderByField = "gamesWonDay";
    else if (timeRange === "week") orderByField = "gamesWonWeek";
    numOfPlayers = Number.parseInt(numOfPlayers);
    let topPlayers: any = [];
    return usersCol
      .orderBy(orderByField, "desc")
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

//Required gameId as query and data with uid / username / message
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
    return gamesRef
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

//Required gameId as query
export const deleteGameChat = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    const gameId: any = req.query.gameId;
    if (!gameId) sendErrorMsg(400, "No gameId passed.", res);
    return gamesRef
      .child(gameId)
      .remove()
      .then(() => {
        res.status(200).json({
          isOk: true,
          message: "Game chat messages deleted",
          gameId: gameId,
        });
      })
      .catch((err) => {
        console.log(err);
        sendErrorMsg(404, "No game room found with given gameId.", res);
      });
  });

//Require timeRange (day / week) as query
export const resetAllUsersGamesWon = functions
  .region("asia-southeast2")
  .https.onRequest(async (req, res) => {
    const timeRange = req.query.timeRange;
    if (!timeRange) sendErrorMsg(400, "No timeRange passed.", res);
    if (timeRange !== "day" && timeRange !== "week")
      sendErrorMsg(400, "timeRange is not day / week.", res);
    const resetData: Record<string, any> = {};
    const resetField = timeRange === "day" ? "gamesWonDay" : "gamesWonWeek";
    resetData[resetField] = 0;
    const batch = admin.firestore().batch();
    await usersCol
      .get()
      .then((snapShot) => {
        snapShot.forEach((doc) => {
          batch.update(doc.ref, resetData);
        });
      })
      .catch((err) => {
        console.log(err);
        sendErrorMsg(500, "Error when adding update to batch,", res);
      });
    return batch
      .commit()
      .then(() => {
        res.status(200).json({
          isOk: true,
          message: resetField + " reset for all users.",
        });
      })
      .catch((err) => {
        sendErrorMsg(500, "Error while commiting batch", res);
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
