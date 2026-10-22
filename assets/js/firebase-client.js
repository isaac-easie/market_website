import { appCheckSiteKey, firebaseConfig, hasFirebaseConfig } from "./firebase-config.js";

export const FIREBASE_SDK_VERSION = "11.10.0";
let firebasePromise;

export async function getFirebase() {
  if (!hasFirebaseConfig()) {
    throw new Error("Firebase is not configured. Add your project settings before using accounts or checkout.");
  }

  if (!firebasePromise) {
    firebasePromise = (async () => {
      const base = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
      const [appSdk, authSdk, firestoreSdk, functionsSdk, storageSdk, appCheckSdk] = await Promise.all([
        import(`${base}/firebase-app.js`),
        import(`${base}/firebase-auth.js`),
        import(`${base}/firebase-firestore.js`),
        import(`${base}/firebase-functions.js`),
        import(`${base}/firebase-storage.js`),
        import(`${base}/firebase-app-check.js`)
      ]);

      const app = appSdk.getApps().find((candidate) => candidate.options.projectId === firebaseConfig.projectId)
        || appSdk.initializeApp(firebaseConfig);
      const auth = authSdk.getAuth(app);
      const db = firestoreSdk.getFirestore(app);
      const functions = functionsSdk.getFunctions(app, "africa-south1");
      const storage = storageSdk.getStorage(app);

      if (appCheckSiteKey) {
        appCheckSdk.initializeAppCheck(app, {
          provider: new appCheckSdk.ReCaptchaV3Provider(appCheckSiteKey),
          isTokenAutoRefreshEnabled: true
        });
      }

      return { app, auth, db, functions, storage, appSdk, authSdk, firestoreSdk, functionsSdk, storageSdk };
    })();
  }

  try {
    return await firebasePromise;
  } catch (error) {
    firebasePromise = undefined;
    throw error;
  }
}

export async function callFunction(name, data) {
  const firebase = await getFirebase();
  const callable = firebase.functionsSdk.httpsCallable(firebase.functions, name);
  return (await callable(data)).data;
}

export function getFirebaseErrorMessage(error) {
  const code = error?.code || "";
  const messages = {
    "auth/email-already-in-use": "An account already exists for that email.",
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/user-not-found": "If this address is registered, a password reset email has been sent.",
    "auth/weak-password": "Choose a stronger password with at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "functions/failed-precondition": error?.message || "Checkout is not configured yet.",
    "functions/unauthenticated": "Please sign in to continue.",
    "functions/permission-denied": "You do not have permission to perform this action."
  };
  return messages[code] || error?.message || "The request could not be completed. Please try again.";
}
