"use client";

import React, { useState, useEffect } from "react";
import styles from "./Footer.module.css";

interface FooterLinkItem {
  label: string;
  href: string;
  highlighted?: boolean;
}

interface SocialChannelItem {
  label: string;
  href: string;
}

type LegalModalType = "privacy" | "terms" | "report" | null;
type MobileSectionType = "systems" | "faculties" | null;

// لینک‌های رسمی سامانه‌های آموزشی و دانشگاهی دانشگاه رازی
const EDUCATIONAL_SYSTEMS: FooterLinkItem[] = [
  {
    label: "سامانه جامع گلستان دانشگاه",
    href: "https://golestan.razi.ac.ir",
    highlighted: true,
  },
  {
    label: "سامانه تغذیه و رفاه دانشجویی (سلف)",
    href: "https://food.razi.ac.ir",
  },
  {
    label: "کتابخانه مرکزی و مرکز اسناد رازی",
    href: "https://lib.razi.ac.ir",
  },
  {
    label: "آموزش مجازی نهاد و ال‌ام‌اس (LMS)",
    href: "https://lms.razi.ac.ir",
  },
  {
    label: "تقویم آموزشی نیم‌سال‌های تحصیلی",
    href: "https://razi.ac.ir",
  },
];

// لینک‌های رسمی دانشکده‌ها و پردیس‌های دانشگاه رازی
const FACULTIES_AND_CAMPUSES: FooterLinkItem[] = [
  {
    label: "دانشکده فنی و مهندسی",
    href: "https://eng.razi.ac.ir",
  },
  {
    label: "دانشکده علوم پایه و شیمی",
    href: "https://sci.razi.ac.ir",
  },
  {
    label: "پردیس کشاورزی و منابع طبیعی",
    href: "https://agr.razi.ac.ir",
  },
  {
    label: "دانشکده ادبیات و علوم انسانی",
    href: "https://lit.razi.ac.ir",
  },
  {
    label: "دانشکده علوم اجتماعی و اقتصاد",
    href: "https://soc.razi.ac.ir",
  },
  {
    label: "دانشکده دامپزشکی و تربیت‌بدنی",
    href: "https://vet.razi.ac.ir",
  },
];

// کانال‌های رسمی اطلاع‌رسانی دانشگاه رازی در پیام‌رسان‌ها
const OFFICIAL_CHANNELS: SocialChannelItem[] = [
  {
    label: "ایتا",
    href: "https://eitaa.com/university_razi",
  },
  {
    label: "بله",
    href: "https://ble.ir/razi_university",
  },
  {
    label: "تلگرام",
    href: "https://t.me/university_razi",
  },
];

export default function Footer() {
  const [activeModal, setActiveModal] = useState<LegalModalType>(null);
  const [openMobileSection, setOpenMobileSection] =
    useState<MobileSectionType>(null);
  const [reportText, setReportText] = useState<string>("");
  const [reportSubmitted, setReportSubmitted] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveModal(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleMobileSection = (
    section: Exclude<MobileSectionType, null>
  ) => {
    setOpenMobileSection((prev) => (prev === section ? null : section));
  };

  const handleOpenModal = (type: LegalModalType) => {
    setReportSubmitted(false);
    setReportText("");
    setActiveModal(type);
  };

  const handleReportSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!reportText.trim()) return;
    setReportSubmitted(true);
  };

  return (
    <>
      <footer className={styles.footer} dir="rtl">
        <div className={styles.footerInner}>
          {/* ================= بخش اصلی ۴ ستونه ================= */}
          <div className={styles.footerGrid}>
            {/* ستون اول (راست): معرفی دستیار هوشمند دانشگاه رازی */}
            <div className={styles.brandColumn}>
              <div className={styles.brandHeader}>
                <div className={styles.brandIconBox} aria-hidden="true">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 17 12 22 22 17" />
                    <polyline points="2 12 12 17 22 12" />
                  </svg>
                </div>
                <h2 className={styles.brandTitle}>
                  دستیار هوشمند دانشگاه رازی
                </h2>
              </div>

              <p className={styles.brandDescription}>
                سامانه رسمی هوش مصنوعی دانشگاه رازی کرمانشاه؛ تسهیل‌کننده دسترسی
                دانشجویان، اعضای هیئت علمی و مراجعین به آخرین آیین‌نامه‌ها، اخبار
                و خدمات دانشگاهی.
              </p>

              <a
                href="https://razi.ac.ir"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.itCenterBadge}
              >
                توسعه‌یافته در دانشکده علوم پایه گروه ریاضی
              </a>
            </div>

            {/* ستون دوم: سامانه‌های آموزشی و دانشگاهی (آکاردئونی در موبایل) */}
            <div className={`${styles.linksColumn} ${styles.accordionCard}`}>
              <h3 className={styles.columnHeading}>
                <button
                  type="button"
                  className={styles.accordionTrigger}
                  onClick={() => toggleMobileSection("systems")}
                  aria-expanded={openMobileSection === "systems"}
                >
                  <span className={styles.headingTitleGroup}>
                    <span className={styles.headingBar} aria-hidden="true" />
                    <span>سامانه‌های آموزشی و دانشگاهی</span>
                  </span>
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`${styles.mobileChevronIcon} ${
                      openMobileSection === "systems"
                        ? styles.mobileChevronOpen
                        : ""
                    }`}
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </h3>

              <ul
                className={`${styles.systemsList} ${styles.accordionContent} ${
                  openMobileSection === "systems"
                    ? styles.accordionContentOpen
                    : ""
                }`}
              >
                {EDUCATIONAL_SYSTEMS.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${styles.systemLink} ${
                        item.highlighted ? styles.systemLinkHighlighted : ""
                      }`}
                    >
                      <span
                        className={`${styles.bulletDot} ${
                          item.highlighted ? styles.bulletDotActive : ""
                        }`}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* ستون سوم: دانشکده‌ها و پردیس‌ها (آکاردئونی در موبایل) */}
            <div className={`${styles.linksColumn} ${styles.accordionCard}`}>
              <h3 className={styles.columnHeading}>
                <button
                  type="button"
                  className={styles.accordionTrigger}
                  onClick={() => toggleMobileSection("faculties")}
                  aria-expanded={openMobileSection === "faculties"}
                >
                  <span className={styles.headingTitleGroup}>
                    <span className={styles.headingBar} aria-hidden="true" />
                    <span>دانشکده‌ها و پردیس‌ها</span>
                  </span>
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`${styles.mobileChevronIcon} ${
                      openMobileSection === "faculties"
                        ? styles.mobileChevronOpen
                        : ""
                    }`}
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </h3>

              <ul
                className={`${styles.facultiesList} ${styles.accordionContent} ${
                  openMobileSection === "faculties"
                    ? styles.accordionContentOpen
                    : ""
                }`}
              >
                {FACULTIES_AND_CAMPUSES.map((faculty) => (
                  <li key={faculty.label}>
                    <a
                      href={faculty.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.facultyLink}
                    >
                      {faculty.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* ستون چهارم (چپ): ارتباط با دانشگاه و کانال‌های رسمی */}
            <div className={`${styles.contactColumn} ${styles.contactCardMobile}`}>
              <h3 className={styles.columnHeading}>
                <span className={styles.headingTitleGroup}>
                  <span className={styles.headingBar} aria-hidden="true" />
                  <span>ارتباط با دانشگاه</span>
                </span>
              </h3>

              <ul className={styles.contactList}>
                <li className={styles.contactItem}>
                  <span className={styles.contactIcon} aria-hidden="true">
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
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <span>
                    کرمانشاه، تقاطع باغ ابریشم، پردیس اصلی دانشگاه رازی، کدپستی:
                    ۶۷۱۴۹۶۷۳۴۶
                  </span>
                </li>

                <li className={styles.contactItem}>
                  <span className={styles.contactIcon} aria-hidden="true">
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
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </span>
                  <a href="tel:08334274601" className={styles.contactLink}>
                    تلفن گویا: ۳۴۲۷۴۶۰۱-۰۸۳ الی ۱۰
                  </a>
                </li>

                <li className={styles.contactItem}>
                  <span className={styles.contactIcon} aria-hidden="true">
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
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <a
                    href="mailto:info@razi.ac.ir"
                    className={styles.contactLink}
                  >
                    رایانامه سازمانی: <span dir="ltr">info@razi.ac.ir</span>
                  </a>
                </li>
              </ul>

              <div className={styles.socialSection}>
                <span className={styles.socialLabel}>
                  کانال‌های رسمی اطلاع‌رسانی:
                </span>
                <div className={styles.socialButtons}>
                  {OFFICIAL_CHANNELS.map((channel) => (
                    <a
                      key={channel.label}
                      href={channel.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialPill}
                    >
                      {channel.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ================= نوار کپی‌رایت و لینک‌های پایینی ================= */}
          <div className={styles.bottomBar}>
            <p className={styles.copyrightText}>
              کلیه حقوق مادی و معنوی این دستیار هوشمند متعلق به{" "}
              <a
                href="https://razi.ac.ir"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.universityLink}
              >
               مهدی هاشمی 
              </a>{" "}
              می‌باشد.
            </p>

            <div className={styles.legalLinks}>
              <button
                type="button"
                onClick={() => handleOpenModal("privacy")}
                className={styles.legalButton}
              >
                حریم خصوصی
              </button>
              <span className={styles.separatorDot} aria-hidden="true">
                •
              </span>
              <button
                type="button"
                onClick={() => handleOpenModal("terms")}
                className={styles.legalButton}
              >
                شرایط و قوانین استفاده
              </button>
              <span className={styles.separatorDot} aria-hidden="true">
                •
              </span>
              <button
                type="button"
                onClick={() => handleOpenModal("report")}
                className={styles.legalButton}
              >
                گزارش خطا در پاسخ
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ================= پنجره مودال برای لینک‌های پایینی ================= */}
      {activeModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setActiveModal(null)}
          dir="rtl"
          role="dialog"
          aria-modal="true"
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>
                {activeModal === "privacy" && "سیاست حفظ حریم خصوصی"}
                {activeModal === "terms" && "شرایط و قوانین استفاده از سامانه"}
                {activeModal === "report" && "گزارش خطا در پاسخ دستیار هوشمند"}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className={styles.modalCloseBtn}
                aria-label="بستن"
              >
                ✕
              </button>
            </div>

            {activeModal === "privacy" && (
              <div className={styles.modalBody}>
                <p>
                  تصاویر کارنامه (گزارش ۲۷۲) و پیام‌های ارسالی شما صرفاً در لحظه
                  برای تحلیل انتخاب واحد و پاسخگویی به پرسش‌های آموزشی پردازش
                  می‌شوند و هیچ‌گونه اطلاعات هویتی یا شماره دانشجویی در سرور ذخیره
                  نمی‌گردد.
                </p>
              </div>
            )}

            {activeModal === "terms" && (
              <div className={styles.modalBody}>
                <p>
                  پیشنهادهای انتخاب واحد و برنامه کلاسی بر اساس داده‌های رسمی
                  سیستم گلستان تولید می‌شوند؛ با این حال مسئولیت ثبت نهایی دروس و
                  بررسی آخرین اطلاعیه‌های آموزشی در سامانه{" "}
                  <a
                    href="https://golestan.razi.ac.ir"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    golestan.razi.ac.ir
                  </a>{" "}
                  بر عهده دانشجو است.
                </p>
              </div>
            )}

            {activeModal === "report" && (
              <div className={styles.modalBody}>
                {reportSubmitted ? (
                  <p className={styles.successMessage}>
                    ✅ گزارش شما با موفقیت ثبت شد. با تشکر از همکاری شما در بهبود
                    دقت دستیار هوشمند دانشگاه رازی!
                  </p>
                ) : (
                  <form
                    onSubmit={handleReportSubmit}
                    className={styles.reportForm}
                  >
                    <label htmlFor="error-report-input">
                      لطفاً توضیح دهید کدام درس، ساعت کلاس یا پاسخ اشتباه بوده
                      است:
                    </label>
                    <textarea
                      id="error-report-input"
                      rows={3}
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      placeholder="مثلاً: ساعت کلاس ساختمان داده‌ها گروه ۰۱ تغییر کرده است..."
                      className={styles.reportTextarea}
                      required
                    />
                    <button type="submit" className={styles.reportSubmitBtn}>
                      ارسال گزارش خطا
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}