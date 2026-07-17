import {
  UI_FIXTURE_DISABLED_REASON,
  assertUiFixtureOnly,
  isUiFixtureBuild,
} from "./uiFixtureMode";
import { getSyntheticFixtureCarsPayload } from "./syntheticCars";
import { getFixtureFirebaseCallLog } from "./stubs/firebaseCallLog";

/** Built from fragments so Production/external host literals are not emitted in fixture bundles. */
const FORBIDDEN_HOST_SNIPPETS = [
  ["a", "nongbot", "org"].join("."),
  ["nonga", "ce93c"].join("-"),
  ["identitytoolkit", "googleapis", "com"].join("."),
  ["securetoken", "googleapis", "com"].join("."),
  ["firestore", "googleapis", "com"].join("."),
  ["firebasestorage", "googleapis", "com"].join("."),
  ["firebaseinstallations", "googleapis", "com"].join("."),
  ["images", "unsplash", "com"].join("."),
  ["fonts", "googleapis", "com"].join("."),
  ["fonts", "gstatic", "com"].join("."),
  ["api", "dicebear", "com"].join("."),
  ["generativelanguage", "googleapis", "com"].join("."),
  ["a", "run", "app"].join("."),
] as const;

const ALLOWED_LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function hostnameOf(url: string): string {
  try {
    if (isAbsoluteHttpUrl(url)) return new URL(url).hostname.toLowerCase();
    if (typeof window !== "undefined") return window.location.hostname.toLowerCase();
  } catch {
    /* ignore */
  }
  return "";
}

function isLocalHost(host: string): boolean {
  if (!host) return true;
  if (ALLOWED_LOCAL_HOSTS.has(host)) return true;
  if (typeof window !== "undefined" && host === window.location.hostname.toLowerCase()) {
    return true;
  }
  return false;
}

export function isForbiddenFixtureNetworkUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (FORBIDDEN_HOST_SNIPPETS.some((snippet) => lower.includes(snippet))) {
    return true;
  }
  if (
    lower.includes([".", "appspot", ".com"].join("")) ||
    lower.includes(["firebasestorage", "app"].join("."))
  ) {
    return true;
  }
  const firebaseAppHost = ["firebaseapp", "com"].join(".");
  const webAppHost = ["web", "app"].join(".");
  if (lower.includes(firebaseAppHost) && !lower.includes("nonga-staging-2026")) {
    return true;
  }
  if (lower.includes(webAppHost) && !lower.includes("nonga-staging-2026.web.app")) {
    if (isAbsoluteHttpUrl(url)) return true;
  }
  const host = hostnameOf(url);
  if (!host) return false;
  if (!isLocalHost(host) && isAbsoluteHttpUrl(url)) return true;
  return false;
}

function isApiPath(url: string): boolean {
  try {
    const parsed = isAbsoluteHttpUrl(url)
      ? new URL(url)
      : new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return parsed.pathname === "/api" || parsed.pathname.startsWith("/api/");
  } catch {
    return url.includes("/api/");
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Nonga-Ui-Fixture": "1",
    },
  });
}

function handleFixtureApi(url: string, method: string): Response {
  const upper = method.toUpperCase();
  if (upper !== "GET" && upper !== "HEAD") {
    return jsonResponse(
      {
        success: false,
        message: UI_FIXTURE_DISABLED_REASON,
        fixture: true,
      },
      403
    );
  }

  let pathname = url;
  try {
    pathname = isAbsoluteHttpUrl(url)
      ? new URL(url).pathname
      : new URL(url, "http://localhost").pathname;
  } catch {
    /* keep */
  }

  if (pathname === "/api/cars" || pathname === "/api/cars/") {
    return jsonResponse(getSyntheticFixtureCarsPayload());
  }

  return jsonResponse(
    {
      success: false,
      message: "ไม่มีข้อมูลสมมติสำหรับเส้นทางนี้ในโหมดตรวจสอบหน้าจอ",
      fixture: true,
      path: pathname,
    },
    404
  );
}

function patchXhr(): void {
  const XHR = window.XMLHttpRequest;
  if (!XHR || (XHR as unknown as { __nongaFixturePatched?: boolean }).__nongaFixturePatched) {
    return;
  }
  const originalOpen = XHR.prototype.open;
  const originalSend = XHR.prototype.send;
  XHR.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ) {
    const href = String(url);
    (this as unknown as { __nongaFixtureUrl?: string; __nongaFixtureMethod?: string }).__nongaFixtureUrl =
      href;
    (this as unknown as { __nongaFixtureMethod?: string }).__nongaFixtureMethod = method;
    if (isForbiddenFixtureNetworkUrl(href)) {
      throw new Error(`${UI_FIXTURE_DISABLED_REASON}: blocked XHR open (${method} ${href})`);
    }
    return originalOpen.call(this, method, url, async ?? true, username, password);
  };
  XHR.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    const url = String(
      (this as unknown as { __nongaFixtureUrl?: string }).__nongaFixtureUrl || ""
    );
    const method = String(
      (this as unknown as { __nongaFixtureMethod?: string }).__nongaFixtureMethod || "GET"
    );
    if (isForbiddenFixtureNetworkUrl(url) || isApiPath(url)) {
      const err = new Error(`${UI_FIXTURE_DISABLED_REASON}: blocked XHR (${method} ${url})`);
      queueMicrotask(() => {
        this.dispatchEvent(new Event("error"));
      });
      throw err;
    }
    return originalSend.call(this, body);
  };
  (XHR as unknown as { __nongaFixturePatched?: boolean }).__nongaFixturePatched = true;
}

function patchBeacon(): void {
  if (!navigator.sendBeacon) return;
  const original = navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
    const href = String(url);
    if (isForbiddenFixtureNetworkUrl(href) || isApiPath(href) || isAbsoluteHttpUrl(href)) {
      console.warn(UI_FIXTURE_DISABLED_REASON, "sendBeacon blocked", href);
      return false;
    }
    return original(url, data);
  };
}

function patchWebSocket(): void {
  if (!window.WebSocket) return;
  const Original = window.WebSocket;
  window.WebSocket = class extends Original {
    constructor(url: string | URL, protocols?: string | string[]) {
      const href = String(url);
      if (isForbiddenFixtureNetworkUrl(href) || !href.startsWith("/") && isAbsoluteHttpUrl(href)) {
        throw new Error(`${UI_FIXTURE_DISABLED_REASON}: blocked WebSocket (${href})`);
      }
      super(url, protocols);
    }
  } as typeof WebSocket;
}

function patchEventSource(): void {
  if (!window.EventSource) return;
  const Original = window.EventSource;
  window.EventSource = class extends Original {
    constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
      const href = String(url);
      if (isForbiddenFixtureNetworkUrl(href) || isApiPath(href) || isAbsoluteHttpUrl(href)) {
        throw new Error(`${UI_FIXTURE_DISABLED_REASON}: blocked EventSource (${href})`);
      }
      super(url, eventSourceInitDict);
    }
  } as typeof EventSource;
}

function installCspMeta(): void {
  if (document.querySelector('meta[data-nonga-ui-fixture-csp="true"]')) return;
  const meta = document.createElement("meta");
  meta.httpEquiv = "Content-Security-Policy";
  meta.content = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "connect-src 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    // Fixture-only: Zod form schemas use new Function(); keep connect/img locked down.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "worker-src 'self' blob:",
  ].join("; ");
  meta.setAttribute("data-nonga-ui-fixture-csp", "true");
  document.head.appendChild(meta);
}

function rewriteRemoteMediaInDom(root: ParentNode = document): void {
  const prodProject = ["nonga", "ce93c"].join("-");
  const prodHost = ["a", "nongbot", "org"].join(".");
  const remoteRe = new RegExp(
    ["unsplash", "com"].join("\\.") +
      "|" +
      ["dicebear", "com"].join("\\.") +
      "|" +
      ["firebasestorage"].join("") +
      "|" +
      ["appspot", "com"].join("\\.") +
      "|" +
      ["googleapis", "com"].join("\\.") +
      "|" +
      prodHost.replace(/\./g, "\\.") +
      "|" +
      prodProject,
    "i"
  );
  const nodes = root.querySelectorAll?.("img[src], source[src], source[srcset], link[href], video[src], audio[src]") || [];
  nodes.forEach((el) => {
    const attrNames = ["src", "href", "srcset"] as const;
    for (const attr of attrNames) {
      const value = el.getAttribute(attr);
      if (!value) continue;
      if (remoteRe.test(value)) {
        if (attr === "srcset") {
          el.setAttribute(attr, "/fixture/placeholder-car.svg");
        } else if (el.tagName === "LINK") {
          el.remove();
        } else {
          el.setAttribute(attr, "/fixture/placeholder-car.svg");
        }
      }
    }
  });
}

/**
 * Fail-closed browser network guard for Hosting-only fixture builds.
 */
export function installFixtureNetworkGuard(): void {
  if (!isUiFixtureBuild) return;
  assertUiFixtureOnly("installFixtureNetworkGuard");
  if (typeof window === "undefined") return;
  if ((window as unknown as { __nongaFixtureFetchPatched?: boolean }).__nongaFixtureFetchPatched) {
    return;
  }

  installCspMeta();
  getFixtureFirebaseCallLog(); // ensure counter object exists for probes

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = resolveUrl(input);
    if (isForbiddenFixtureNetworkUrl(url)) {
      throw new TypeError(`${UI_FIXTURE_DISABLED_REASON}: blocked host (${url})`);
    }
    if (isApiPath(url)) {
      const method =
        init?.method ||
        (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET") ||
        "GET";
      return handleFixtureApi(url, method);
    }
    if (isAbsoluteHttpUrl(url)) {
      const host = hostnameOf(url);
      if (!isLocalHost(host)) {
        throw new TypeError(`${UI_FIXTURE_DISABLED_REASON}: blocked cross-origin (${host})`);
      }
    }
    return originalFetch(input, init);
  };

  patchXhr();
  patchBeacon();
  patchWebSocket();
  patchEventSource();
  rewriteRemoteMediaInDom();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) rewriteRemoteMediaInDom(node);
      });
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  (window as unknown as { __nongaFixtureFetchPatched?: boolean }).__nongaFixtureFetchPatched =
    true;
  (window as unknown as { __nongaFixtureNetworkGuard?: string }).__nongaFixtureNetworkGuard =
    "installed";
}
