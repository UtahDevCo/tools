import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type OAuthCredential,
  GoogleAuthProvider,
} from "firebase/auth";
import { getFirebaseAuth, createGoogleAuthProvider } from "./config";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
};

export type SignInResult = {
  user: User;
  tokens: AuthTokens;
};

export async function signInWithGoogle(): Promise<SignInResult> {
  const auth = getFirebaseAuth();
  const provider = createGoogleAuthProvider();

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(
    result
  ) as OAuthCredential;

  if (!credential?.accessToken) {
    throw new Error("Failed to get Google access token");
  }

  // Access token expires in 1 hour (3600 seconds)
  const expiresAt = Date.now() + 3600 * 1000;

  return {
    user: result.user,
    tokens: {
      accessToken: credential.accessToken,
      refreshToken: null, // Firebase doesn't expose refresh token directly
      expiresAt,
    },
  };
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export type SerializableUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

export function serializeUser(user: User): SerializableUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}
