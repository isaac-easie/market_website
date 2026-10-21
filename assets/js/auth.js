import { getFirebase, getFirebaseErrorMessage } from "./firebase-client.js";

export class iSaxAuth {
  async signIn({ email, password }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPassword = String(password || "");
    if (!normalizedEmail || !normalizedPassword) {
      return { ok: false, message: "Enter both email and password." };
    }

    try {
      const firebase = await getFirebase();
      const credential = await firebase.authSdk.signInWithEmailAndPassword(
        firebase.auth,
        normalizedEmail,
        normalizedPassword
      );
      return { ok: true, user: credential.user };
    } catch (error) {
      return { ok: false, message: getFirebaseErrorMessage(error) };
    }
  }

  async signUp({ name, email, password }) {
    const normalizedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPassword = String(password || "");
    if (!normalizedName || normalizedName.length > 100 || !normalizedEmail || !normalizedPassword) {
      return { ok: false, message: "Enter a name (up to 100 characters), email, and password." };
    }

    try {
      const firebase = await getFirebase();
      const credential = await firebase.authSdk.createUserWithEmailAndPassword(
        firebase.auth,
        normalizedEmail,
        normalizedPassword
      );
      await firebase.authSdk.updateProfile(credential.user, { displayName: normalizedName });
      await firebase.firestoreSdk.setDoc(
        firebase.firestoreSdk.doc(firebase.db, "users", credential.user.uid),
        {
          email: credential.user.email,
          name: normalizedName,
          role: "customer",
          createdAt: firebase.firestoreSdk.serverTimestamp(),
          updatedAt: firebase.firestoreSdk.serverTimestamp()
        }
      );
      return { ok: true, user: credential.user };
    } catch (error) {
      return { ok: false, message: getFirebaseErrorMessage(error) };
    }
  }

  async sendPasswordReset(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) return { ok: false, message: "Enter your email address first." };

    try {
      const firebase = await getFirebase();
      await firebase.authSdk.sendPasswordResetEmail(firebase.auth, normalizedEmail);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getFirebaseErrorMessage(error) };
    }
  }

  async signOut() {
    try {
      const firebase = await getFirebase();
      await firebase.authSdk.signOut(firebase.auth);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getFirebaseErrorMessage(error) };
    }
  }

  async getCurrentUser() {
    try {
      const firebase = await getFirebase();
      return firebase.auth.currentUser;
    } catch {
      return null;
    }
  }

  async isOwner() {
    const user = await this.getCurrentUser();
    if (!user) return false;
    const token = await user.getIdTokenResult();
    return token.claims.admin === true;
  }
}
