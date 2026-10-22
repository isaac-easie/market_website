export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "safa-africa",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export const appCheckSiteKey = "";

export function hasFirebaseConfig() {
  return firebaseConfig.projectId === "safa-africa"
    && ["apiKey", "authDomain", "storageBucket", "messagingSenderId", "appId"]
      .every((key) => Boolean(firebaseConfig[key]));
}
