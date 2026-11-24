"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./Header.module.css";

interface PortalLink {
  title: string;
  subtitle: string;
  url: string;
}

const RAZI_PORTALS: PortalLink[] = [
  {
    title: "سیستم جامع گلستان",
    subtitle: "انتخاب واحد، گزارش ۲۷۲ و نمرات",
    url: "https://golestan.razi.ac.ir",
  },
  {
    title: "وب‌سایت رسمی دانشگاه رازی",
    subtitle: "اخبار، اطلاعیه‌ها و دانشکده علوم",
    url: "https://razi.ac.ir",
  },
  {
    title: "سامانه آموزش مجازی (LMS)",
    subtitle: "کلاس‌های آنلاین و منابع درسی",
    url: "https://lms.razi.ac.ir",
  },
  {
    title: "سامانه تغذیه و امور رفاهی",
    subtitle: "رزرو غذا و خدمات دانشجویی",
    url: "https://dining.razi.ac.ir",
  },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState<boolean>(false);

  // وضعیت منوی کشویی سامانه‌ها و منوی همبرگری موبایل
  const [isPortalsOpen, setIsPortalsOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isMobilePortalsOpen, setIsMobilePortalsOpen] = useState<boolean>(false);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // ۱. خواندن و اعمال تم ذخیره شده روی کل سند (html) برای هماهنگی تمام صفحات
  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme =
        (localStorage.getItem("theme") as "light" | "dark" | null) ||
        (localStorage.getItem("admin_dashboard_theme") as "light" | "dark" | null);

      const initialTheme: "light" | "dark" = savedTheme === "dark" ? "dark" : "light";
      setTheme(initialTheme);
      applyThemeToDocument(initialTheme);
    } catch {
      applyThemeToDocument("light");
    }
  }, []);

  // بستن منوها با کلیک بیرون از کادر یا زدن دکمه Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsPortalsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPortalsOpen(false);
        setIsMobileMenuOpen(false);
        setIsFaqModalOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const applyThemeToDocument = (targetTheme: "light" | "dark") => {
    const root = document.documentElement;
    root.setAttribute("data-theme", targetTheme);
    if (targetTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  // ۲. تغییر تم در کل سایت و اطلاع‌رسانی به تمام کامپوننت‌ها
  const handleToggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyThemeToDocument(nextTheme);

    try {
      localStorage.setItem("theme", nextTheme);
      localStorage.setItem("admin_dashboard_theme", nextTheme);
    } catch {
      // Ignore storage error
    }

    // ارسال رویداد سراسری تا اگر صفحه اصلی (page.tsx) استیت جداگانه دارد، بلافاصله آپدیت شود
    window.dispatchEvent(
      new CustomEvent("theme-change", { detail: nextTheme })
    );
  };

  // ۳. عملکرد دکمه «شروع دوباره»
  const handleResetConversation = () => {
    setIsMobileMenuOpen(false);
    setIsPortalsOpen(false);

    if (pathname !== "/") {
      router.push("/");
      return;
    }

    // ارسال رویداد به page.tsx؛ اگر لیسنر ثبت نشده بود، صفحه را تمیز رفرش می‌کند
    const resetEvent = new CustomEvent("reset-chat", { cancelable: true });
    const notHandled = window.dispatchEvent(resetEvent);
    if (notHandled) {
      window.location.reload();
    }
  };

  const isChatActive = pathname === "/";

  return (
    <>
      <header className={styles.header} dir="rtl">
        <div className={styles.headerInner}>
          {/* ================= بخش راست: لوگو و عنوان دستیار ================= */}
          <Link href="/" className={styles.brandLink}>
            <div className={styles.logoWrapper}>
              <div className={styles.logoBox}>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <span className={styles.onlineBadgeDot} aria-hidden="true" />
            </div>

            <div className={styles.brandTextGroup}>
              {/* عنوان نسخه دسکتاپ */}
              <div className={styles.desktopTitleRow}>
                <span className={styles.brandTitle}>
                  دستیار هوشمند دانشگاه رازی
                </span>
              </div>
              <div className={styles.desktopSubtitleRow}>
                <span className={styles.statusDot} />
                <span className={styles.brandSubtitle}>
                  پاسخگوی برخط و ۲۴ ساعته
                </span>
              </div>

              {/* عنوان نسخه موبایل (مطابق طرح موبایل) */}
              <div className={styles.mobileTitleRow}>
                <span className={styles.brandTitle}>دستیار رازی</span>
                <span className={styles.statusDot} />
              </div>
              <span className={styles.mobileSubtitle}>
                پاسخگوی هوشمند دانشگاه
              </span>
            </div>
          </Link>

          {/* ================= بخش میانی (دسکتاپ): کپسول ناوبری ================= */}
          <nav className={styles.desktopNavPill} aria-label="منوی اصلی">
            <Link
              href="/"
              className={`${styles.navItem} ${
                isChatActive ? styles.navItemActive : ""
              }`}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <line x1="9" y1="10" x2="15" y2="10" />
              </svg>
              <span>گفتگو و مشاوره</span>
            </Link>

            {/* منوی کشویی سامانه‌ها و پرتال‌ها */}
            <div className={styles.dropdownWrapper} ref={dropdownRef}>
              <button
                type="button"
                className={styles.navItem}
                onClick={() => setIsPortalsOpen((prev) => !prev)}
                aria-expanded={isPortalsOpen}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                </svg>
                <span>سامانه‌ها و پرتال‌ها</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`${styles.chevronIcon} ${
                    isPortalsOpen ? styles.chevronOpen : ""
                  }`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isPortalsOpen && (
                <div className={styles.dropdownMenu}>
                  {RAZI_PORTALS.map((portal) => (
                    <a
                      key={portal.url}
                      href={portal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.dropdownLink}
                      onClick={() => setIsPortalsOpen(false)}
                    >
                      <div className={styles.dropdownLinkText}>
                        <strong>{portal.title}</strong>
                        <span>{portal.subtitle}</span>
                      </div>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className={styles.navItem}
              onClick={() => setIsFaqModalOpen(true)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>راهنما و سوالات متداول</span>
            </button>
          </nav>

          {/* ================= بخش چپ: شروع دوباره، تغییر تم و منوی موبایل ================= */}
          <div className={styles.actionsGroup}>
            {/* دکمه شروع دوباره (در دسکتاپ با متن و آیکون، در موبایل فقط آیکون) */}
            <button
              type="button"
              onClick={handleResetConversation}
              className={styles.resetButton}
              title="شروع دوباره گفتگو"
              aria-label="شروع دوباره گفتگو"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.resetIcon}
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 16h5v5" />
              </svg>
              <span className={styles.resetButtonLabel}>شروع دوباره</span>
            </button>

            {/* دکمه تغییر تم (تاریک / روشن) */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className={styles.squareIconButton}
              title={
                theme === "dark"
                  ? "تغییر به حالت روشن"
                  : "تغییر به حالت تاریک"
              }
              aria-label="تغییر تم سایت"
            >
              {!mounted || theme === "light" ? (
                <svg
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
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.sunIcon}
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
            </button>

            {/* دکمه منوی همبرگری (فقط در موبایل نمایش داده می‌شود) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className={`${styles.squareIconButton} ${styles.mobileHamburgerBtn}`}
              aria-expanded={isMobileMenuOpen}
              aria-label="منوی اصلی"
            >
              {isMobileMenuOpen ? (
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="10" y1="17" x2="20" y2="17" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ================= منوی کشویی نسخه موبایل ================= */}
        {isMobileMenuOpen && (
          <div className={styles.mobileDrawer}>
            <Link
              href="/"
              className={`${styles.mobileNavItem} ${
                isChatActive ? styles.mobileNavItemActive : ""
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>💬 گفتگو و مشاوره</span>
            </Link>

            <div className={styles.mobileAccordion}>
              <button
                type="button"
                className={styles.mobileNavItem}
                onClick={() => setIsMobilePortalsOpen((prev) => !prev)}
              >
                <span>💠 سامانه‌ها و پرتال‌ها</span>
                <span className={styles.mobileChevron}>
                  {isMobilePortalsOpen ? "▲" : "▼"}
                </span>
              </button>

              {isMobilePortalsOpen && (
                <div className={styles.mobileSubmenu}>
                  {RAZI_PORTALS.map((portal) => (
                    <a
                      key={portal.url}
                      href={portal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.mobileSublink}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <strong>{portal.title}</strong>
                      <span>{portal.subtitle}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className={styles.mobileNavItem}
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsFaqModalOpen(true);
              }}
            >
              <span>❓ راهنما و سوالات متداول</span>
            </button>
          </div>
        )}
      </header>

      {/* ================= مودال راهنما و سوالات متداول ================= */}
      {isFaqModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsFaqModalOpen(false)}
          dir="rtl"
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>راهنمای استفاده از دستیار هوشمند دانشگاه رازی</h3>
              <button
                type="button"
                onClick={() => setIsFaqModalOpen(false)}
                className={styles.modalCloseBtn}
                aria-label="بستن"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.faqItem}>
                <strong>۱. چطور برنامه انتخاب واحد بدون تداخل بگیرم؟</strong>
                <p>
                  از گزارش ۲۷۲ خود در سیستم گلستان عکس یا اسکرین‌شات بگیرید، از طریق
                  دکمه سنجاق (📎) در کادر پایین صفحه آپلود کنید و رشته خود را بنویسید.
                </p>
              </div>
              <div className={styles.faqItem}>
                <strong>۲. چطور زمان کلاس‌ها و امتحانات را بپرسم؟</strong>
                <p>
                  کافی است نام درس، نام استاد یا روز هفته را بپرسید (مثلاً: «کلاس‌های
                  روز شنبه گروه ریاضی چه ساعتی هستند؟»).
                </p>
              </div>
              <div className={styles.faqItem}>
                <strong>۳. آیا اطلاعات دروس به‌روز است؟</strong>
                <p>
                  بله، تمامی ساعات کلاس‌ها، اساتید و تاریخ امتحانات بر اساس آخرین لیست
                  ارائه‌شده در سیستم گلستان دانشکده علوم پردازش می‌شود.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}