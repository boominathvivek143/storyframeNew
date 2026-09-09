// Every request rides along with the session cookie set at login/signup --
// identity and credit accounting are resolved server-side from that, there
// is no client-supplied id or API key to attach anymore.
function withCredentials(options?: RequestInit): RequestInit {
  return { ...options, credentials: 'include' };
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit,
  maxRetries = 2
): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, withCredentials(options));
      const contentType = res.headers.get('content-type') || '';
      let parsedData: any = null;

      if (contentType.includes('application/json')) {
        parsedData = await res.json().catch(() => null);
      } else {
        const text = await res.text();
        try {
          parsedData = JSON.parse(text);
        } catch {
          parsedData = { text };
        }
      }

      if (!res.ok) {
        // If throttled (429), automatically back off and retry up to maxRetries times
        if (res.status === 429 && attempt < maxRetries) {
          const retryAfterHeader = res.headers.get('retry-after');
          const delayMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 1500 * (attempt + 1);
          await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 5000)));
          continue;
        }

        // parsedData.error/.message is the normal path (every route in
        // server.ts responds with { error: "..." } on failure). The
        // fallbacks below exist for the cases that never reach that shape --
        // a proxy/host-level failure that returns its own HTML/plain-text
        // error page, or a route this client doesn't know about -- and
        // always keep whatever raw text the server actually sent instead of
        // collapsing it to a bare status code, so the real cause isn't lost.
        const rawSnippet = typeof parsedData?.text === 'string' ? parsedData.text.trim().slice(0, 200) : '';
        const statusHint = res.status === 413 ? 'Payload too large.' : res.status === 404 ? 'Requested resource was not found.' : `Request failed with status ${res.status}.`;
        const errorMsg = parsedData?.error || parsedData?.message || (rawSnippet ? `${statusHint} Server responded: "${rawSnippet}"` : statusHint);
        return { ok: false, status: res.status, data: parsedData, error: errorMsg };
      }
      return { ok: true, status: res.status, data: parsedData };
    } catch (err: any) {
      if (attempt < maxRetries && /networkerror|failed to fetch/i.test(err?.message || '')) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      // A thrown fetch (as opposed to a non-2xx response, handled above)
      // means the request never reached the server at all -- offline, the
      // server process isn't running, a bad host/port, or a CORS rejection.
      // Browsers deliberately withhold which of those it was (a security
      // measure, not something this code can see around), and reduce it to
      // a near-useless "Failed to fetch" / "Load failed" / "NetworkError..."
      // TypeError -- so that generic text is replaced with the specific
      // fact this code *does* know (which URL, and that it's a connectivity
      // failure rather than a server-side error) instead of passed through.
      const isGenericBrowserNetworkError = /failed to fetch|networkerror|load failed/i.test(err?.message || '');
      const error = isGenericBrowserNetworkError
        ? `Could not reach the server at ${url} -- it may not be running, or your connection just dropped. (Browser reports: "${err.message}".)`
        : err?.message || `Could not reach the server at ${url}.`;
      return { ok: false, status: 0, data: null as any, error };
    }
  }
  return { ok: false, status: 429, data: null as any, error: 'Request was rate-limited. Please try again in a moment.' };
}

export function postJson<T = any>(url: string, body: any): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  return safeFetchJson<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
