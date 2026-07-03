import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut,
  Auth
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Check if firebase configuration is valid and not placeholder
const isFirebaseConfigValid = () => {
  return (
    firebaseConfig &&
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "remixed-api-key" &&
    !firebaseConfig.apiKey.includes("placeholder") &&
    firebaseConfig.projectId !== "remixed-project-id"
  );
};

let auth: Auth | null = null;
let provider: GoogleAuthProvider | null = null;

const getFirebaseAuth = (): Auth | null => {
  if (auth) return auth;
  
  if (!isFirebaseConfigValid()) {
    console.warn("Firebase configuration is not fully configured or contains placeholder values. Google Login will be unavailable.");
    return null;
  }

  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/spreadsheets");
    provider.addScope("https://www.googleapis.com/auth/drive");
    return auth;
  } catch (err) {
    console.error("Failed to initialize Firebase Auth:", err);
    return null;
  }
};

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize Google Session helper
export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    if (onAuthFailure) onAuthFailure();
    return () => {}; // return a dummy unsubscribe function
  }

  return onAuthStateChanged(firebaseAuth, async (user: FirebaseUser | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Initiate dynamic Sign In with Google popup flow
export const googleSignIn = async (): Promise<{ user: FirebaseUser; accessToken: string } | null> => {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth || !provider) {
    throw new Error("Layanan login Google tidak aktif karena konfigurasi Firebase belum diatur dengan benar di AI Studio.");
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(firebaseAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (!token) {
      throw new Error("Gagal mendapatkan token akses Google OAuth dari popup login.");
    }
    cachedAccessToken = token;
    return { user: result.user, accessToken: token };
  } catch (error: any) {
    console.error("Sign in with Google error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleLogout = async () => {
  const firebaseAuth = getFirebaseAuth();
  if (firebaseAuth) {
    await signOut(firebaseAuth);
  }
  cachedAccessToken = null;
};
