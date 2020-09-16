import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

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
      username: "",
      firstname: "",
      lastname: "",
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
