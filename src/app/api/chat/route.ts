import { NextResponse } from "next/server";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { supabase } from "@/lib/supabase";
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
    "کلاس",
    "درس",
    "استاد",
    "دکتر",
    "ساعت",
    "چند",
    "کی",
    "کجاست",
    "کجا",
    "روز",
    "چه",
    "دارم",
    "داریم",
    "ارائه",
    "میشه",
    "می‌شود",
    "است",
    "هست",
    "برای",
    "در",
    "از",
    "به",
    "با",
    "را",
    "رو",
    "من",
    "ما",
    "لیست",
    "برنامه",
    "شماره",
    "کد",
    "امتحان",
    "ظرفیت",
    "واحد",
    "گروه",
    "سلام",
    "خوبی",
    "چطوری",
    "چخبر",
    "کمک",
    "دانشگاه",
    "رازی",
    "ترم",
    "چیه",
    "چیست",
  ];

  const keywords = cleanQuery
    .split(/[\s،؟?.,!]+/)
    .filter((word) => word.length > 1 && !stopWords.includes(word));

  if (keywords.length === 0) {
    return [];
  }

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
      if (searchableText.includes(word)) {
        score += 1;
      }
    }

    return { course, score };
  });

  const matched = scoredCourses
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.course);

  return matched.slice(0, 25);
}

export async function POST(req: Request) {
  try {
    const { message, image } = await req.json();

    if ((!message || typeof message !== "string") && !image) {
      return NextResponse.json(
        { error: "لطفاً یک پیام یا تصویر معتبر ارسال کنید." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const proxyUrl = process.env.PROXY_URL?.trim();

    if (!apiKey) {
      return NextResponse.json(
        { error: "کلید GEMINI_API_KEY در فایل .env.local پیدا نشد!" },
        { status: 500 }
      );
    }

    // ۱. خواندن دروس زنده از دیتابیس ابری Supabase (و استفاده از فایل محلی به عنوان پشتیبان خودکار)
    let activeCourses: Course[] = (coursesData as any).courses as Course[];
    try {
      const { data: dbCourses, error: dbErr } = await supabase
        .from("courses")
        .select("*");

      if (!dbErr && dbCourses && dbCourses.length > 0) {
        activeCourses = dbCourses as Course[];
        console.log(
          `📊 تعداد ${activeCourses.length} درس به صورت زنده از دیتابیس Supabase خوانده شد.`
        );
      } else {
        console.log(
          "📂 دیتابیس ابری خالی است یا در دسترس نیست؛ استفاده خودکار از فایل JSON محلی."
        );
      }
    } catch (e) {
      console.warn("⚠️ خطا در اتصال به Supabase، استفاده از فایل JSON پشتیبان.");
    }

    // ۲. پیدا کردن دروس مرتبط با سوال کاربر
    const relevantCourses = message
      ? findRelevantCourses(message, activeCourses)
      : [];

    const coursesContext =
      relevantCourses.length > 0
        ? `\nاطلاعات دروس استخراج‌شده از سیستم گلستان مرتبط با پیام کاربر:\n${JSON.stringify(relevantCourses, null, 2)}`
        : `\n(نکته سیستمی: برای این پیام کاربر، درس خاصی در دیتابیس جستجو نشد یا پیام جنبه عمومی/مبهم دارد.)`;

    const systemPrompt = `
تو «دستیار هوشمند دانشگاه رازی کرمانشاه» (دانشکده علوم - نیمسال اول ۱۴۰۵-۱۴۰۶) هستی.
شخصیت تو: یک هم‌دانشگاهی باهوش، صمیمی، خوش‌برخورد و همه‌فن‌حریف که هم می‌تواند درباره مسائل روزمره، برنامه‌نویسی، درس خواندن و سوالات عمومی گپ بزند و هم اطلاعات دقیق انتخاب واحد را ارائه دهد.

نحوه برخورد با پیام‌های مختلف کاربر:

حالت ۱ - گفتگوی آزاد، احوال‌پرسی و سوالات عمومی یا علمی:
- اگر کاربر سلام کرد، گپ زد، درد و دل دانشجویی کرد، یا سوال عمومی و علمی پرسید، کاملاً آزادانه، طبیعی، صمیمی و هوشمندانه با او گفتگو کن و به سوالاتش جواب کامل بده.

حالت ۲ - سوالات مبهم درباره کلاس و امتحان خود دانشجو:
- اگر کاربر سوالی درباره برنامه خودش پرسید ولی نام درس یا استاد را نگفت (مثلاً «کلاس من کجاست؟»، «فردا چی دارم؟»)، به او بگو:
  «رفیق، برای اینکه بتونم دقیق بهت بگم، لطفاً **نام درس**، **نام استاد** یا **کد درس** رو بهم بگو تا سریع از لیست دروس این ترم برات چک کنم که کلاست چه روزی، چه ساعتی و کجا برگزار میشه!»

حالت ۳ - سوالات مشخص درباره دروس ارائه شده، اساتید، زمان یا مکان کلاس‌ها:
- وقتی کاربر نام یک درس، رشته، روز یا استاد خاص را پرسید، **فقط و فقط** بر اساس «اطلاعات دروس استخراج‌شده» به او پاسخ بده و موارد زیر را به شکل بولت‌پوینت تمیز بنویس:
  • 📌 **نام درس و گروه** (به همراه کد درس)
  • 👨‍🏫 **نام استاد** (نام را به شکل طبیعی بنویس، مثلاً به جای "پارسایی مجد لیلا" بگو "دکتر لیلا پارسایی مجد")
  • 🕒 **زمان برگزاری** (روز، ساعت، و اشاره به هفته زوج/فرد یا حل تمرین در صورت وجود)
  • 📍 **مکان برگزاری**
  • 📝 **تاریخ و ساعت امتحان پایان‌ترم**
- اگر کاربر نام درس یا استادی را پرسید که در «اطلاعات دروس استخراج‌شده» وجود نداشت، هرگز از خودت ساعت و کلاسی نساز! صادقانه بگو که این درس در لیست دروس ارائه‌شده‌ی این ترم دانشکده علوم پیدا نشد.
${coursesContext}

پیام کاربر:
${message || "لطفاً این تصویر را بررسی و تحلیل کن."}
`;

    const dispatcher = proxyUrl
      ? new ProxyAgent({
          uri: proxyUrl,
          connectTimeout: 30000,
          allowH2: false,
        })
      : undefined;

    // لیست مدل‌های متنی (سریع و کم‌مصرف - بدون Argon)
    const textModels = [
      "gemini-3.5-flash",
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-2.5-flash",
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash-lite",
      "gemini-flash-latest",
      "gemma-4-31b-it",
    ];

    // لیست مدل‌های تصویری و تحلیلی سنگین (برای گزارش ۲۷۲)
    const visionAndHeavyModels = [
      "gemini-2.5-flash",
      "gemini-3.5-flash",
      "gemini-3.7-flash",
      "gemini-3.8-flash",
      "gemini-2.5-pro",
      "gemini-3.1-pro-preview",
    ];

    const activeModelList = image ? visionAndHeavyModels : textModels;

    const parts: any[] = [{ text: systemPrompt }];
    if (image && image.data && image.mimeType) {
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        },
      });
    }

    let lastErrorData: any = null;
    let lastStatus = 500;

    for (const modelName of activeModelList) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const fetchOptions: any = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Connection: "close",
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.5,
          },
        }),
        dispatcher,
      };

      try {
        console.log(`🔄 در حال امتحان مدل: ${modelName}...`);
        const response = await undiciFetch(geminiUrl, fetchOptions);
        const data: any = await response.json();

        if (response.ok) {
          const reply =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "متأسفانه نتوانستم پاسخی تولید کنم.";
          console.log(`✅ پاسخ با موفقیت از مدل [ ${modelName} ] دریافت شد!`);
          return NextResponse.json({ reply, modelUsed: modelName });
        }

        lastErrorData = data;
        lastStatus = response.status;

        if (
          response.status === 503 ||
          response.status === 429 ||
          response.status === 404
        ) {
          console.warn(
            `⚠️ مدل ${modelName} شلوغ است (کد ${response.status}). سوئیچ خودکار به مدل بعدی...`
          );
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }

        break;
      } catch (networkErr: any) {
        console.warn(
          `⚠️ نوسان لحظه‌ای شبکه روی مدل ${modelName}. تلاش روی مدل بعدی...`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
    }

    return NextResponse.json(
      {
        error:
          lastErrorData?.error?.message ||
          "سرورهای گوگل در حال حاضر پاسخگو نیستند، لطفاً چند لحظه دیگر امتحان کنید.",
      },
      { status: lastStatus }
    );
  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json(
      {
        error: "خطای داخلی در سرور رخ داد.",
      },
      { status: 500 }
    );
  }
}