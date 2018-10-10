// Import the Firebase SDK for Google Cloud Functions.
const functions = require('firebase-functions');
// Import and initialize the Firebase Admin SDK.
const admin = require('firebase-admin');
admin.initializeApp();
const firestoreRef = admin.firestore();


exports.newProjectMessage = functions.firestore.document('projectMessages/{docId}')
    .onCreate((snap, context) => {
     // Get an object representing the document
    // e.g. {'name': 'Marie', 'age': 66}
    var data = snap.data();
    // access a particular field as you would any JS property
    var first = data.first;
    var message = data.message;
        const payload = {
        notification: {
          title: first + ' message received',
          body: message.length <= 100 ? message : message.substring(0, 97) + '...', // tests for length of string
          icon: '../images/notification.png',// Change to desired pic
          click_action: `https://icrea8te-8.firebaseapp.com/my-project-messages.html`// Change to actual page needed to load
        }
      };
    var tokens = [];
    var tokenIds = [];
    firestoreRef.collection("projectTokens").get().then(function(querySnapshot) {
        querySnapshot.forEach(function(doc) {
            tokens.push(doc.data().token);
            tokenIds.push(doc.id);
        });
            // Send notifications to all tokens.
            return admin.messaging().sendToDevice(tokens, payload).then(response => {
            
            // For each message check if there was an error.
            var tokensToRemove = [];
            response.results.forEach((result, index) => {
              const error = result.error;
              if (error) {
                console.error('Failure sending notification to', tokens[index], error);
                // Cleanup the tokens who are not registered anymore.
                if (error.code === 'messaging/invalid-registration-token' ||
                    error.code === 'messaging/registration-token-not-registered') {
                  tokensToRemove.push(firestoreRef.collection("developerTokens").doc(tokenIds[index]).delete());
                }
              }
            });
            return Promise.all(tokensToRemove).catch(error => {console.log(error.message);});
          });
        });
    });