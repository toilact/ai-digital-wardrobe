import admin from "firebase-admin";

function fixPrivateKey(key?: string) {
  return key?.replace(/\\n/g, "\n");
}

export function getAdmin() {
  if (admin.apps.length) return admin;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = fixPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE admin env vars");
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  return admin;
}
