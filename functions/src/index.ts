import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as cors from "cors";

admin.initializeApp();

const usersCol = admin.firestore().collection("Users");
const gamesRef = admin.database().ref("games");
const corsHandler = cors({ origin: true });

// // Start writing Firebase Functions

//Automatically add user documents in firestore once an account is created
export const addUserDoc = functions
  .region("asia-southeast2")
  .auth.user()
  .onCreate((user) => {
    const data = {
      email: user.email,
      username: "undefined",
      firstname: "undefined",
      lastname: "undefined",
      totalGamesWon: 0,
      gamesWonDay: 0,
      gamesWonWeek: 0,
      createdAt: admin.firestore.Timestamp.now(),
    };

    return usersCol
      .doc(user.uid)
      .set(data)
      .catch((err) => {
        console.log("Error creating user", err);
      });
  });

//Required uid as query
export const deleteUserDoc = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    corsHandler(req, res, () => {
      //Check if uid passed
      const uid: string = String(req.query.uid);
      if (!uid) sendStatusMsg(400, false, "No uid passed.", res);

      return usersCol
        .doc(uid)
        .delete()
        .then(() => {
          sendData(200, "uid", uid, res, "Sucessfully deleted user.");
        })
        .catch((err) => {
          console.log(err);
          sendStatusMsg(404, false, "No user doc found with given uid.", res);
        });
    });
  });

//Required uid as query and username / firstname / lastname as body
export const changeUserData = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    corsHandler(req, res, () => {
      const uid = String(req.query.uid);
      if (!uid) sendStatusMsg(400, false, "No uid passed", res);
      const updateData: Record<string, any> = {
        updatedAt: admin.firestore.Timestamp.now(),
      };
      if (req.body.username) updateData.username = String(req.body.username);
      if (req.body.firstname) updateData.firstname = String(req.body.firstname);
      if (req.body.lastname) updateData.lastname = String(req.body.lastname);

      usersCol
        .doc(uid)
        .update(updateData)
        .then(() => {
          sendData(200, "updateData", updateData, res, "Sucessfully updated user's information.");
        })
        .catch((err) => {
          console.log("Error creating user", err);
          sendStatusMsg(404, false, "No user found with given uid", res);          
        });
    });
  });

//Increment user's games won by specifying uid as query
export const incrementUserScore = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    corsHandler(req, res, () => {
      //Check if uid passed
      const uid: string = String(req.query.uid);
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
  });

//Required uid as query
export const getUserData = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    corsHandler(req, res, () => {
      //Check if uid passed
      const uid: string = String(req.query.uid);
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
  });

//Required numOfPlayers and timeRange (day / week / allTime) as query
export const getTopScorers = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    corsHandler(req, res, () => {
      //Check if numOfPlayers passed
      let numOfPlayers: number = Number(req.query.numOfPlayers);
      if (!numOfPlayers)
        sendStatusMsg(
          400,
          false,
          "No numOfPlayers passed or numOfPlayers passed is 0.",
          res
        );
      if (numOfPlayers % 1 !== 0)
        sendStatusMsg(400, false, "numOfPlayers passed is not an integer", res);

      //Check if timeRange passed and in correct format
      const timeRange: string = String(req.query.timeRange);
      if (!timeRange) sendStatusMsg(400, false, "No timeRange passed.", res);
      if (
        timeRange !== "day" &&
        timeRange !== "week" &&
        timeRange !== "allTime"
      )
        sendStatusMsg(
          400,
          false,
          "timeRange passed is not day / week / month / allTime.",
          res
        );

      let orderByField = "totalGamesWon";
      if (timeRange === "day") orderByField = "gamesWonDay";
      else if (timeRange === "week") orderByField = "gamesWonWeek";
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
  });

//Required gameId as query and data with uid / username / message
export const addChatMessage = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    corsHandler(req, res, () => {
      //Check if gameId passed
      const gameId: string = String(req.query.gameId);
      if (!gameId) sendStatusMsg(400, false, "No gameId passed.", res);

      //Check if message passed
      const msg: string = String(req.body.message);
      if (!msg) sendStatusMsg(400, false, "No message passed.", res);

      const uid: string = req.body.uid ? String(req.body.uid) : "not available";
      const username: string = req.body.username
        ? String(req.body.username)
        : "anonymous";
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
          sendData(200, "data", data, res, "Sucessfully add chat message.");
        })
        .catch((err) => {
          console.log(err);
          sendStatusMsg(500, false, "Error while adding message.", res);
        });
    });
  });

//Required gameId as query
export const deleteGameChat = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    corsHandler(req, res, () => {
      //Check if gameId passed
      const gameId: string = String(req.query.gameId);
      if (!gameId) sendStatusMsg(400, false, "No gameId passed.", res);

      return gamesRef
        .child(gameId)
        .remove()
        .then(() => {
          sendData(200, "gameId", gameId, res, "Game chat messages deleted");
        })
        .catch((err) => {
          console.log(err);
          sendStatusMsg(
            404,
            false,
            "No game room found with given gameId.",
            res
          );
        });
    });
  });

//Require timeRange (day / week) as query
export const resetAllUsersGamesWon = functions
  .region("asia-southeast2")
  .https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
      //Check if timeRange passed and in correct format
      const timeRange: string = String(req.query.timeRange);
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
  data: any,
  res: functions.Response,
  msg?: string
) {
  const dataSend: Record<string, any> = { isOk: true, message: msg };
  dataSend[name] = data;
  res.status(statCode).json(dataSend);
}
