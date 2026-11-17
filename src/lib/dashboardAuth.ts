const STORAGE_KEY = 'orderpulse_dashboard_token';
export const AUTH_LOCKED_EVENT = 'orderpulse:auth-locked';

let fetchPatched = false;

export function getSavedDashboardToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(STORAGE_KEY) || window.sessionStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveDashboardToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Ignore storage quota / privacy errors
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Ignore storage quota / privacy errors
  }
}

export function clearDashboardToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

function resolveSameOriginApiPath(input: RequestInfo | URL): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    if (raw.startsWith('/api/')) return raw;
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/')) {
      return parsed.pathname;
    }
    return null;
  } catch {
    return null;
  }
}

const nativeFetch: typeof window.fetch | null =
  typeof window !== 'undefined' && typeof window.fetch === 'function'
    ? window.fetch.bind(window)
    : null;

/**
 * Auth-aware fetch wrapper for same-origin `/api/*` calls.
 * Always attaches `x-dashboard-token` (so iframe previews work even when third-party cookies
 * or `window.fetch` overrides are restricted) and locks cleanly on HTTP 401.
 */
export async function dashboardFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const execFetch = nativeFetch ?? window.fetch.bind(window);
  const apiPath = resolveSameOriginApiPath(input);
  if (!apiPath) {
    return execFetch(input, init);
  }

  const token = getSavedDashboardToken();
  let nextInit: RequestInit | undefined = init;
  if (token) {
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined)
    );
    if (!headers.has('x-dashboard-token')) {
      headers.set('x-dashboard-token', token);
    }
    nextInit = { ...init, headers };
  }

  const res = await execFetch(input, nextInit);
  if (res.status === 401 && !apiPath.startsWith('/api/auth/')) {
    clearDashboardToken();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTH_LOCKED_EVENT));
    }
  }
  return res;
}

/**
 * Safely installs a global `window.fetch` interceptor when permitted by the host environment.
 * Uses `Object.defineProperty` inside a try/catch because iframe/sandbox proxies may expose
 * `window.fetch` as a getter-only or non-configurable property.
 */
export function installDashboardFetchInterceptor(): void {
  if (typeof window === 'undefined' || fetchPatched) return;
  fetchPatched = true;

  try {
    const ownDesc = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (ownDesc && ownDesc.configurable === false) {
      return;
    }
    Object.defineProperty(window, 'fetch', {
      value: dashboardFetch,
      configurable: true,
      writable: true,
    });
  } catch {
    // Restricted iframe/proxy environments keep window.fetch locked; callers using dashboardFetch
    // still send x-dashboard-token automatically.
  }
}
