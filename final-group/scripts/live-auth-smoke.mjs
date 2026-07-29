const apiKey = process.env.VITE_FIREBASE_API_KEY;

if (!apiKey) {
  throw new Error("VITE_FIREBASE_API_KEY is required.");
}

const email = `tripflow.smoke.${Date.now()}@example.com`;
const password = "TripFlowSmoke!2026";
const endpoint = "https://identitytoolkit.googleapis.com/v1/accounts";

const signupResponse = await fetch(`${endpoint}:signUp?key=${apiKey}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, password, returnSecureToken: true }),
});
const signup = await signupResponse.json();

if (!signupResponse.ok) {
  throw new Error(`Email/password smoke signup failed: ${signup.error?.message ?? signupResponse.status}`);
}

const deleteResponse = await fetch(`${endpoint}:delete?key=${apiKey}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ idToken: signup.idToken }),
});

if (!deleteResponse.ok) {
  throw new Error("Synthetic Firebase Auth account cleanup failed.");
}

console.log(
  JSON.stringify({
    provider: "emailPassword",
    created: Boolean(signup.localId),
    deleted: true,
  }),
);
