import { NextResponse } from "next/server";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import coursesData from "@/data/razi_courses_1405-1406_term1.json";

// ۱. تعریف تایپ‌ها (TypeScript Interfaces) برای اینکه ادیتور ساختار دیتای ما رو بشناسه
interface Session {
  kind: string;
  is_tutorial: boolean;
  day: string;
  start: string;
  end: string;
  week: string | null;
  location: string | null;
}

interface Course {
  id: string;
  course_code: string;
  group: string;
  course_name: string;
  department: string;
  units: {
    total: number;
    practical: number;
  };
  instructors: string[];
  gender: string;
  capacity: number;
  enrolled: number;
  waitlist: number;
  sessions: Session[];
  exam: {
    date: string;
    start: string;
    end: string;
  } | null;
  notes: string | null;
}

// ۲. تابع کمکی برای یکدست کردن حروف فارسی و عربی (ی و ک)
function normalizePersian(text: string): string {
  return text
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim();
}

// ۳. تابع جستجوی هوشمند در بین ۳۳۴ درس دانشگاه رازی
function findRelevantCourses(userQuery: string): Course[] {
  const cleanQuery = normalizePersian(userQuery);
  
  // کلمات اضافه و روزمره رو حذف می‌کنیم تا فقط کلمات کلیدی (مثل اسم درس، استاد یا روز) بمونه
  const stopWords = [
    "کلاس", "درس", "استاد", "دکتر", "ساعت", "چند", "کی", "کجاست", "کجا",
    "روز", "چه", "دارم", "داریم", "ارائه", "میشه", "می‌شود", "است", "هست",
    "برای", "در", "از", "به", "با", "را", "رو", "من", "ما", "لیست", "برنامه",
    "شماره", "کد", "امتحان", "ظرفیت", "واحد", "گروه"
  ];

  // جمله کاربر رو تکه تکه می‌کنیم (تبدیل جمله به آرایه‌ای از کلمات)
  const keywords = cleanQuery
    .split(/[\s،؟?.,!]+/)
    .filter((word) => word.length > 1 && !stopWords.includes(word));

  const allCourses = coursesData.courses as Course[];

  // اگر کاربر سوال کلی پرسیده بود (مثلاً "سلام" یا "راهنمایی کن")، ۱۰ درس اول رو به عنوان نمونه می‌دیم
  if (keywords.length === 0) {
    return allCourses.slice(0, 10);
  }

  // به هر درس بر اساس اینکه چقدر با کلمات کاربر تطابق داره امتیاز می‌دیم
  const scoredCourses = allCourses.map((course) => {
    let score = 0;

    // تمام اطلاعات یک درس رو به یک متن واحد تبدیل می‌کنیم تا راحت توش بگردیم
    // نکته: instructors.join(" ") همون ترفندیه که تکه شدن اسم اساتید رو به هم می‌چسبونه!
    const searchableText = normalizePersian(
      `${course.course_name} ${course.course_code} ${course.department} ${course.instructors.join(" ")} ${course.sessions.map((s) => `${s.day}${s.location}`).join(" ")}`
    );

    for (const word of keywords) {
      if (searchableText.includes(word)) {
        score += 1;
      }
    }

    return { course, score };
  });

  // درس‌هایی که حداقل ۱ امتیاز آوردن رو جدا می‌کنیم و از بیشترین امتیاز به کمترین مرتب می‌کنیم
  const matched = scoredCourses
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.course);

  // حداکثر ۲۵ درس اول رو برمی‌گردونیم تا پرامپت سبک و سریع بمونه
  return matched.length > 0 ? matched.slice(0, 25) : allCourses.slice(0, 10);
}

// ۴. تابع اصلی POST که درخواست‌های فرانت‌اند رو دریافت و پردازش می‌کنه
export async function POST(req: Request) {
  try {
    // گرفتن پیام کاربر از بدنه درخواست (Destructuring در جاوااسکریپت)
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "لطفاً یک پیام معتبر وارد کنید." },
        { status: 400 }
      );
    }

    // خواندن کلید گوگل و آدرس پروکسی از فایل .env.local
    const apiKey = process.env.GEMINI_API_KEY;
    const proxyUrl = process.env.PROXY_URL;

    if (!apiKey) {
      return NextResponse.json(
        { error: "کلید GEMINI_API_KEY در فایل .env.local پیدا نشد!" },
        { status: 500 }
      );
    }

    // پیدا کردن دروس مرتبط با سوال کاربر
    const relevantCourses = findRelevantCourses(message);

    // ساختن دستورالعمل سیستم (System Prompt) برای جمینای
const systemPrompt = `
تو «دستیار هوشمند آموزشی دانشگاه رازی کرمانشاه» (ویژه دانشکده علوم - نیمسال اول ۱۴۰۵-۱۴۰۶) هستی.
لحن تو باید بسیار محترمانه، صمیمی، دانشجوپسند، واضح و راهنما باشد.

وظایف و قوانین رفتاری تو:
1. اگر دانشجو سوال مبهمی پرسید و نام درس یا استاد را نگفت (مثلاً گفت: «کلاس من کجاست؟»، «امتحانم کیه؟» یا «ساعت کلاسم چنده؟»)، به هیچ وجه از خودت درسی را مثال نزن! در عوض خیلی محترمانه بگو:
   «عزیزم، برای اینکه بتونم دقیق کمکت کنم، لطفاً **نام درس**، **نام استاد** یا **کد درس** رو بهم بگو تا سریع برات چک کنم که کلاست چه روزی، چه ساعتی و توی کدوم کلاس برگزار میشه و امتحانت کی هست!»

2. اگر دانشجو نام درس یا استاد را گفت، فقط و فقط بر اساس «اطلاعات دروس استخراج‌شده» در پایین به او جواب بده و این موارد را به صورت دسته‌بندی‌شده (بولت‌پوینت) مشخص کن:
   - 📌 **نام درس و گروه** (به همراه کد درس)
   - 👨‍🏫 **نام استاد** (نام خانوادگی و نام کوچک را به شکل طبیعی بنویس، مثلاً: دکتر لیلا پارسایی مجد)
   - 🕒 **زمان و روز برگزاری** (اگر هفته زوج یا فرد است یا کلاس حل تمرین دارد حتماً تاکید کن)
   - 📍 **مکان برگزاری** (شماره کلاس، تالار یا آزمایشگاه)
   - 📝 **تاریخ و ساعت امتحان پایان‌ترم** (اگر امتحان نداشت بگو: بدون امتحان نهایی / عملی)

3. اگر درس یا استادی که دانشجو پرسیده در لیست زیر وجود نداشت، صادقانه بگو: «متأسفانه این درس یا استاد رو توی لیست دروس ارائه‌شده‌ی این ترم دانشکده علوم پیدا نکردم. مطمئنی اسم درس رو درست وارد کردی؟» و هرگز اطلاعات خیالی نساز.

اطلاعات دروس استخراج‌شده از سیستم گلستان مرتبط با پیام کاربر:
${JSON.stringify(relevantCourses, null, 2)}

پیام دانشجو:
${message}
`;

    // آدرس رسمی API گوگل برای مدل پرسرعت و رایگان gemini-2.5-flash
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    // تنظیمات ارسال درخواست به گوگل
    const fetchOptions: any = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: systemPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2, // دمای پایین برای اینکه جواب‌ها کاملاً دقیق و بدون توهم باشه
        },
      }),
    };

    // اگر در فایل .env.local پروکسی ست شده بود، ترافیک رو از تونل پروکسی هیدیفای رد کن
    if (proxyUrl) {
      fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
    }

    // ارسال درخواست به سرورهای گوگل با استفاده از undiciFetch
    const response = await undiciFetch(geminiUrl, fetchOptions);
    const data: any = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return NextResponse.json(
        { error: data?.error?.message || "خطا در دریافت پاسخ از سمت گوگل" },
        { status: response.status }
      );
    }

    // بیرون کشیدن متن جواب از داخل آبجکت برگشتی گوگل
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "متأسفانه نتوانستم پاسخی تولید کنم.";

    // برگرداندن جواب نهایی به فرانت‌اند
    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json(
      {
        error:
          "خطا در برقراری ارتباط با سرور هوش مصنوعی! مطمئن شو هیدیفای روشن است و پورت پروکسی در .env.local درست وارد شده.",
      },
      { status: 500 }
    );
  }
}