"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  DragEvent,
  ChangeEvent,
  FormEvent,
} from "react";
import styles from "./admin.module.css";

// ============================================================================
// TypeScript Interfaces & Schema Definitions (منطبق با دیتای دانشگاه رازی)
// ============================================================================

export interface CourseSession {
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

export interface CourseExam {
  date: string;
  start?: string;
  end?: string;
  time?: string;
}

export interface CourseUnitsObject {
  total: number;
  practical?: number;
}

export interface CourseItem {
  id?: string;
  course_code: string;
  group: string;
  course_name: string;
  department: string;
  units: number | CourseUnitsObject;
  instructors: string[];
  gender?: string;
  capacity?: number;
  enrolled?: number;
  waitlist?: number;
  sessions: CourseSession[];
  exam: CourseExam | null;
  notes?: string | null;
}

export interface CoursesPayload {
  university?: string;
  faculty?: string;
  term?: string;
  total_sections?: number;
  courses: CourseItem[];
}

interface ToastNotification {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  details?: string[];
}

// ============================================================================
// Constants & Sample Initial Data
// ============================================================================

const SESSION_AUTH_KEY = "admin_dashboard_authenticated";
const THEME_STORAGE_KEY = "admin_dashboard_theme";
const DEFAULT_PASSCODE = "admin1405";

const INITIAL_SAMPLE_COURSES: CourseItem[] = [
  {
    id: "2016014_01",
    course_code: "2016014",
    group: "01",
    course_name: "ساختمان داده ها و الگوریتم",
    department: "گروه ریاضی",
    units: { total: 4, practical: 0 },
    instructors: ["پارسایی مجد لیلا"],
    gender: "مختلط",
    capacity: 51,
    enrolled: 51,
    waitlist: 0,
    sessions: [
      {
        kind: "نظری",
        is_tutorial: false,
        day: "یکشنبه",
        start: "08:00",
        end: "10:00",
        week: null,
        location: "کلاس شماره 207",
      },
      {
        kind: "نظری",
        is_tutorial: false,
        day: "سه‌شنبه",
        start: "08:00",
        end: "10:00",
        week: null,
        location: "کلاس شماره 207",
      },
    ],
    exam: { date: "1405/10/26", start: "10:30", end: "12:30" },
    notes: null,
  },
  {
    id: "2016490_01",
    course_code: "2016490",
    group: "01",
    course_name: "برنامه سازی پیشرفته",
    department: "گروه ریاضی",
    units: { total: 4, practical: 0 },
    instructors: ["پارسایی مجد لیلا"],
    gender: "مختلط",
    capacity: 55,
    enrolled: 51,
    waitlist: 0,
    sessions: [
      {
        kind: "نظری",
        is_tutorial: false,
        day: "دوشنبه",
        start: "13:30",
        end: "15:30",
        week: null,
        location: "کلاس 5",
      },
      {
        kind: "نظری",
        is_tutorial: false,
        day: "چهارشنبه",
        start: "13:30",
        end: "15:30",
        week: null,
        location: "کلاس 5",
      },
    ],
    exam: { date: "1405/10/21", start: "10:30", end: "12:30" },
    notes: null,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function toPersianDigits(value: number | string | undefined | null): string {
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(value ?? "").replace(/\d/g, (digit) => persianDigits[Number(digit)]);
}

function getCourseTotalUnits(units: number | CourseUnitsObject | undefined): number {
  if (typeof units === "number") {
    return Number.isNaN(units) ? 0 : units;
  }
  if (units && typeof units === "object" && "total" in units) {
    return Number(units.total) || 0;
  }
  return 0;
}

function validateCoursesPayload(data: unknown): {
  valid: boolean;
  courses: CourseItem[];
  errors: string[];
} {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return {
      valid: false,
      courses: [],
      errors: [
        "ساختار فایل JSON نامعتبر است؛ ریشه فایل باید یک شیء (Object) حاوی آرایه courses باشد.",
      ],
    };
  }

  const record = data as Record<string, unknown>;
  if (!Array.isArray(record.courses)) {
    return {
      valid: false,
      courses: [],
      errors: ["کلید «courses» در فایل JSON یافت نشد یا از نوع آرایه (Array) نیست."],
    };
  }

  const validatedCourses: CourseItem[] = [];

  record.courses.forEach((item: unknown, index: number) => {
    const rowNum = toPersianDigits(index + 1);
    if (!item || typeof item !== "object") {
      errors.push(`ردیف ${rowNum}: آیتم درس باید یک شیء معتبر باشد.`);
      return;
    }

    const obj = item as Record<string, unknown>;
    const courseCode = String(obj.course_code ?? "").trim();
    const group = String(obj.group ?? "01").trim();
    const courseName = String(obj.course_name ?? "").trim();
    const department = String(obj.department ?? "عمومی").trim();

    if (!courseCode || !courseName) {
      errors.push(`ردیف ${rowNum}: کد درس و نام درس نمی‌توانند خالی باشند.`);
      return;
    }

    // پشتیبانی همزمان از واحد به صورت عدد یا آبجکت { total, practical }
    let parsedUnits: number | CourseUnitsObject = { total: 0, practical: 0 };
    if (typeof obj.units === "object" && obj.units !== null) {
      const uObj = obj.units as Record<string, unknown>;
      const totalNum = Number(uObj.total ?? 0);
      const practicalNum = Number(uObj.practical ?? 0);
      if (Number.isNaN(totalNum) || totalNum < 0) {
        errors.push(`ردیف ${rowNum} (${courseName}): مقدار واحد کل (total) نامعتبر است.`);
        return;
      }
      parsedUnits = {
        total: totalNum,
        practical: Number.isNaN(practicalNum) ? 0 : practicalNum,
      };
    } else if (obj.units !== undefined && obj.units !== null) {
      const uNum = Number(obj.units);
      if (Number.isNaN(uNum) || uNum < 0) {
        errors.push(`ردیف ${rowNum} (${courseName}): مقدار «units» باید عدد معتبر باشد.`);
        return;
      }
      parsedUnits = { total: uNum, practical: 0 };
    }

    // استخراج اساتید
    let instructorsList: string[] = [];
    if (Array.isArray(obj.instructors)) {
      instructorsList = obj.instructors
        .map((ins) => String(ins).trim())
        .filter(Boolean);
    } else if (typeof obj.instructors === "string" && obj.instructors.trim()) {
      instructorsList = [obj.instructors.trim()];
    }

    // استخراج جلسات هفتگی (پشتیبانی از start/end و start_time/end_time)
    const parsedSessions: CourseSession[] = [];
    if (Array.isArray(obj.sessions)) {
      for (let sIdx = 0; sIdx < obj.sessions.length; sIdx++) {
        const s = obj.sessions[sIdx];
        if (!s || typeof s !== "object") continue;
        const sObj = s as Record<string, unknown>;
        const startVal = String(sObj.start ?? sObj.start_time ?? "").trim();
        const endVal = String(sObj.end ?? sObj.end_time ?? "").trim();
        parsedSessions.push({
          kind: sObj.kind ? String(sObj.kind).trim() : "نظری",
          is_tutorial: Boolean(sObj.is_tutorial),
          day: String(sObj.day ?? sObj.weekday ?? "نامشخص").trim(),
          start: startVal,
          end: endVal,
          start_time: startVal,
          end_time: endVal,
          week: sObj.week ? String(sObj.week).trim() : null,
          location: sObj.location ? String(sObj.location).trim() : null,
        });
      }
    }

    // استخراج امتحان (پشتیبانی کامل از null برای دروس آزمایشگاهی/پروژه)
    let parsedExam: CourseExam | null = null;
    if (obj.exam && typeof obj.exam === "object" && !Array.isArray(obj.exam)) {
      const eObj = obj.exam as Record<string, unknown>;
      parsedExam = {
        date: String(eObj.date ?? eObj.exam_date ?? "اعلام نشده").trim(),
        start: eObj.start ? String(eObj.start).trim() : undefined,
        end: eObj.end ? String(eObj.end).trim() : undefined,
        time: eObj.time ? String(eObj.time).trim() : undefined,
      };
    } else if (typeof obj.exam === "string" && obj.exam.trim()) {
      parsedExam = { date: obj.exam.trim() };
    }

    validatedCourses.push({
      id: String(obj.id ?? `${courseCode}_${group}_${index}`),
      course_code: courseCode,
      group: group || "01",
      course_name: courseName,
      department,
      units: parsedUnits,
      instructors: instructorsList.length > 0 ? instructorsList : ["نامشخص"],
      gender: String(obj.gender ?? "مختلط"),
      capacity: Number(obj.capacity) || 0,
      enrolled: Number(obj.enrolled) || 0,
      waitlist: Number(obj.waitlist) || 0,
      sessions: parsedSessions,
      exam: parsedExam,
      notes: obj.notes ? String(obj.notes) : null,
    });
  });

  return {
    valid: errors.length === 0,
    courses: validatedCourses,
    errors,
  };
}

// ============================================================================
// Main Admin Dashboard Component
// ============================================================================

export default function AdminDashboardPage() {
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcodeInput, setPasscodeInput] = useState<string>("");
  const [passcodeError, setPasscodeError] = useState<string>("");

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetConfirmationText, setResetConfirmationText] = useState<string>("");

  const addToast = (
    type: "success" | "error" | "info",
    title: string,
    details?: string[]
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [{ id, type, title, details }, ...prev.slice(0, 3)]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // دریافت وضعیت ورود، تم و بارگذاری دروس زنده از دیتابیس Supabase
  useEffect(() => {
    try {
      const savedAuth = sessionStorage.getItem(SESSION_AUTH_KEY);
      if (savedAuth === "true") {
        setIsAuthenticated(true);
      }

      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as
        | "light"
        | "dark"
        | null;
      const htmlTheme = document.documentElement.getAttribute("data-theme") as
        | "light"
        | "dark"
        | null;
      const initialTheme = savedTheme || htmlTheme || "dark";
      setTheme(initialTheme);
      document.documentElement.setAttribute("data-theme", initialTheme);

      fetch("/api/admin/courses")
        .then((res) => res.json())
        .then((data) => {
          if (data.courses && Array.isArray(data.courses)) {
            setCourses(data.courses);
          }
        })
        .catch((err) => console.error("خطا در دریافت دروس از سرور:", err));
    } catch (err) {
      console.error("خطا در پردازش اولیه:", err);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // ذخیره دروس در دیتابیس ابری Supabase از طریق API
 const saveCoursesToStorage = async (updatedCourses: CourseItem[]) => {
    setCourses(updatedCourses);
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courses: updatedCourses }),
      });

      let resData: any = {};
      try {
        resData = await response.json();
      } catch {
        resData = { error: "پاسخ سرور نامعتبر است." };
      }

      if (!response.ok) {
        console.error("❌ Save courses failed:", {
          status: response.status,
          body: resData,
        });
        addToast("error", "خطا در ذخیره اطلاعات در دیتابیس ابری", [
          resData.error || "ارتباط با سرور برقرار نشد.",
        ]);
        return;
      }
      addToast(
        "success",
        `تمامی ${toPersianDigits(updatedCourses.length)} درس با موفقیت در دیتابیس ابری (Supabase) ذخیره شدند.`
      );
    } catch (err: any) {
      console.error("❌ Network error while saving courses:", err);
      addToast("error", "خطا در ذخیره اطلاعات در دیتابیس ابری", [err.message]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Ignore storage error
    }
  };

  // ============================================================================
  // 1. Passcode Protection Handlers
  // ============================================================================

  const handlePasscodeSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passcodeInput.trim() === DEFAULT_PASSCODE) {
      sessionStorage.setItem(SESSION_AUTH_KEY, "true");
      setIsAuthenticated(true);
      setPasscodeError("");
      setPasscodeInput("");
      addToast("success", "ورود با موفقیت انجام شد. به پنل مدیریت دروس خوش آمدید.");
    } else {
      setPasscodeError("رمز عبور وارد شده اشتباه است. لطفاً مجدداً تلاش کنید.");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    setIsAuthenticated(false);
    setPasscodeInput("");
    setPasscodeError("");
  };

  // ============================================================================
  // 2. JSON Upload, Sample Loader & Schema Validation
  // ============================================================================

  const processUploadedFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".json")) {
      addToast("error", "فرمت فایل نامعتبر است", [
        "لطفاً فقط فایل با پسوند .json بارگذاری نمایید.",
      ]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawText = event.target?.result as string;
        const parsedJson = JSON.parse(rawText);
        const validation = validateCoursesPayload(parsedJson);

        if (!validation.valid) {
          addToast(
            "error",
            `خطای اعتبارسنجی ساختار فایل (${toPersianDigits(validation.errors.length)} مورد خطا)`,
            validation.errors.slice(0, 6)
          );
          return;
        }

        saveCoursesToStorage(validation.courses);
      } catch {
        addToast("error", "خطا در خواندن فایل JSON", [
          "ساختار نحوی (Syntax) فایل JSON معیوب است و قابل پردازش نیست.",
        ]);
      }
    };

    reader.onerror = () => {
      addToast("error", "خطا در بارگذاری فایل از سیستم شما.");
    };

    reader.readAsText(file, "utf-8");
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
      e.target.value = "";
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleLoadInitialSample = () => {
    saveCoursesToStorage(INITIAL_SAMPLE_COURSES);
  };

  // ============================================================================
  // 3. Metrics Calculation
  // ============================================================================

  const metrics = useMemo(() => {
    const totalCourses = courses.length;
    const uniqueDepartments = new Set<string>();
    const uniqueInstructors = new Set<string>();
    let totalUnits = 0;

    courses.forEach((course) => {
      if (course.department?.trim()) {
        uniqueDepartments.add(course.department.trim());
      }
      course.instructors?.forEach((inst) => {
        if (inst?.trim()) {
          uniqueInstructors.add(inst.trim());
        }
      });
      totalUnits += getCourseTotalUnits(course.units);
    });

    return {
      totalCourses,
      departmentsCount: uniqueDepartments.size,
      instructorsCount: uniqueInstructors.size,
      totalUnits,
    };
  }, [courses]);

  const departmentsList = useMemo(() => {
    const depts = new Set<string>();
    courses.forEach((c) => {
      if (c.department?.trim()) depts.add(c.department.trim());
    });
    return Array.from(depts).sort((a, b) => a.localeCompare(b, "fa"));
  }, [courses]);

  // ============================================================================
  // 4. Courses Filtering & Row Actions
  // ============================================================================

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesDept =
        selectedDepartment === "ALL" ||
        course.department?.trim() === selectedDepartment;

      if (!matchesDept) return false;
      if (!query) return true;

      const nameMatch = course.course_name?.toLowerCase().includes(query);
      const codeMatch = `${course.course_code}-${course.group}`
        .toLowerCase()
        .includes(query);
      const instructorMatch = course.instructors?.some((inst) =>
        inst.toLowerCase().includes(query)
      );

      return Boolean(nameMatch || codeMatch || instructorMatch);
    });
  }, [courses, searchQuery, selectedDepartment]);

  const handleDeleteCourse = async (
    courseCode: string,
    group: string,
    courseName: string
  ) => {
    // حذف فوری از ظاهر جدول
    const updated = courses.filter(
      (c) => !(c.course_code === courseCode && c.group === group)
    );
    setCourses(updated);

    try {
      const res = await fetch(
        `/api/admin/courses?course_code=${encodeURIComponent(courseCode)}&group=${encodeURIComponent(group)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("خطا در حذف از دیتابیس");
      addToast(
        "info",
        `درس «${courseName}» (کد ${courseCode} - گروه ${group}) از دیتابیس حذف شد.`
      );
    } catch (err: any) {
      addToast("error", "خطا در حذف درس از سرور", [err.message]);
    }
  };
  // ============================================================================
  // 5. Export JSON & Danger Zone Reset
  // ============================================================================

  const handleExportJson = () => {
    const payload: CoursesPayload = {
      university: "دانشگاه رازی کرمانشاه",
      faculty: "دانشکده علوم",
      total_sections: courses.length,
      courses,
    };
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "razi_courses_updated.json";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    addToast(
      "success",
      "فایل razi_courses_updated.json با موفقیت آماده و دانلود شد."
    );
  };

  const handleConfirmResetDatabase = async () => {
    try {
      const res = await fetch("/api/admin/courses", { method: "DELETE" });
      if (!res.ok) throw new Error("خطا در پاکسازی سرور");

      setCourses([]);
      setSearchQuery("");
      setSelectedDepartment("ALL");
      setIsResetModalOpen(false);
      setResetConfirmationText("");
      addToast("info", "تمامی دروس با موفقیت از پایگاه داده ابری پاکسازی شدند.");
    } catch (err: any) {
      addToast("error", "خطا در پاکسازی دیتابیس", [err.message]);
    }
  };

  if (!isHydrated) {
    return (
      <div className={styles.pageWrapper} data-theme={theme} dir="rtl">
        <div className={styles.loadingScreen}>
          <div className={styles.spinner} />
          <p>در حال بارگذاری سامانه مدیریت دروس...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render Gatekeeper (Passcode Screen)
  // ============================================================================

  if (!isAuthenticated) {
    return (
      <div className={styles.pageWrapper} data-theme={theme} dir="rtl">
        <div className={styles.gatekeeperContainer}>
          <div className={styles.gatekeeperCard}>
            <div className={styles.gatekeeperTopBar}>
              <span className={styles.securityBadge}>دسترسی محدود مدیریت</span>
              <button
                type="button"
                onClick={handleToggleTheme}
                className={styles.iconButton}
                title="تغییر حالت نمایش (تاریک / روشن)"
                aria-label="تغییر تم"
              >
                {theme === "dark" ? "☀️ حالت روشن" : "🌙 حالت تاریک"}
              </button>
            </div>

            <div className={styles.gatekeeperIconBox}>
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <h1 className={styles.gatekeeperTitle}>
              پنل مدیریت دروس نیمسال دانشگاه رازی
            </h1>
            <p className={styles.gatekeeperSubtitle}>
              لطفاً جهت ورود به پیشخوان مدیریت و بروزرسانی دیتابیس ابری دروس، رمز
              عبور امنیتی را وارد نمایید.
            </p>

            <form
              onSubmit={handlePasscodeSubmit}
              className={styles.gatekeeperForm}
            >
              <div className={styles.inputGroup}>
                <label htmlFor="admin-passcode" className={styles.inputLabel}>
                  رمز عبور مدیریت
                </label>
                <input
                  id="admin-passcode"
                  type="password"
                  dir="ltr"
                  value={passcodeInput}
                  onChange={(e) => {
                    setPasscodeInput(e.target.value);
                    if (passcodeError) setPasscodeError("");
                  }}
                  placeholder="•••••••••"
                  className={styles.passcodeInput}
                  autoFocus
                  required
                />
              </div>

              {passcodeError && (
                <div className={styles.authErrorBox} role="alert">
                  <span>⚠️</span>
                  <span>{passcodeError}</span>
                </div>
              )}

              <button type="submit" className={styles.primaryAuthButton}>
                ورود به پنل مدیریت
              </button>
            </form>

            <div className={styles.gatekeeperHint}>
              <span>رمز پیش‌فرض سامانه:</span>
              <code dir="ltr">admin1405</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render Main Admin Dashboard
  // ============================================================================

  const isResetConfirmReady = resetConfirmationText.trim() === "حذف";

  return (
    <div className={styles.pageWrapper} data-theme={theme} dir="rtl">
      {toasts.length > 0 && (
        <div className={styles.toastContainer} aria-live="polite">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`${styles.toastCard} ${
                t.type === "success"
                  ? styles.toastSuccess
                  : t.type === "error"
                  ? styles.toastError
                  : styles.toastInfo
              }`}
            >
              <div className={styles.toastHeader}>
                <span className={styles.toastTitle}>
                  {t.type === "success" && "✅ "}
                  {t.type === "error" && "❌ "}
                  {t.type === "info" && "ℹ️ "}
                  {t.title}
                </span>
                <button
                  type="button"
                  onClick={() => dismissToast(t.id)}
                  className={styles.toastCloseBtn}
                  aria-label="بستن اعلان"
                >
                  ✕
                </button>
              </div>
              {t.details && t.details.length > 0 && (
                <ul className={styles.toastDetailsList}>
                  {t.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandSection}>
            <div className={styles.brandLogo}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <div>
              <h1 className={styles.headerTitle}>
                سامانه مدیریت دروس دانشگاه رازی (متصل به Supabase)
              </h1>
              <p className={styles.headerSubtitle}>
                {isSaving
                  ? "⏳ در حال همگام‌سازی اطلاعات با دیتابیس ابری..."
                  : "مدیریت یکپارچه فایل‌های JSON، پایش آمار واحدها و بروزرسانی جدول زمان‌بندی کلاس‌ها و امتحانات"}
              </p>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              onClick={handleToggleTheme}
              className={styles.themeToggleBtn}
              title="تغییر تم ظاهری"
            >
              {theme === "dark" ? "☀️ حالت روشن" : "🌙 حالت تاریک"}
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              disabled={courses.length === 0}
              className={styles.exportHeaderBtn}
              title="دریافت خروجی JSON از دروس فعلی"
            >
              <span>📥</span>
              <span>خروجی JSON</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className={styles.logoutBtn}
              title="خروج از حساب مدیریت"
            >
              <span>خروج</span>
              <span dir="ltr">/ Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className={styles.mainContainer}>
        <section
          className={styles.metricsSection}
          aria-label="خلاصه وضعیت آماری دروس"
        >
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper} data-accent="blue">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statLabel}>کل دروس ارائه‌شده</span>
              <strong className={styles.statValue}>
                {toPersianDigits(metrics.totalCourses)}
              </strong>
              <span className={styles.statMeta}>رشته-گروه ثبت‌شده در سامانه</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconWrapper} data-accent="purple">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statLabel}>گروه‌های آموزشی</span>
              <strong className={styles.statValue}>
                {toPersianDigits(metrics.departmentsCount)}
              </strong>
              <span className={styles.statMeta}>گروه آموزشی فعال در دانشکده</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconWrapper} data-accent="emerald">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statLabel}>تعداد اساتید</span>
              <strong className={styles.statValue}>
                {toPersianDigits(metrics.instructorsCount)}
              </strong>
              <span className={styles.statMeta}>استاد و مدرس منحصر‌به‌فرد</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconWrapper} data-accent="amber">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <div className={styles.statContent}>
              <span className={styles.statLabel}>مجموع واحدهای ارائه‌شده</span>
              <strong className={styles.statValue}>
                {toPersianDigits(metrics.totalUnits)}
              </strong>
              <span className={styles.statMeta}>واحد درسی در نیمسال جاری</span>
            </div>
          </div>
        </section>

        <section className={styles.managementGrid}>
          <div className={styles.uploadCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>
                  بارگذاری و اعتبارسنجی فایل دروس (.json)
                </h2>
                <p className={styles.sectionDesc}>
                  فایل JSON دروس نیمسال جدید را در کادر زیر رها کنید تا مستقیماً در
                  دیتابیس ابری ذخیره شود.
                </p>
              </div>
              {courses.length === 0 && (
                <button
                  type="button"
                  onClick={handleLoadInitialSample}
                  className={styles.sampleDataBtn}
                >
                  ⚡ بارگذاری داده‌های نمونه اولیه
                </button>
              )}
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`${styles.dropZone} ${
                isDragging ? styles.dropZoneActive : ""
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  fileInputRef.current?.click();
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className={styles.hiddenFileInput}
              />
              <div className={styles.dropZoneIcon}>📂</div>
              <p className={styles.dropZoneTitle}>
                فایل <code>razi_courses.json</code> را اینجا بکشید و رها کنید، یا
                جهت انتخاب فایل کلیک کنید
              </p>
              <span className={styles.dropZoneHint}>
                سازگار با ساختار استاندارد دروس گلستان دانشگاه رازی (شامل دروس نظری،
                عملی و آزمایشگاهی)
              </span>
            </div>
          </div>

          <div className={styles.actionsCard}>
            <div className={styles.actionBlock}>
              <h3 className={styles.actionBlockTitle}>
                پشتیبان‌گیری و خروجی اطلاعات
              </h3>
              <p className={styles.actionBlockDesc}>
                تمامی دروس موجود در دیتابیس را در قالب یک فایل استاندارد JSON دانلود
                کنید.
              </p>
              <button
                type="button"
                onClick={handleExportJson}
                disabled={courses.length === 0}
                className={styles.exportActionBtn}
              >
                <span>📥 دانلود فایل razi_courses_updated.json</span>
              </button>
            </div>

            <div className={styles.dangerZoneBlock}>
              <div className={styles.dangerHeader}>
                <span className={styles.dangerBadge}>منطقه خطر (Danger Zone)</span>
              </div>
              <h3 className={styles.dangerTitle}>
                پاکسازی کامل پایگاه داده ابری
              </h3>
              <p className={styles.dangerDesc}>
                با انجام این عملیات، تمامی دروس ذخیره‌شده در جدول Supabase حذف خواهند
                شد.
              </p>
              <button
                type="button"
                onClick={() => {
                  setResetConfirmationText("");
                  setIsResetModalOpen(true);
                }}
                disabled={courses.length === 0}
                className={styles.dangerResetBtn}
              >
                🗑️ بازنشانی و حذف کل اطلاعات دروس
              </button>
            </div>
          </div>
        </section>

        <section className={styles.tableCard}>
          <div className={styles.tableToolbar}>
            <div className={styles.tableToolbarTitleBox}>
              <h2 className={styles.sectionTitle}>جدول جامع دروس ارائه‌شده</h2>
              <span className={styles.FilterCountBadge}>
                نمایش {toPersianDigits(filteredCourses.length)} از{" "}
                {toPersianDigits(courses.length)} درس
              </span>
            </div>

            <div className={styles.filtersRow}>
              <div className={styles.searchWrapper}>
                <span className={styles.searchIcon}>🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو بر اساس نام درس، کد درس یا نام استاد..."
                  className={styles.searchInput}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className={styles.clearSearchBtn}
                    title="پاک کردن جستجو"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className={styles.selectWrapper}>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className={styles.departmentSelect}
                  aria-label="فیلتر بر اساس گروه آموزشی"
                >
                  <option value="ALL">
                    همه گروه‌های آموزشی ({toPersianDigits(departmentsList.length)})
                  </option>
                  {departmentsList.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {courses.length === 0 ? (
            <div className={styles.emptyStateBox}>
              <div className={styles.emptyStateIcon}>📭</div>
              <h3 className={styles.emptyStateTitle}>
                هیچ درسی در پایگاه داده ثبت نشده است
              </h3>
              <p className={styles.emptyStateText}>
                برای شروع، فایل JSON دروس ترم را از کادر بالا بارگذاری کنید.
              </p>
              <button
                type="button"
                onClick={handleLoadInitialSample}
                className={styles.emptyStateCtaBtn}
              >
                ⚡ بارگذاری داده‌های نمونه آزمایشی
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className={styles.emptyStateBox}>
              <div className={styles.emptyStateIcon}>🔎</div>
              <h3 className={styles.emptyStateTitle}>
                نتیجه‌ای مطابق با جستجوی شما یافت نشد
              </h3>
              <p className={styles.emptyStateText}>
                عبارت جستجو یا فیلتر گروه آموزشی را تغییر دهید تا دروس مرتبط نمایش
                داده شوند.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedDepartment("ALL");
                }}
                className={styles.resetFilterBtn}
              >
                پاک کردن فیلترها
              </button>
            </div>
          ) : (
            <div className={styles.tableScrollContainer}>
              <table className={styles.coursesTable}>
                <thead>
                  <tr>
                    <th>کد و گروه</th>
                    <th>نام درس</th>
                    <th>گروه آموزشی</th>
                    <th>واحد</th>
                    <th>استاد ارائه‌دهنده</th>
                    <th>جلسات هفتگی (روز و ساعت)</th>
                    <th>تاریخ و ساعت امتحان</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course, idx) => {
                    const rowKey =
                      course.id || `${course.course_code}-${course.group}-${idx}`;
                    const totalUnits = getCourseTotalUnits(course.units);

                    return (
                      <tr key={rowKey}>
                        <td className={styles.codeCell}>
                          <div className={styles.codeBadgeGroup}>
                            <span className={styles.courseCodeBadge} dir="ltr">
                              {course.course_code}
                            </span>
                            <span className={styles.groupBadge}>
                              گروه {toPersianDigits(course.group)}
                            </span>
                          </div>
                        </td>
                        <td className={styles.courseNameCell}>
                          <strong>{course.course_name}</strong>
                        </td>
                        <td>
                          <span className={styles.departmentTag}>
                            {course.department}
                          </span>
                        </td>
                        <td className={styles.unitsCell}>
                          <span className={styles.unitsBadge}>
                            {toPersianDigits(totalUnits)} واحد
                          </span>
                        </td>
                        <td>
                          <div className={styles.instructorsList}>
                            {course.instructors?.map((inst, iIdx) => (
                              <span key={iIdx} className={styles.instructorName}>
                                👤 {inst}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className={styles.sessionsCell}>
                            {!course.sessions || course.sessions.length === 0 ? (
                              <span className={styles.mutedText}>
                                بدون جلسه کلاسی
                              </span>
                            ) : (
                              course.sessions.map((session, sIdx) => {
                                const startTime =
                                  session.start || session.start_time || "";
                                const endTime =
                                  session.end || session.end_time || "";
                                return (
                                  <div key={sIdx} className={styles.sessionPill}>
                                    <span className={styles.sessionDay}>
                                      {session.day}
                                    </span>
                                    {startTime && (
                                      <span
                                        className={styles.sessionTime}
                                        dir="ltr"
                                      >
                                        {toPersianDigits(startTime)}
                                        {endTime
                                          ? ` - ${toPersianDigits(endTime)}`
                                          : ""}
                                      </span>
                                    )}
                                    {session.week && (
                                      <span className={styles.sessionLoc}>
                                        (هفته {session.week})
                                      </span>
                                    )}
                                    {session.location && (
                                      <span className={styles.sessionLoc}>
                                        [{session.location}]
                                      </span>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </td>
                        <td>
                          <div className={styles.examCell}>
                            {course.exam && course.exam.date ? (
                              <>
                                <span className={styles.examDate}>
                                  📅 {toPersianDigits(course.exam.date)}
                                </span>
                                {(course.exam.start || course.exam.time) && (
                                  <span className={styles.examTime}>
                                    ⏰ ساعت{" "}
                                    {toPersianDigits(
                                      course.exam.time ||
                                        `${course.exam.start}${
                                          course.exam.end
                                            ? ` تا ${course.exam.end}`
                                            : ""
                                        }`
                                    )}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className={styles.mutedText}>
                                بدون امتحان کتبی
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={styles.actionCell}>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteCourse(
                                course.course_code,
                                course.group,
                                course.course_name
                              )
                            }
                            className={styles.deleteRowBtn}
                            title={`حذف درس ${course.course_name}`}
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {isResetModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setIsResetModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalDangerIcon}>⚠️</div>
              <h3 id="reset-modal-title" className={styles.modalTitle}>
                تأیید حذف کامل پایگاه داده دروس
              </h3>
            </div>

            <p className={styles.modalBodyText}>
              آیا از پاکسازی کامل اطلاعات دروس اطمینان دارید؟ این عملیات تمامی{" "}
              <strong>{toPersianDigits(courses.length)} درس</strong> موجود در
              دیتابیس ابری را حذف می‌کند و غیرقابل بازگشت است.
            </p>

            <div className={styles.modalConfirmInputBox}>
              <label
                htmlFor="confirm-delete-input"
                className={styles.modalInputLabel}
              >
                جهت فعال‌سازی دکمه حذف قطعی، عبارت <code>حذف</code> را در کادر زیر
                تایپ کنید:
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                value={resetConfirmationText}
                onChange={(e) => setResetConfirmationText(e.target.value)}
                placeholder="عبارت «حذف» را بنویسید..."
                className={styles.modalInput}
                autoFocus
              />
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className={styles.modalCancelBtn}
              >
                انصراف و بازگشت
              </button>

              <button
                type="button"
                onClick={handleConfirmResetDatabase}
                disabled={!isResetConfirmReady}
                className={styles.modalConfirmDangerBtn}
              >
                تأیید و حذف کامل اطلاعات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
