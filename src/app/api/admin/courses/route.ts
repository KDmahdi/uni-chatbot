import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function getSupabaseRole() {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!raw) return "missing";

  try {
    const payload = raw.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")).role || "unknown";
  } catch {
    return "invalid";
  }
}

function logSupabaseError(label: string, error: unknown) {
  const typedError = error as {
    message?: string;
    code?: string | number;
    details?: string;
    hint?: string;
    status?: number;
    stack?: string;
    cause?: unknown;
  };

  console.error(`❌ ${label}:`, {
    message: typedError?.message || "Unknown Supabase error",
    code: typedError?.code || null,
    details: typedError?.details || null,
    hint: typedError?.hint || null,
    status: typedError?.status || null,
    stack: typedError?.stack || null,
    cause: typedError?.cause || null,
  });
}

// ۱. دریافت دروس از دیتابیس
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      logSupabaseError("Supabase GET Error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ courses: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Server GET Error:", {
      message,
      stack: err instanceof Error ? err.stack : undefined,
      cause: err instanceof Error ? err.cause : undefined,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ۲. ذخیره دروس در دیتابیس (بدون خطای آیدی تکراری)
export async function POST(req: Request) {
  try {
    const { courses } = await req.json();

    if (!Array.isArray(courses)) {
      return NextResponse.json(
        { error: "فرمت لیست دروس نامعتبر است." },
        { status: 400 }
      );
    }

    const roleName = getSupabaseRole();
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ Supabase config missing", {
        hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        role: roleName,
      });
      return NextResponse.json(
        {
          error:
            "تنظیمات Supabase ناقص است: NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY را در .env.local وارد کنید.",
        },
        { status: 503 }
      );
    }

    if (roleName !== "service_role") {
      console.error("❌ Invalid Supabase key role for server writes", {
        role: roleName,
        expected: "service_role",
        proxy: process.env.PROXY_URL || null,
      });
      return NextResponse.json(
        {
          error:
            "کلید Supabase برای عملیات سروری معتبر نیست. لطفاً JWT با role=service_role از داشبورد Supabase وارد کنید.",
        },
        { status: 401 }
      );
    }

    if (courses.length === 0) {
      return NextResponse.json({ message: "تمامی دروس حذف شدند.", count: 0 });
    }

    const formattedCourses = courses.map((c, index) => ({
      id: `${c.course_code}_${c.group}_${index}`,
      course_code: String(c.course_code),
      group: String(c.group),
      course_name: String(c.course_name),
      department: String(c.department || "عمومی"),
      units:
        typeof c.units === "object"
          ? c.units
          : { total: Number(c.units) || 0, practical: 0 },
      instructors: Array.isArray(c.instructors)
        ? c.instructors
        : [String(c.instructors || "نامشخص")],
      gender: c.gender || "مختلط",
      capacity: Number(c.capacity) || 0,
      enrolled: Number(c.enrolled) || 0,
      waitlist: Number(c.waitlist) || 0,
      sessions: Array.isArray(c.sessions) ? c.sessions : [],
      exam: c.exam || null,
      notes: c.notes || null,
    }));

    const payloadSize = new TextEncoder().encode(JSON.stringify(formattedCourses)).length;
    if (payloadSize > 900_000) {
      return NextResponse.json(
        {
          error: "حجم داده دروس بسیار زیاد است و از محدودیت سرور عبور می‌کند. لطفاً داده را به چندین بسته تقسیم کنید.",
        },
        { status: 413 }
      );
    }

    console.log("ℹ️ Persisting courses to Supabase", {
      count: formattedCourses.length,
      payloadBytes: payloadSize,
      proxy: process.env.PROXY_URL || null,
      keyRole: roleName,
    });

    const { error: deleteErr } = await supabase
      .from("courses")
      .delete()
      .neq("id", "__never_match__");

    if (deleteErr) {
      logSupabaseError("Supabase Delete Before Insert Error", deleteErr);
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    const { error: insertErr } = await supabase
      .from("courses")
      .insert(formattedCourses);

    if (insertErr) {
      logSupabaseError("Supabase INSERT Error", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    console.log(`✅ تعداد ${formattedCourses.length} درس با موفقیت در Supabase ذخیره شد!`);
    return NextResponse.json({
      message: "تمامی دروس با موفقیت در دیتابیس ابری ذخیره شدند.",
      count: formattedCourses.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Server POST Error:", {
      message,
      stack: err instanceof Error ? err.stack : undefined,
      cause: err instanceof Error ? err.cause : undefined,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ۳. حذف کامل یا حذف تکی دروس
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const courseCode = searchParams.get("course_code");
    const group = searchParams.get("group");

    if (courseCode && group) {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("course_code", courseCode)
        .eq("group", group);

      if (error) {
        logSupabaseError("Supabase Single Delete Error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ message: "درس با موفقیت حذف شد." });
    }

    const { error } = await supabase
      .from("courses")
      .delete()
      .neq("id", "__never_match__");

    if (error) {
      logSupabaseError("Supabase Reset Error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("🗑️ کل جدول دروس در Supabase پاکسازی شد.");
    return NextResponse.json({ message: "پایگاه داده دروس با موفقیت پاکسازی شد." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Server DELETE Error:", {
      message,
      stack: err instanceof Error ? err.stack : undefined,
      cause: err instanceof Error ? err.cause : undefined,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}