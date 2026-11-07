import { createClient } from "@supabase/supabase-js";
import { ProxyAgent, fetch as undiciFetch } from "undici";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const proxyUrl = process.env.PROXY_URL?.trim();

const smartFetch = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  const plainHeaders: Record<string, string> = {};
  if (options?.headers) {
    const h = new Headers(options.headers);
    h.forEach((v, k) => {
      plainHeaders[k] = v;
    });
  }

  if (proxyUrl) {
    try {
      const dispatcher = new ProxyAgent({
        uri: proxyUrl,
        connectTimeout: 20000,
        allowH2: false,
      });

      const res = await undiciFetch(String(url), {
        method: options?.method || "GET",
        headers: plainHeaders,
        body: options?.body as any,
        dispatcher,
      });
      return res as unknown as Response;
    } catch {
      // اگر پروکسی به هر دلیلی رد کرد، مستقیم امتحان کن
    }
  }

  return await fetch(String(url), {
    ...options,
    headers: plainHeaders,
  });
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: { fetch: smartFetch },
});