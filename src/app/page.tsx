"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
import styles from "./page.module.css";

interface Message {
  sender: "user" | "bot";
  text: string;
  imagePreviews?: string[];
}

interface SelectedImage {
  id: string;
  data: string;
  preview: string;
  name: string;
  mimeType: string;
}

type GuideKey = "schedule" | "registration" | "professors" | "locations";

interface GuideCardItem {
  key: GuideKey;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  bullets: string[];
  samples: string[];
}

const GUIDE_CARDS: GuideCardItem[] = [
  {
    key: "schedule",
    icon: "📅",
    title: "برنامه هفتگی کلاس‌ها",
    subtitle: "مشاهده منظم روز، ساعت و امتحان درس‌ها",
    description:
      "برای اطلاع از زمان برگزاری کلاس‌ها و تاریخ امتحانات این نیمسال، کافی است نام درس، روز هفته یا نام گروه آموزشی خود را بپرسید.",
    bullets: [
      "می‌توانید لیست کلاس‌های یک روز مشخص (مثلاً شنبه یا دوشنبه) را بخواهید.",
      "در پاسخ‌ها ساعت دقیق، هفته زوج/فرد، نام استاد و تاریخ امتحان پایان‌ترم مشخص می‌شود.",
    ],
    samples: [
      "برنامه کلاس‌های روز دوشنبه گروه ریاضی چیاست؟",
      "ساعت کلاس و تاریخ امتحان ساختمان داده‌ها کی هست؟",
    ],
  },
  {
    key: "registration",
    icon: "📚",
    title: "کمک به انتخاب واحد",
    subtitle: "تحلیل گزارش ۲۷۲ و چینش واحدها بدون تداخل",
    description:
      "برای دریافت دقیق‌ترین برنامه پیش‌انتخاب واحد (بدون تداخل ساعت کلاس و امتحان پایان‌ترم)، هنگام ارسال پیام حتماً ۳ مورد زیر را بفرستید:",
    bullets: [
      "نام و نام خانوادگی خودتان را بنویسید.",
      "رشته تحصیلی‌تان را دقیق مشخص کنید (مثلاً علوم کامپیوتر، ریاضی، آمار، فیزیک یا زیست).",
      "عکس یا اسکرین‌شات گزارش ۲۷۲ گلستان را با دکمه سنجاق (📎) پیوست کنید (امکان انتخاب چند عکس هم‌زمان وجود دارد).",
    ],
    samples: [
      "سلام، [نام و نام خانوادگی] هستم رشته علوم کامپیوتر؛ عکس گزارش ۲۷۲ رو فرستادم، لطفاً برام پیش‌انتخاب واحد بدون تداخل بچین.",
      "سلام، دانشجوی رشته فیزیک هستم و می‌خوام برای انتخاب واحد این ترم راهنماییم کنی.",
    ],
  },
  {
    key: "professors",
    icon: "👨‍🏫",
    title: "اساتید دانشکده",
    subtitle: "جستجوی نام اساتید، دروس و ساعات ارائه",
    description:
      "برای اینکه بدانید یک استاد در این ترم چه درس‌هایی ارائه داده و در چه روزها و ساعت‌هایی کلاس دارد، کافی است نام یا نام خانوادگی استاد را بپرسید.",
    bullets: [
      "نیازی به نوشتن کد درس نیست؛ فقط نام خانوادگی استاد کافی است.",
      "تمامی گروه‌های ارائه‌شده، ساعات کلاس و مکان برگزاری همان استاد نمایش داده می‌شود.",
    ],
    samples: [
      "استاد پارسایی این ترم چه درس‌هایی داره و ساعت ارائه‌شون کی هست؟",
      "دکتر زرین قلم این ترم چه کلاس‌هایی ارائه داده؟",
    ],
  },
  {
    key: "locations",
    icon: "🏫",
    title: "مکان و شماره کلاس‌ها",
    subtitle: "پیدا کردن شماره اتاق، سایت و آزمایشگاه‌ها",
    description:
      "برای پیدا کردن شماره اتاق، سالن، سایت کامپیوتر یا آزمایشگاه هر درس، نام درس (و در صورت داشتن چند گروه، شماره گروه یا نام استاد) را بپرسید.",
    bullets: [
      "شماره کلاس، آزمایشگاه یا سایت دانشجویان تحصیلات تکمیلی دقیقاً مطابق گلستان اعلام می‌شود.",
      "اگر درسی جلسه حل تمرین جداگانه داشته باشد، مکان هر دو جلسه نمایش داده می‌شود.",
    ],
    samples: [
      "کلاس درس اصول سیستم‌های عامل در کدام اتاق برگزار میشه؟",
      "مکان برگزاری آزمایشگاه فیزیولوژی گیاهی گروه ۰۱ کجاست؟",
    ],
  },
];

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // وضعیت پنجره راهنما و وضعیت بارگذاری لوگوی دانشگاه رازی
  const [activeGuide, setActiveGuide] = useState<GuideCardItem | null>(null);
  const [logoError, setLogoError] = useState(false);

  // استیت نگهداری چندین تصویر همزمان
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // همگام‌سازی تم و دکمه «شروع دوباره» با کامپوننت Header
  useEffect(() => {
    const savedTheme =
      (localStorage.getItem("theme") as "light" | "dark" | null) ||
      (document.documentElement.getAttribute("data-theme") as
        | "light"
        | "dark"
        | null);

    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<"light" | "dark">;
      if (customEvent.detail) {
        setTheme(customEvent.detail);
      }
    };

    const handleGlobalReset = (event: Event) => {
      event.preventDefault();
      setMessages([]);
      setInput("");
      setSelectedImages([]);
      setActiveGuide(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveGuide(null);
      }
    };

    window.addEventListener("theme-change", handleThemeChange);
    window.addEventListener("reset-chat", handleGlobalReset);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("theme-change", handleThemeChange);
      window.removeEventListener("reset-chat", handleGlobalReset);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // اسکرول خودکار به آخرین پیام در زمان چت
  useEffect(() => {
    if (messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // انتخاب یک یا چند تصویر
  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const validImageFiles = fileList.filter((f) =>
      f.type.startsWith("image/")
    );

    if (validImageFiles.length === 0) {
      alert("لطفاً فقط فایل تصویری (PNG, JPG, ...) انتخاب کنید.");
      return;
    }

    validImageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64Data = result.split(",")[1];
        setSelectedImages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            data: base64Data,
            preview: result,
            name: file.name,
            mimeType: file.type,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  // حذف یک تصویر مشخص از لیست با دکمه ضربدر
  const handleRemoveImage = (idToRemove: string) => {
    setSelectedImages((prev) => prev.filter((img) => img.id !== idToRemove));
  };

  // قرار دادن نمونه سوال داخل کادر پیام پس از کلیک در مودال راهنما
  const handleUseSamplePrompt = (sampleText: string) => {
    setInput(sampleText);
    setActiveGuide(null);
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 60);
  };

  // تابع ارسال پیام به همراه آرایه تصاویر
  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText !== undefined ? queryText : input;

    if ((!textToSend.trim() && selectedImages.length === 0) || loading) return;

    const currentImages = [...selectedImages];
    const displayUserText =
      textToSend.trim() ||
      `📄 تعداد ${currentImages.length} تصویر (گزارش ۲۷۲ / برنامه کلاسی) جهت بررسی ارسال شد.`;

    const userMessage: Message = {
      sender: "user",
      text: displayUserText,
      imagePreviews: currentImages.map((img) => img.preview),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (queryText === undefined) setInput("");
    setSelectedImages([]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend.trim(),
          images: currentImages.map((img) => ({
            data: img.data,
            mimeType: img.mimeType,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: data.error || "خطایی در پردازش اطلاعات رخ داد.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "خطای شبکه! لطفاً اتصال اینترنت را بررسی کنید.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // رندر لوگوی دانشگاه رازی (مسیر: public/razi-logo.png)
const renderRaziLogo = (size: "large" | "small") => {
    const iconSize = size === "large" ? 36 : 20;
    return (
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label="آیکون دستیار چت‌بات"
      >
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="3" />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        <path d="M15 13v2" />
        <path d="M9 13v2" />
      </svg>
    );
  };

  return (
    <div className={styles.container} data-theme={theme} dir="rtl">
      <div
        className={`${styles.mainContent} ${
          messages.length > 0 ? styles.mainContentChatActive : ""
        }`}
      >
        {messages.length === 0 ? (
          <div className={styles.welcomeSection}>
            {/* جایگاه لوگوی دانشگاه رازی */}
            <div className={styles.botAvatar}>{renderRaziLogo("large")}</div>
            
            <h1 className={styles.welcomeTitle}>
              سلام! من دستیار هوشمند دانشگاه شما هستم.
            </h1>
            <p className={styles.welcomeSubtitle}>
              برای انتخاب واحد، پرسیدن برنامه کلاس‌ها، یا گپ زدن درباره درس‌ها
              می‌توانید سؤال بپرسید.
            </p>

            <div className={styles.tipLabel}>
              📌 برای راهنمایی موارد زیر روی هر کدام کلیک کنید
            </div>

            <div className={styles.cardsGrid}>
              {GUIDE_CARDS.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  className={styles.card}
                  onClick={() => setActiveGuide(card)}
                >
                  <div className={styles.cardIcon}>{card.icon}</div>
                  <h3>{card.title}</h3>
                  <p>{card.subtitle}</p>
                </button>
              ))}
            </div>

            <div className={styles.suggestionsTitle}>نمونه سوالات سریع:</div>
            <div className={styles.chipsRow}>
              <button
                type="button"
                className={styles.chip}
                onClick={() =>
                  handleSendMessage("کلاس‌های روز شنبه چه ساعتی هستند؟")
                }
              >
                کلاس‌های روز شنبه چه ساعتی هستند؟
              </button>
              <button
                type="button"
                className={styles.chip}
                onClick={() =>
                  handleSendMessage("برای انتخاب واحد رشته ریاضی کمکم کن")
                }
              >
                برای انتخاب واحد رشته ریاضی کمکم کن
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.chatFeed}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={
                  msg.sender === "user" ? styles.userRow : styles.botRow
                }
              >
                {msg.sender === "bot" && (
                  <div className={styles.feedAvatar}>
                    {renderRaziLogo("small")}
                  </div>
                )}
                <div
                  className={
                    msg.sender === "user" ? styles.userBubble : styles.botBubble
                  }
                >
                  {msg.imagePreviews && msg.imagePreviews.length > 0 && (
                    <div className={styles.sentImagesGrid}>
                      {msg.imagePreviews.map((src, imgIdx) => (
                        <img
                          key={imgIdx}
                          src={src}
                          alt={`تصویر ارسالی ${imgIdx + 1}`}
                          className={styles.sentImageThumb}
                        />
                      ))}
                    </div>
                  )}
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className={styles.botRow}>
                <div className={styles.feedAvatar}>
                  {renderRaziLogo("small")}
                </div>
                <div className={`${styles.botBubble} ${styles.loadingBubble}`}>
                  در حال بررسی اطلاعات و تنظیم پاسخ بدون تداخل...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* ================= بخش کادر ارسال پیام ================= */}
      <div className={styles.chatComposer}>
        {selectedImages.length > 0 && (
          <div className={styles.selectedImagesBar}>
            <span className={styles.selectedImagesCount}>
              تصاویر پیوست‌شده ({selectedImages.length}):
            </span>
            {selectedImages.map((img) => (
              <div key={img.id} className={styles.selectedImageChip}>
                <img
                  src={img.preview}
                  alt={img.name}
                  className={styles.selectedImagePreview}
                />
                <span className={styles.selectedImageName}>{img.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(img.id)}
                  title="حذف این تصویر"
                  className={styles.removeImageBtn}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={styles.inputContainer}>
          {/* اینپوت مخفی انتخاب فایل */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            multiple
            style={{ display: "none" }}
          />

          {/* ۱. دکمه سنجاق پیوست تصویر (سمت راست) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className={styles.attachBtn}
            title="پیوست تصاویر گزارش ۲۷۲ گلستان (امکان انتخاب همزمان چند عکس)"
            aria-label="پیوست تصویر"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          {/* ۲. باکس تایپ متن (وسط) */}
          <input
            ref={textInputRef}
            type="text"
            className={styles.inputBox}
            placeholder="پیام خود را بنویسید یا عکس‌های گزارش ۲۷۲ را آپلود کنید..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />

          {/* ۳. دکمه ارسال (سمت چپ) */}
          <button
            type="button"
            className={styles.sendBtn}
            onClick={() => handleSendMessage()}
            disabled={loading}
            title="ارسال پیام"
            aria-label="ارسال پیام"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>

        <p className={styles.footerNote}>
          پاسخ‌ها بر اساس اطلاعات رسمی دروس و قوانین بدون تداخل تولید می‌شوند.
        </p>
      </div>

      {/* ================= پنجره مودال راهنمای کارت‌ها ================= */}
      {activeGuide && (
        <div
          className={styles.modalOverlay}
          onClick={() => setActiveGuide(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="guide-modal-title"
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <span className={styles.guideRedBadge}>راهنما</span>
                <h3 id="guide-modal-title" className={styles.modalTitle}>
                  {activeGuide.icon} {activeGuide.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveGuide(null)}
                className={styles.modalCloseBtn}
                aria-label="بستن راهنما"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>{activeGuide.description}</p>

              <ul className={styles.modalBullets}>
                {activeGuide.bullets.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>

              <div className={styles.samplesSection}>
                <div className={styles.samplesHeader}>
                  <span>نمونه سوال:</span>
                  <span className={styles.samplesHint}>
                    (برای قرار دادن در کادر پیام کلیک کنید)
                  </span>
                </div>
                <div className={styles.samplesList}>
                  {activeGuide.samples.map((sample, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      className={styles.sampleQuestionBtn}
                      onClick={() => handleUseSamplePrompt(sample)}
                    >
                      «{sample}»
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}