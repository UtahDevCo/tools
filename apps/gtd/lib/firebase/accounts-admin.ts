import { getFirestoreAdmin } from "./admin";
import { type ConnectedAccount } from "./accounts";

/**
 * Save or update a connected account (Server-side using Admin SDK)
 */
export async function saveConnectedAccountAdmin(
  userId: string,
  account: ConnectedAccount
): Promise<void> {
  const db = getFirestoreAdmin();
  const docRef = db.collection("users").doc(userId).collection("accounts").doc(account.email);
  
  const data = {
    ...account,
    lastRefreshedAt: Date.now(),
    needsReauth: false,
  };
  
  await docRef.set(data, { merge: true });
}

/**
 * Get a specific connected account by email (Server-side using Admin SDK)
 */
export async function getConnectedAccountAdmin(
  userId: string,
  email: string
): Promise<ConnectedAccount | null> {
  const db = getFirestoreAdmin();
  const docRef = db.collection("users").doc(userId).collection("accounts").doc(email);
  const docSnap = await docRef.get();
  
  if (!docSnap.exists) {
    return null;
  }
  
  return docSnap.data() as ConnectedAccount;
}

/**
 * Get all connected accounts for a user (Server-side using Admin SDK)
 */
export async function getConnectedAccountsAdmin(
  userId: string
): Promise<ConnectedAccount[]> {
  const db = getFirestoreAdmin();
  const accountsRef = db.collection("users").doc(userId).collection("accounts");
  const snapshot = await accountsRef.get();
  
  const accounts: ConnectedAccount[] = [];
  snapshot.forEach(doc => {
    accounts.push(doc.data() as ConnectedAccount);
  });
  
  return accounts.sort((a, b) => a.colorIndex - b.colorIndex);
}

/**
 * Update tokens for an existing account (Server-side using Admin SDK)
 */
export async function updateAccountTokensAdmin(
  userId: string,
  email: string,
  tokens: {
    accessToken: string;
    refreshToken?: string;
    accessTokenExpiresAt: number;
  }
): Promise<void> {
  const db = getFirestoreAdmin();
  const docRef = db.collection("users").doc(userId).collection("accounts").doc(email);

  const updateData: Record<string, any> = {
    accessToken: tokens.accessToken,
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    lastRefreshedAt: Date.now(),
    needsReauth: false,
  };

  if (tokens.refreshToken) {
    updateData.refreshToken = tokens.refreshToken;
  }

  await docRef.update(updateData);
}
