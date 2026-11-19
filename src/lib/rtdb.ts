import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const RTDB_APP_NAME = 'orderpulse-rtdb';

export const rtdbFirebaseConfig = {
  apiKey: 'AIzaSyDBaGyG135-twppgjIr2zl7T7TMbj-J7mc',
  authDomain: 'shopify-9351f.firebaseapp.com',
  databaseURL: 'https://shopify-9351f-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'shopify-9351f',
  storageBucket: 'shopify-9351f.firebasestorage.app',
  messagingSenderId: '786174151020',
  appId: '1:786174151020:web:b192964f9d921151a24b49',
  measurementId: 'G-VYDHT09Z5L',
} as const;

export const AUTHORIZED_ADMIN_EMAIL = 'trdsafarr@gmail.com';

export function isAuthorizedRtdbAdmin(
  user: { email?: string | null; emailVerified?: boolean } | null | undefined
): boolean {
  if (!user || user.emailVerified !== true || !user.email) return false;
  return user.email.trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL;
}

export const rtdbProjectMeta = {
  projectId: rtdbFirebaseConfig.projectId,
  databaseURL: rtdbFirebaseConfig.databaseURL,
  authDomain: rtdbFirebaseConfig.authDomain,
  adminEmail: AUTHORIZED_ADMIN_EMAIL,
  rulesConsoleUrl:
    'https://console.firebase.google.com/project/shopify-9351f/database/shopify-9351f-default-rtdb/rules',
  authProvidersConsoleUrl:
    'https://console.firebase.google.com/project/shopify-9351f/authentication/providers',
  authDomainsConsoleUrl:
    'https://console.firebase.google.com/project/shopify-9351f/authentication/settings',
} as const;

const ADMIN_EMAIL_RULE = `auth != null && auth.token.email_verified === true && auth.token.email === '${AUTHORIZED_ADMIN_EMAIL}'`;

export const RECOMMENDED_RTDB_RULES_JSON = JSON.stringify(
  {
    rules: {
      '.read': false,
      '.write': false,
      orderpulse: {
        '.read': ADMIN_EMAIL_RULE,
        '.write': ADMIN_EMAIL_RULE,
      },
      orderpulse_server: {
        '.read': false,
        '.write': false,
      },
    },
  },
  null,
  2
);

function getOrCreateRtdbApp(): FirebaseApp {
  const existing = getApps().find((a) => a.name === RTDB_APP_NAME);
  return existing || initializeApp(rtdbFirebaseConfig, RTDB_APP_NAME);
}

const rtdbApp = getOrCreateRtdbApp();
export const rtdb = getDatabase(rtdbApp, rtdbFirebaseConfig.databaseURL);
export const rtdbAuth = getAuth(rtdbApp);
export const rtdbGoogleProvider = new GoogleAuthProvider();
rtdbGoogleProvider.setCustomParameters({
  prompt: 'select_account',
  login_hint: AUTHORIZED_ADMIN_EMAIL,
});
