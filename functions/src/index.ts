import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const usersCol = admin.firestore().collection("Users");
const gamesRef = admin.database().ref("games");

// // Start writing Firebase Functions

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

//Required uid as query
export const deleteUserDoc = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    //Check if uid passed
    const uid: any = req.query.uid;
    if (!uid) sendStatusMsg(400, false, "No uid passed.", res);

    return usersCol
      .doc(uid)
      .delete()
      .then(() => {
        sendData(200, "uid", uid, res);
      })
      .catch((err) => {
        console.log(err);
        sendStatusMsg(404, false, "No user doc found with given uid.", res);
      });
  });

//Required user to authenticate and data as object: username / firstname / lastname
export const changeUserData = functions
  .region("asia-southeast2")
  .https.onCall(async (data, context) => {
    //Check if auth exists
    const auth = context.auth;
    if (!auth) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Function must be called when authenticated."
      );
    }

    const uid = auth.uid;
    const updateData: Record<string, any> = {
      updatedAt: admin.firestore.Timestamp.now(),
    };
    if (data.username) updateData.username = data.username;
    if (data.firstname) updateData.firstname = data.firstname;
    if (data.lastname) updateData.lastname = data.lastname;

    await usersCol
      .doc(uid)
      .update(updateData)
      .catch((err) => {
        console.log("Error creating user", err);
        throw new functions.https.HttpsError(
          "internal",
          "An error occurred while trying to update user data."
        );
      });
    return { isOk: true, updatedData: updateData };
  });

//Increment user's games won by specifying uid as query
export const incrementUserScore = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    //Check if uid passed
    const uid: any = req.query.uid;
    if (!uid) sendStatusMsg(400, false, "No uid passed", res);

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
        sendStatusMsg(200, true, "User's games won incremented.", res);
      })
      .catch((err) => {
        console.log(err);
        sendStatusMsg(404, false, "No user found with given uid.", res);
      });
  });

//Required uid as query
export const getUserData = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    //Check if uid passed
    const uid: any = req.query.uid;
    if (!uid) {
      sendStatusMsg(400, false, "No uid passed.", res);
    }

    return usersCol
      .doc(uid)
      .get()
      .then((doc) => {
        if (doc.exists) {
          sendData(200, "userData", doc.data(), res);
        } else {
          sendStatusMsg(404, false, "No user found with given uid.", res);
        }
      })
      .catch((err) => {
        console.log(err);
        sendStatusMsg(500, false, "Fail to get user document.", res);
      });
  });

//Required numOfPlayers and timeRange (day / week / allTime) as query
export const getTopScorers = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    //Check if numOfPlayers passed
    let numOfPlayers: any = req.query.numOfPlayers;
    if (!numOfPlayers)
      sendStatusMsg(400, false, "No numOfPlayers passed.", res);
    if (Number(numOfPlayers) % 1 !== 0)
      sendStatusMsg(400, false, "numOfPlayers is not integer.", res);

    //Check if timeRange passed and in correct format
    const timeRange: any = req.query.timeRange;
    if (!timeRange) sendStatusMsg(400, false, "No timeRange passed.", res);
    if (timeRange !== "day" && timeRange !== "week" && timeRange !== "allTime")
      sendStatusMsg(
        400,
        false,
        "timeRange passed is not day / week / month / allTime.",
        res
      );

    let orderByField = "totalGamesWon";
    if (timeRange === "day") orderByField = "gamesWonDay";
    else if (timeRange === "week") orderByField = "gamesWonWeek";
    numOfPlayers = Number.parseInt(numOfPlayers);
    const topPlayers: any = [];

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
        sendData(200, "topPlayers", topPlayers, res);
      })
      .catch((err) => {
        console.log(err);
        sendStatusMsg(500, false, "Query failed.", res);
      });
  });

//Required gameId as query and data with uid / username / message
export const addChatMessage = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    //Check if gameId passed
    const gameId: any = req.query.gameId;
    if (!gameId) sendStatusMsg(400, false, "No gameId passed.", res);

    //Check if message passed
    const msg = req.body.message;
    if (!msg) sendStatusMsg(400, false, "No message passed.", res);

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
        sendData(200, "data", data, res);
      })
      .catch((err) => {
        console.log(err);
        sendStatusMsg(500, false, "Error while adding message.", res);
      });
  });

//Required gameId as query
export const deleteGameChat = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    //Check if gameId passed
    const gameId: any = req.query.gameId;
    if (!gameId) sendStatusMsg(400, false, "No gameId passed.", res);

    return gamesRef
      .child(gameId)
      .remove()
      .then(() => {
        sendData(200, "gameId", gameId, res, "Game chat messages deleted");
      })
      .catch((err) => {
        console.log(err);
        sendStatusMsg(404, false, "No game room found with given gameId.", res);
      });
  });

//Require timeRange (day / week) as query
export const resetAllUsersGamesWon = functions
  .region("asia-southeast2")
  .https.onRequest(async (req, res) => {
    //Check if timeRange passed and in correct format
    const timeRange = req.query.timeRange;
    if (!timeRange) sendStatusMsg(400, false, "No timeRange passed.", res);
    if (timeRange !== "day" && timeRange !== "week")
      sendStatusMsg(400, false, "timeRange is not day / week.", res);

    const resetData: Record<string, any> = {};
    const resetField = timeRange === "day" ? "gamesWonDay" : "gamesWonWeek";
    resetData[resetField] = 0;
    const batch = admin.firestore().batch();

    //Add tasks to batch
    await usersCol
      .get()
      .then((snapShot) => {
        snapShot.forEach((doc) => {
          batch.update(doc.ref, resetData);
        });
      })
      .catch((err) => {
        console.log(err);
        sendStatusMsg(500, false, "Error when adding update to batch,", res);
      });

    //Commit batch
    return batch
      .commit()
      .then(() => {
        sendStatusMsg(200, true, resetField + " reset for all users.", res);
      })
      .catch((err) => {
        console.log(err);
        sendStatusMsg(500, false, "Error while commiting batch", res);
      });
  });

function sendStatusMsg(
  statCode: number,
  isOk: boolean,
  msg: string,
  res: functions.Response
) {
  res.status(statCode).json({
    isOk: isOk,
    message: msg,
  });
}

function sendData(
  statCode: number,
  name: string,
  data: Record<string, any> | undefined,
  res: functions.Response,
  msg?: string
) {
  const dataSend: Record<string, any> = { isOk: true, message: msg };
  dataSend[name] = data;
  res.status(statCode).json(dataSend);
}
