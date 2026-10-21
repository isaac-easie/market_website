const { applicationDefault, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

async function main() {
  const [email, state = "true"] = process.argv.slice(2);
  if (!email || !["true", "false"].includes(state)) {
    throw new Error("Usage: node scripts/set-admin-claim.cjs <account-email> [true|false]");
  }

  initializeApp({ credential: applicationDefault() });
  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  const claims = { ...user.customClaims };
  if (state === "true") claims.admin = true;
  else delete claims.admin;
  await auth.setCustomUserClaims(user.uid, claims);
  await auth.revokeRefreshTokens(user.uid);
  console.log(`Admin claim ${state === "true" ? "granted to" : "removed from"} ${user.email}. Sign in again to refresh the claim.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
