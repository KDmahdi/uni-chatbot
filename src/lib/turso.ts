import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.warn("⚠️ متغیرهای محیطی Turso تنظیم نشده‌اند!");
}

export const turso = createClient({
  url: url || "",
  authToken: authToken || "",
});