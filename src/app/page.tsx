"use client";

import { useState, useRef, ChangeEvent ,useEffect } from "react";
import styles from "./page.module.css";
import ThemeToggle from "../components/ThemeToggle";

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

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
useEffect(() => {
    const savedTheme =
      (localStorage.getItem("theme") as "light" | "dark" | null) ||
      (document.documentElement.getAttribute("data-theme") as "light" | "dark" | null);

    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }

    const handleThemeChange = (event: Event) => {
      const customEvent = event as CustomEvent<"light" | "dark">;
      if (customEvent.detail) {
        setTheme(customEvent.detail);
      }
    };

    window.addEventListener("theme-change", handleThemeChange);
    return () => {
      window.removeEventListener("theme-change", handleThemeChange);
    };
  }, []);
  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // استیت نگهداری چندین تصویر همزمان
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // انتخاب یک یا چند تصویر
  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const validImageFiles = fileList.filter((f) => f.type.startsWith("image/"));

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
          { sender: "bot", text: data.error || "خطایی در پردازش اطلاعات رخ داد." },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "خطای شبکه! لطفاً اتصال اینترنت و پروکسی را بررسی کنید.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
    setSelectedImages([]);
  };

  return (
    <main className={styles.container} data-theme={theme}>
      <div className={styles.mainContent}>
        {messages.length === 0 ? (
          <div className={styles.welcomeSection}>
            <div className={styles.botAvatar}>🎓</div>
            <h1 className={styles.welcomeTitle}>
              سلام! من دستیار هوشمند دانشگاه شما هستم.
            </h1>
            <p className={styles.welcomeSubtitle}>
              برای انتخاب واحد، پرسیدن برنامه کلاس‌ها، یا گپ زدن درباره درس‌ها می‌توانید سؤال بپرسید.
            </p>

            <div className={styles.tipLabel}>
              📌 موضوعات پرتکرار برای شروع:
            </div>

            <div className={styles.cardsGrid}>
              <div
                className={styles.card}
                onClick={() => handleSendMessage("برنامه کلاس‌های روز دوشنبه چیاست؟")}
              >
                <div className={styles.cardIcon}>📅</div>
                <h3>برنامه هفتگی کلاس‌ها</h3>
                <p>مشاهده منظم روز، ساعت و مکان درس‌ها</p>
              </div>
              <div
                className={styles.card}
                onClick={() =>
                  handleSendMessage("می‌خوام انتخاب واحد کنم، کمکم می‌کنی؟")
                }
              >
                <div className={styles.cardIcon}>📚</div>
                <h3>تحلیل گزارش ۲۷۲ و انتخاب واحد</h3>
                <p>بررسی کارنامه و چینش واحدها بدون تداخل</p>
              </div>
              <div
                className={styles.card}
                onClick={() =>
                  handleSendMessage("اطلاعات اساتید و زمان حضور آن‌ها")
                }
              >
                <div className={styles.cardIcon}>👨‍🏫</div>
                <h3>اساتید دانشکده</h3>
                <p>جستجوی نام اساتید و ساعات ارائه</p>
              </div>
              <div
                className={styles.card}
                onClick={() =>
                  handleSendMessage("مکان کلاس‌ها و شماره اتاق‌ها کجاست؟")
                }
              >
                <div className={styles.cardIcon}>🏫</div>
                <h3>مکان و شماره کلاس‌ها</h3>
                <p>پیدا کردن شماره اتاق و آزمایشگاه‌ها</p>
              </div>
            </div>

            <div className={styles.suggestionsTitle}>نمونه سوالات سریع:</div>
            <div className={styles.chipsRow}>
              <button
                className={styles.chip}
                onClick={() =>
                  handleSendMessage("کلاس‌های روز شنبه چه ساعتی هستند؟")
                }
              >
                کلاس‌های روز شنبه چه ساعتی هستند؟
              </button>
              <button
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
                  <div className={styles.feedAvatar}>🎓</div>
                )}
                <div
                  className={
                    msg.sender === "user" ? styles.userBubble : styles.botBubble
                  }
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {/* نمایش تصاویر ارسال شده توسط کاربر */}
                  {msg.imagePreviews && msg.imagePreviews.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        marginBottom: "10px",
                      }}
                    >
                      {msg.imagePreviews.map((src, imgIdx) => (
                        <img
                          key={imgIdx}
                          src={src}
                          alt={`تصویر ارسالی ${imgIdx + 1}`}
                          style={{
                            maxWidth: "180px",
                            maxHeight: "180px",
                            borderRadius: "8px",
                            objectFit: "cover",
                            border: "1px solid rgba(255,255,255,0.2)",
                          }}
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
                <div className={styles.feedAvatar}>🎓</div>
                <div className={styles.botBubble}>
                  در حال بررسی فایل‌ها و تنظیم پاسخ بدون تداخل...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        {/* نوار نمایش تصاویر انتخاب شده (پیش از ارسال) */}
        {selectedImages.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 12px",
              marginBottom: "8px",
              borderRadius: "12px",
              backgroundColor:
                theme === "dark"
                  ? "rgba(30, 41, 59, 0.85)"
                  : "rgba(241, 245, 249, 0.95)",
              border:
                theme === "dark"
                  ? "1px solid rgba(59, 130, 246, 0.4)"
                  : "1px solid rgba(37, 99, 235, 0.25)",
              maxWidth: "850px",
              width: "100%",
              marginInline: "auto",
              direction: "rtl",
              overflowX: "auto",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: theme === "dark" ? "#93c5fd" : "#1d4ed8",
                whiteSpace: "nowrap",
              }}
            >
              تصاویر پیوست‌شده ({selectedImages.length}):
            </span>
            {selectedImages.map((img) => (
              <div
                key={img.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background:
                    theme === "dark"
                      ? "rgba(15, 23, 42, 0.8)"
                      : "rgba(255, 255, 255, 0.9)",
                  padding: "4px 8px",
                  borderRadius: "8px",
                  border: "1px solid rgba(148, 163, 184, 0.3)",
                  flexShrink: 0,
                }}
              >
                <img
                  src={img.preview}
                  alt={img.name}
                  style={{
                    width: "32px",
                    height: "32px",
                    objectFit: "cover",
                    borderRadius: "6px",
                  }}
                />
                <span
                  style={{
                    fontSize: "0.78rem",
                    maxWidth: "110px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {img.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(img.id)}
                  title="حذف این تصویر"
                  style={{
                    background: "transparent",
                    color: "#ef4444",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "0.9rem",
                    padding: "0 2px",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

       <div
          className={styles.inputContainer}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            direction: "rtl",
          }}
        >
          {/* اینپوت مخفی انتخاب فایل */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            multiple
            style={{ display: "none" }}
          />

          {/* ۱. دکمه سنجاق پیوست تصویر (اولین المان در حالت راست‌به‌چپ = سمت راست) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="پیوست تصاویر گزارش ۲۷۲ گلستان (امکان انتخاب همزمان چند عکس)"
            style={{
              background: "transparent",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              color: theme === "dark" ? "#cbd5e1" : "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.4rem 0.6rem",
              borderRadius: "8px",
              flexShrink: 0,
            }}
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

          {/* ۲. باکس تایپ متن (در وسط قرار می‌گیرد) */}
          <input
            type="text"
            className={styles.inputBox}
            placeholder="پیام خود را بنویسید یا عکس‌های گزارش ۲۷۲ را آپلود کنید..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "right",
            }}
          />

          {/* ۳. دکمه ارسال (آخرین المان در حالت راست‌به‌چپ = سمت چپ) */}
          <button
            className={styles.sendBtn}
            onClick={() => handleSendMessage()}
            disabled={loading}
            title="ارسال پیام"
            style={{
              position: "static",
              flexShrink: 0,
            }}
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
      </footer>
    </main>
  );
}