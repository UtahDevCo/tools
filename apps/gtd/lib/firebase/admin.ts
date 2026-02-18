import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getServerEnv } from "../env";

/**
 * Initializes and returns a Firebase Admin instance.
 * Uses the default service account when running in Google Cloud.
 * For local development, it can use the FIREBASE_SERVICE_ACCOUNT environment variable if provided.
 */
export function getFirebaseAdmin() {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0]!;
  }

  const env = getServerEnv();
  
  // Use provided project ID or fallback to standard GCP environment variables.
  // initializeApp() can also auto-infer it on Cloud Run/Functions.
  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;

  return initializeApp(projectId ? { projectId } : {});
}

/**
 * Get Firestore Admin instance
 */
export function getFirestoreAdmin() {
  const app = getFirebaseAdmin();
  return getFirestore(app);
}
