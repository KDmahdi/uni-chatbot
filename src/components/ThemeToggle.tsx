"use client";

import styles from "./ThemeToggle.module.css";

// تعریف پراپ‌ها (Props): اطلاعاتی که کامپوننت از صفحه اصلی دریافت می‌کند
interface ThemeToggleProps {
  theme: "light" | "dark";
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      className={styles.toggleBtn}
      onClick={onToggle}
      aria-label="تغییر تم"
      title={theme === "light" ? "تغییر به حالت شب" : "تغییر به حالت روز"}
    >
      {theme === "light" ? (
        // آیکون ماه (برای رفتن به حالت شب)
        <svg
          className={styles.icon}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      ) : (
        // آیکون خورشید (برای برگشتن به حالت روز)
        <svg
          className={styles.icon}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      )}
      {/* <span className={styles.label}>
        {theme === "light" ? "حالت شب" : "حالت روز"}
      </span> */}
    </button>
  );
}