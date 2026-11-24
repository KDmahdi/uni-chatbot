import { NextResponse } from "next/server";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { turso } from "@/lib/turso";
import coursesData from "@/data/razi_courses_1405-1406_term1.json";

interface Session {
  kind?: string;
  is_tutorial?: boolean;
  day: string;
  start?: string;
  end?: string;
  start_time?: string;
  end_time?: string;
  week?: string | null;
  location?: string | null;
}

interface Course {
  id?: string;
  course_code: string;
  group: string;
  course_name: string;
  department: string;
  units:
    | {
        total: number;
        practical?: number;
      }
    | number;
  instructors: string[];
  gender?: string;
  capacity?: number;
  enrolled?: number;
  waitlist?: number;
  sessions: Session[];
  exam: {
    date: string;
    start?: string;
    end?: string;
    time?: string;
  } | null;
  notes?: string | null;
}

function normalizePersian(text: string): string {
  return String(text || "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim();
}

function findRelevantCourses(userQuery: string, allCourses: Course[]): Course[] {
  const cleanQuery = normalizePersian(userQuery);

  const stopWords = [
    "کلاس", "درس", "استاد", "دکتر", "ساعت", "چند", "کی", "کجاست", "کجا", "روز", "چه",
    "دارم", "داریم", "ارائه", "میشه", "می‌شود", "است", "هست", "برای", "در", "از",
    "به", "با", "را", "رو", "من", "ما", "لیست", "برنامه", "شماره", "کد", "امتحان",
    "ظرفیت", "واحد", "گروه", "سلام", "خوبی", "چطوری", "چخبر", "کمک", "دانشگاه", "رازی",
    "ترم", "چیه", "چیست",
  ];

  const keywords = cleanQuery
    .split(/[\s،؟?.,!]+/)
    .filter((word) => word.length > 1 && !stopWords.includes(word));

  if (keywords.length === 0) return [];

  const scoredCourses = allCourses.map((course) => {
    let score = 0;
    const instructorsText = Array.isArray(course.instructors)
      ? course.instructors.join(" ")
      : "";
    const sessionsText = Array.isArray(course.sessions)
      ? course.sessions.map((s) => `${s.day || ""} ${s.location || ""}`).join(" ")
      : "";

    const searchableText = normalizePersian(
      `${course.course_name || ""} ${course.course_code || ""} ${course.department || ""} ${instructorsText} ${sessionsText}`
    );

    for (const word of keywords) {
      if (searchableText.includes(word)) score += 1;
    }

    return { course, score };
  });

  return scoredCourses
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.course)
    .slice(0, 35);
}

export async function POST(req: Request) {
  try {
    const { message, image, images } = await req.json();

    // پشتیبانی همزمان از تک‌عکس و چندعکس
    const rawImages: { data: string; mimeType: string }[] = Array.isArray(images)
      ? images
      : image
      ? [image]
      : [];

    if ((!message || typeof message !== "string") && rawImages.length === 0) {
      return NextResponse.json(
        { error: "لطفاً پیام یا تصویر معتبری ارسال کنید." },
        { status: 400 }
      );
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();
    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
    const proxyUrl = process.env.PROXY_URL?.trim();

    // ۱. دریافت دروس از دیتابیس ابری Turso (با فال‌بک محلی)
    let activeCourses: Course[] = (coursesData as any).courses as Course[];
    try {
      const result = await turso.execute(
        "SELECT * FROM courses ORDER BY created_at ASC"
      );

      if (result.rows && result.rows.length > 0) {
        activeCourses = result.rows.map((row: any) => ({
          ...row,
          units: row.units
            ? typeof row.units === "string"
              ? JSON.parse(row.units)
              : row.units
            : { total: 0, practical: 0 },
          instructors: row.instructors
            ? typeof row.instructors === "string"
              ? JSON.parse(row.instructors)
              : row.instructors
            : [],
          sessions: row.sessions
            ? typeof row.sessions === "string"
              ? JSON.parse(row.sessions)
              : row.sessions
            : [],
          exam: row.exam
            ? typeof row.exam === "string"
              ? JSON.parse(row.exam)
              : row.exam
            : null,
        })) as Course[];
      }
    } catch {
      console.warn("⚠️ خطا در اتصال به Turso، استفاده از فایل JSON پشتیبان.");
    }

    // ۲. تشخیص درخواست انتخاب واحد
    const isCoursePlanning = Boolean(
      rawImages.length > 0 ||
        /انتخاب\s*واحد|پیش\s*انتخاب|گزارش\s*۲۷۲|گزارش\s*272|کارنامه|پیشنهاد\s*درس|واحدهای\s*ترم/i.test(
          message || ""
        )
    );

    const relevantCourses = isCoursePlanning
      ? activeCourses
      : message
      ? findRelevantCourses(message, activeCourses)
      : [];

    const coursesContext =
      relevantCourses.length > 0
        ? `\nاطلاعات دروس ارائه‌شده نیمسال جاری دانشگاه رازی:\n${JSON.stringify(relevantCourses, null, 2)}`
        : `\n(نکته سیستمی: برای این پیام، درس خاصی فیلتر نشد.)`;

    // ۳. پرامپت مهندسی‌شده جامع
    const systemPrompt = `
تو «دستیار هوشمند دانشگاه رازی کرمانشاه» (دانشکده علوم) هستی.
شخصیت: مثل یک هم‌دانشگاهی دلسوز، باهوش، صمیمی، خوش‌برخورد و همه‌فن‌حریف که صادقانه راهنمایی می‌کند و ادبیاتش کاملاً دانشجویی، صمیمی و دوستانه است.

وظیفه تو این است که بر اساس نیت کاربر، یکی از حالت‌های زیر را هوشمندانه انتخاب و پاسخ دهی:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 حالت اول: درخواست انتخاب واحد یا تحلیل کارنامه
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
۱. اگر دانشجو گفت می‌خواهد انتخاب واحد کند اما هنوز کارنامه یا تصویری نفرستاده و رشته‌اش را نگفته است:
   به او صمیمانه بگو:
   «رفیق، برای اینکه بتونم دقیق‌ترین واحدها رو برات بچینم، دوتا چیز لازمه:
   ۱. اسکرین‌شات یا عکس **گزارش ۲۷۲ گلستان** (خلاصه وضعیت تحصیلی / کارنامه کامل) رو با دکمه 📎 برام بفرست (اگه طولانیه می‌تونی چندتا عکس بفرستی).
   ۲. **رشته تحصیلی و گروه آموزشی‌ت** رو هم برام بنویس (مثلاً ریاضی، آمار، فیزیک، علوم کامپیوتر یا زیست) تا فقط درس‌های مرتبط با رشته خودت رو بهت پیشنهاد بدم!»

۲. اگر تصویر (گزارش ۲۷۲) ارسال شد:
   - در گزارش ۲۷۲ سرفصل‌ها و جدول دروسی که گذرانده مشخص است:
     * دروسی که **نمره قبولی (۱۰ و بالاتر)** دارند: قبلاً پاس شده‌اند و **به هیچ وجه نباید دوباره پیشنهاد شوند**.
     * دروسی که **نمره ثبت‌نشده دارند یا وضعیت ناتمام/افتاده** دارند: دانشجو باید آن‌ها را بگذراند.
     * حداقل واحدهای گذرانده‌شده و ترم تحصیلی را از عکس بخوان.
   - **تشخیص رشته و گروه آموزشی:** رشته دانشجو را از بالای گزارش ۲۷۲ بخوان. اگر در عکس مشخص نبود یا مبهم بود، بگو: «رفیق رشته‌ت چیه؟ بر اساس گروه آموزشی خودت (مثلاً گروه ریاضی یا فیزیک) بهترین دروس رو فیلتر کنم».
   - **قوانین حیاتی عدم تداخل در چینش برنامه ترم:**
     • **تداخل ساعت کلاسی:** جلسات هفتگی دو درس نباید در یک روز و یک بازه زمانی مشترک باشند (هفته‌های زوج و فرد را هم در نظر بگیر).
     • **تداخل امتحان پایان‌ترم:** دو درس نباید دقیقاً در یک روز و ساعت امتحان یکسان داشته باشند.
   - برنامه پیشنهادی ترم را بین **۱۶ تا ۲۰ واحد** تنظیم کن و با ساختاری منظم شامل نام درس و کد، نام استاد، زمان کلاس، تاریخ امتحان و تعداد واحد ارائه بده و تایید کن که ساعت‌ها هیچ تداخلی با هم ندارند.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 حالت دوم: سوال درباره برنامه کلاس‌ها و اساتید در یک روز خاص
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
وقتی دانشجو درباره کلاس‌های یک روز (مثلاً "دوشنبه چه کلاس‌هایی داریم؟" یا "کلاس‌های دکتر پارسایی") سؤال می‌پرسد، به صورت خط‌به‌خط، تفکیک‌شده و همراه با ایموجی‌های منظم پاسخ بده:

نمونه ساختار پاسخ برای هر درس:
📌 **نام درس** (کد درس - گروه)
👨‍🏫 **استاد:** نام استاد (به فرمت طبیعی، مثلاً دکتر لیلا پارسایی مجد)
🏢 **گروه آموزشی:** نام دپارتمان
🕒 **زمان کلاس:** روز و ساعت (با ذکر هفته زوج/فرد در صورت وجود)
📍 **مکان:** شماره کلاس / آزمایشگاه
📝 **امتحان:** تاریخ و ساعت امتحان
---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 حالت سوم: گفتگوی آزاد، احوال‌پرسی یا سوالات عمومی
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
اگر سلام کرد، احوال‌پرسی کرد یا درباره برنامه‌نویسی و زندگی دانشجویی صحبت کرد، کاملاً دوستانه، خودمانی و صمیمی گپ بزن.

${coursesContext}

پیام کاربر:
${message || "لطفاً این تصویر (گزارش ۲۷۲) را تحلیل کن و برنامه انتخاب واحد بدون تداخل پیشنهاد بده."}
`;

    // عبور از پروکسی محلی در محیط توسعه
    const dispatcher = proxyUrl
      ? new ProxyAgent({
          uri: proxyUrl,
          connectTimeout: 30000,
          allowH2: false,
        })
      : undefined;

    // ========================================================
    // اولویت اول: OpenRouter (شامل Qwen و مدل‌های رایگان)
    // ========================================================
    if (openRouterApiKey) {
      const openRouterVisionModels = [
        "google/gemma-4-31b-it:free",
        "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        "openrouter/free",
      ];

      const openRouterTextModels = [
        "openrouter/free",
        "google/gemma-4-31b-it:free",
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "qwen/qwen-2.5-72b-instruct",
        "deepseek/deepseek-chat",
      ];

      const openRouterActiveList =
        rawImages.length > 0 ? openRouterVisionModels : openRouterTextModels;

      // آماده‌سازی محتوای چندتصویری برای OpenRouter
      const userContent: any[] = [{ type: "text", text: systemPrompt }];
      rawImages.forEach((img) => {
        userContent.push({
          type: "image_url",
          image_url: {
            url: `data:${img.mimeType};base64,${img.data}`,
          },
        });
      });

      for (const model of openRouterActiveList) {
        try {
          console.log(`🌐 تلاش روی OpenRouter [${model}]...`);
          const res = await undiciFetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${openRouterApiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Uni Chatbot Razi",
              },
              body: JSON.stringify({
                model,
                messages: [{ role: "user", content: userContent }],
                temperature: 0.4,
              }),
              dispatcher,
            }
          );

          if (res.ok) {
            const data: any = await res.json();
            const reply = data.choices?.[0]?.message?.content;
            if (reply) {
              console.log(`✅ پاسخ موفق از OpenRouter [${model}]`);
              return NextResponse.json({
                reply,
                provider: "OpenRouter",
                modelUsed: model,
              });
            }
          }
          console.warn(`⚠️ خطا در OpenRouter [${model}] کد: ${res.status}`);
        } catch (err: any) {
          console.warn(`⚠️ خطای شبکه OpenRouter:`, err.message);
        }
      }
    }

    // ========================================================
    // اولویت دوم (پشتیبان / فال‌بک): Google Gemini (به‌روزرسانی‌شده)
    // ========================================================
    if (geminiApiKey) {
      console.log("🔄 سوئیچ به Google Gemini...");

      // مدل‌های چندوجهی قدرتمند برای پردازش چندتصویری گزارش ۲۷۲ و چیدمان انتخاب واحد
      const geminiVisionModels = [
        "gemini-2.5-flash",
        "gemini-3.5-flash",
        "gemini-3.7-flash",
        "gemini-omni-1.2-flash",
        "gemini-3.8-flash",
        "gemini-2.5-pro",
        "gemini-3.1-pro-preview",
        "gemini-pro-latest",
        "gemini-4-neon",
      ];

      // مدل‌های سریع و کم‌مصرف برای چت متنی (بدون مصرف سنگین سری Gemini 4)
      const geminiTextModels = [
        "gemini-3.5-flash",
        "gemini-3.7-flash",
        "gemini-omni-1.2-flash",
        "gemini-3.6-flash",
        "gemini-2.5-flash",
        "gemini-3.8-flash",
        "gemini-omni-1.1-flash",
        "gemini-3-flash-preview",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.1-flash-lite-preview",
        "gemini-2.5-flash-lite",
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
        "gemma-4-26b-a4b-it",
        "gemma-4-31b-it",
      ];

      const geminiActiveList =
        rawImages.length > 0 ? geminiVisionModels : geminiTextModels;

      // آماده‌سازی چندتصویر برای Gemini
      const geminiParts: any[] = [{ text: systemPrompt }];
      rawImages.forEach((img) => {
        geminiParts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data,
          },
        });
      });

      for (const modelName of geminiActiveList) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

        try {
          console.log(`⚡ تلاش روی Gemini [${modelName}]...`);
          const response = await undiciFetch(geminiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Connection: "close",
            },
            body: JSON.stringify({
              contents: [{ parts: geminiParts }],
              generationConfig: {
                temperature: 0.4,
              },
            }),
            dispatcher,
          });

          if (response.ok) {
            const data: any = await response.json();
            const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (reply) {
              console.log(`✅ پاسخ موفق از Gemini [${modelName}]`);
              return NextResponse.json({
                reply,
                provider: "Gemini",
                modelUsed: modelName,
              });
            }
          }
          console.warn(
            `⚠️ Gemini مدل [${modelName}] در دسترس نبود (کد ${response.status}). سوئیچ به مدل بعدی...`
          );
        } catch (networkErr: any) {
          console.warn(
            `⚠️ خطای شبکه Gemini روی [${modelName}]: ${networkErr?.cause?.code || networkErr?.message}`
          );
        }
      }
    }

    return NextResponse.json(
      {
        error:
          "ارائه‌دهنده‌های هوش مصنوعی در حال حاضر پاسخگو نیستند، لطفاً وضعیت پروکسی را بررسی کنید.",
      },
      { status: 503 }
    );
  } catch (error: any) {
    console.error("Chat Server Error:", error);
    return NextResponse.json(
      { error: "خطای داخلی سرور در پردازش درخواست." },
      { status: 500 }
    );
  }
}