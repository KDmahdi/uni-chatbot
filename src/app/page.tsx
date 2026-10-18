"use client";

import { useState } from "react";
import styles from "./page.module.css";

interface Message {
  sender: "user" | "bot";
  text: string;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // تابع ارسال پیام به بک‌اند (API Route)
  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { sender: "user", text: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    if (!queryText) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, { sender: "bot", text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: data.error || "خطایی در ارتباط با سرور رخ داد." },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "خطای شبکه! لطفاً اتصال اینترنت و پروکسی را بررسی کنید." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // دکمه شروع دوباره (پاک کردن چت‌ها)
  const handleReset = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <main className={styles.container}>
      {/* هدر بالای صفحه */}
      <header className={styles.header}>
        <button className={styles.resetBtn} onClick={handleReset}>
          <span>شروع دوباره</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        <div className={styles.statusWrapper}>
          <span className={styles.statusText}>آنلاین</span>
          <span className={styles.statusDot}></span>
        </div>
        <div className={styles.brandTitle}>
          <span>دستیار هوشمند دانشگاه</span>
          <div className={styles.brandIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
              <path d="M6 6h10M6 10h10" />
            </svg>
          </div>
        </div>
      </header>

      {/* بدنه اصلی */}
      <div className={styles.mainContent}>
        {messages.length === 0 ? (
          // نمای اولیه (Welcome Screen) وقتی پیامی فرستاده نشده
          <div className={styles.welcomeSection}>
            <div className={styles.botAvatar}>🎓</div>
            <h1 className={styles.welcomeTitle}>سلام! من دستیار هوشمند دانشگاه شما هستم.</h1>
            <p className={styles.welcomeSubtitle}>
              چگونه می‌توانم کمکتان کنم؟ می‌توانید روی یکی از موضوعات زیر کلیک کنید یا سوال خود را در کادر پایین بنویسید.
            </p>

            <div className={styles.tipLabel}>📌 برای شروع، یکی از موضوعات زیر را انتخاب کنید:</div>

            {/* کارت‌های راهنما */}
            <div className={styles.cardsGrid}>
              <div className={styles.card} onClick={() => handleSendMessage("برنامه کلاس‌های این ترم چیست؟")}>
                <div className={styles.cardIcon}>📅</div>
                <h3>برنامه کلاس‌ها</h3>
                <p>مشاهده روز و ساعت درس‌ها</p>
              </div>
              <div className={styles.card} onClick={() => handleSendMessage("راهنمای انتخاب واحد و پیش‌نیازها چیست؟")}>
                <div className={styles.cardIcon}>📚</div>
                <h3>راهنمای انتخاب واحد</h3>
                <p>پیش‌نیازها و قوانین آموزشی</p>
              </div>
              <div className={styles.card} onClick={() => handleSendMessage("اطلاعات اساتید و زمان حضور آن‌ها")}>
                <div className={styles.cardIcon}>👨‍🏫</div>
                <h3>اطلاعات اساتید</h3>
                <p>جستجوی اساتید و زمان حضور</p>
              </div>
              <div className={styles.card} onClick={() => handleSendMessage("مکان کلاس‌ها و شماره اتاق‌ها کجاست؟")}>
                <div className={styles.cardIcon}>🏫</div>
                <h3>مکان کلاس‌ها</h3>
                <p>پیدا کردن شماره اتاق و دانشکده</p>
              </div>
            </div>

            <div className={styles.suggestionsTitle}>یا به زبان ساده از من بپرسید، مثلاً:</div>
            <div className={styles.chipsRow}>
              <button className={styles.chip} onClick={() => handleSendMessage("کلاس‌های روز شنبه چه ساعتی هستند؟")}>
                فردا چه کلاس‌هایی دارم؟
              </button>
              <button className={styles.chip} onClick={() => handleSendMessage("دفتر اساتید کجاست؟")}>
                دفتر اساتید کجاست؟
              </button>
            </div>
          </div>
        ) : (
          // جریان مکالمه (Chat Feed)
          <div className={styles.chatFeed}>
            {messages.map((msg, index) => (
              <div key={index} className={msg.sender === "user" ? styles.userRow : styles.botRow}>
                {msg.sender === "bot" && <div className={styles.feedAvatar}>🎓</div>}
                <div className={msg.sender === "user" ? styles.userBubble : styles.botBubble}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className={styles.botRow}>
                <div className={styles.feedAvatar}>🎓</div>
                <div className={styles.botBubble}>در حال جستجو در اطلاعات دروس...</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* کادر ورودی پایین صفحه */}
      <footer className={styles.footer}>
        <div className={styles.inputContainer}>
          <button 
            className={styles.sendBtn} 
            onClick={() => handleSendMessage()}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
          <input
            type="text"
            className={styles.inputBox}
            placeholder="سوال خود را اینجا بنویسید... (مثلاً: کلاس ساختمان داده چه روزی است؟)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
        </div>
        <p className={styles.footerNote}>پاسخ‌ها بر اساس اطلاعات رسمی دروس تولید می‌شوند.</p>
      </footer>
    </main>
  );
}