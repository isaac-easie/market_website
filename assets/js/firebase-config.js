export const firebaseConfig = {
  apiKey: "AIzaSyCjBO2lsEpNOIdQO-KVFfTHFLb-9KTIFw0",
  authDomain: "safa-africa.firebaseapp.com",
  projectId: "safa-africa",
  storageBucket: "safa-africa.firebasestorage.app",
  messagingSenderId: "319510580333",
  appId: "1:319510580333:web:12938ad885bbcdb9e94364",
  measurementId: "G-KDS32L5B7N"
};

export const appCheckSiteKey = "";

export function hasFirebaseConfig() {
  return firebaseConfig.projectId === "safa-africa"
    && ["apiKey", "authDomain", "storageBucket", "messagingSenderId", "appId"]
      .every((key) => Boolean(firebaseConfig[key]));
}
