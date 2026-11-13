"use client";

import { FormEvent, useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import {
  apiRequest,
  ApiError,
  type Course,
  type CourseLesson,
  type Enrollment,
  type Recommendation,
  type User,
} from "@/lib/api";
import { BackendStatus } from "@/components/backend-status";

type AuthMode = "login" | "register";
type DashboardTab = "discover" | "learning" | "manage";
type LessonDraft = { _id?: string; title: string; content: string; videoUrl?: string };
type CourseDraft = {
  title: string;
  description: string;
  category: string;
  level: string;
  lessons: LessonDraft[];
};

const emptyLesson: LessonDraft = { title: "", content: "", videoUrl: "" };

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [tab, setTab] = useState<DashboardTab>("discover");
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationReason, setRecommendationReason] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseDraft, setCourseDraft] = useState<CourseDraft>({
    title: "",
    description: "",
    category: "",
    level: "beginner",
    lessons: [{ ...emptyLesson }],
  });

  const loadCatalog = useCallback(async (query: string) => {
    const result = await apiRequest<{ courses: Course[] }>(
      `/api/courses${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ""}`,
    );
    setCourses(result.courses);
  }, []);

  const loadLearnerData = useCallback(async () => {
    const [enrollmentResult, recommendationResult] = await Promise.all([
      apiRequest<{ enrollments: Enrollment[] }>("/api/enrollments/me"),
      apiRequest<{ recommendations: Recommendation[]; reason?: string }>("/api/recommendations"),
    ]);
    setEnrollments(enrollmentResult.enrollments);
    setRecommendations(recommendationResult.recommendations);
    setRecommendationReason(recommendationResult.reason ?? "");
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await loadCatalog(search);
      if (user?.role === "learner") await loadLearnerData();
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setLoading(false);
    }
  }, [loadCatalog, loadLearnerData, search, user?.role]);

  useEffect(() => {
    let active = true;
    apiRequest<{ user: User }>("/api/auth/me")
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setUser(null);
        if (!(requestError instanceof ApiError && requestError.status === 401)) {
          setError(messageOf(requestError));
        }
      })
      .finally(() => {
        if (active) setSessionLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionLoading) void refresh();
  }, [sessionLoading, refresh]);

  const filteredCourses = courses;
  const activeEnrollment = selectedCourse
    ? enrollments.find((enrollment) => enrollment.course._id === selectedCourse._id)
    : undefined;

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      ...(authMode === "register" ? {
        name: String(form.get("name") ?? ""),
        adminBootstrapToken: String(form.get("adminBootstrapToken") ?? ""),
      } : {}),
    };
    try {
      const result = await apiRequest<{ user: User }>(`/api/auth/${authMode === "register" ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setUser(result.user);
      setNotice(authMode === "register" ? "Your account is ready." : "Welcome back.");
      setAuthMode("login");
      setTab("discover");
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    try {
      await apiRequest<void>("/api/auth/logout", { method: "POST" });
      setUser(null);
      setEnrollments([]);
      setRecommendations([]);
      setSelectedCourse(null);
      setNotice("You have signed out.");
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  async function openCourse(courseId: string) {
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<{ course: Course }>(`/api/courses/${courseId}`);
      setSelectedCourse(result.course);
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  async function enroll(course: Course) {
    setError("");
    try {
      await apiRequest(`/api/enrollments/${course._id}`, { method: "POST" });
      await loadLearnerData();
      const { course: updatedCourse } = await apiRequest<{ course: Course }>(`/api/courses/${course._id}`);
      setSelectedCourse(updatedCourse);
      setNotice(`You are enrolled in ${course.title}.`);
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  async function toggleLesson(course: Course, lesson: CourseLesson, completed: boolean) {
    setError("");
    try {
      await apiRequest(`/api/enrollments/${course._id}/progress`, {
        method: "PATCH",
        body: JSON.stringify({ lessonId: lesson._id, completed }),
      });
      await loadLearnerData();
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  function beginEdit(course: Course) {
    setEditingCourseId(course._id);
    setCourseDraft({
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      lessons: course.lessons.map(({ _id, title, content, videoUrl }) => ({ _id, title, content, videoUrl: videoUrl ?? "" })),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearCourseDraft() {
    setEditingCourseId(null);
    setCourseDraft({ title: "", description: "", category: "", level: "beginner", lessons: [{ ...emptyLesson }] });
  }

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const path = editingCourseId ? `/api/courses/${editingCourseId}` : "/api/courses";
      await apiRequest(path, {
        method: editingCourseId ? "PUT" : "POST",
        body: JSON.stringify(courseDraft),
      });
      clearCourseDraft();
      setNotice(editingCourseId ? "Course updated." : "Course published.");
      await loadCatalog(search);
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  async function archiveCourse(course: Course) {
    if (!window.confirm(`Unpublish “${course.title}”? It will disappear from the catalog.`)) return;
    try {
      await apiRequest(`/api/courses/${course._id}`, { method: "DELETE" });
      setNotice("Course unpublished.");
      if (selectedCourse?._id === course._id) setSelectedCourse(null);
      await loadCatalog(search);
    } catch (requestError) {
      setError(messageOf(requestError));
    }
  }

  if (sessionLoading) {
    return <main className="center-state"><span className="spinner" />Checking your session…</main>;
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-top-row">
            <Link className="brand" href="/" aria-label="LMS home"><span className="brand-mark">L</span>LMS</Link>
            <BackendStatus />
          </div>
          <p className="eyebrow">LMS</p>
          <h1>{authMode === "login" ? "Welcome back." : "Make a start."}</h1>
          <p className="auth-intro">
            {authMode === "login"
              ? "Sign in to continue learning and keep track of your progress."
              : "Create an account to find courses and learn at your own pace."}
          </p>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <form className="form-stack" onSubmit={submitAuth}>
            {authMode === "register" && (
              <label>
                Name
                <input autoComplete="name" name="name" minLength={2} maxLength={80} required />
              </label>
            )}
            <label>
              Email
              <input autoComplete="email" name="email" type="email" maxLength={254} required />
            </label>
            <label>
              Password
              <input autoComplete={authMode === "login" ? "current-password" : "new-password"} name="password" type="password" minLength={12} maxLength={128} required />
              {authMode === "register" && <span className="field-note">Use at least 12 characters.</span>}
            </label>
            {authMode === "register" && (
            <label>
              Administrator setup code (optional)
              <input autoComplete="off" name="adminBootstrapToken" type="password" />
              <span className="field-note">Use the configured administrator email and code to open the Manage courses tab.</span>
            </label>
            )}
            <button className="button button-primary button-wide" disabled={authBusy}>
              {authBusy ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
          <p className="form-switch">
            {authMode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button className="text-button" onClick={() => { setError(""); setAuthMode(authMode === "login" ? "register" : "login"); }}>
              {authMode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
          <p className="security-note">{authMode === "login"
            ? "Admin access is set up with the administrator email and bootstrap code configured for this app."
            : "Passwords are securely hashed. Use the configured admin email and bootstrap code to create the first admin account."}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="brand" href="/" aria-label="LMS home"><span className="brand-mark">L</span>LMS</Link>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={tab === "discover" ? "nav-link nav-link-active" : "nav-link"} onClick={() => { setTab("discover"); setSelectedCourse(null); }}>Discover</button>
          {user.role === "learner" && <button className={tab === "learning" ? "nav-link nav-link-active" : "nav-link"} onClick={() => { setTab("learning"); setSelectedCourse(null); }}>My learning</button>}
          {user.role === "admin" && <button className={tab === "manage" ? "nav-link nav-link-active" : "nav-link"} onClick={() => { setTab("manage"); setSelectedCourse(null); }}>Manage courses</button>}
        </nav>
        <div className="account-menu">
          <span className="avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
          <span className="account-name">{user.name}</span>
          {user.role === "admin" && <span className="role-pill">Admin</span>}
          <button className="button button-quiet" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <section className="welcome-row">
        <div>
        <p className="eyebrow">{tab === "manage" ? "ADMIN" : "LEARNING DASHBOARD"}</p>
          <h1>{tab === "manage" ? "Manage courses" : `Welcome, ${user.name.split(" ")[0]}.`}</h1>
          <p className="welcome-copy">
            {tab === "manage"
              ? "Add a course, edit lessons, or remove a course from the catalog."
              : "Browse courses and keep track of your progress."}
          </p>
        </div>
        <BackendStatus />
      </section>

      {error && <div className="alert alert-error page-alert" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
      {notice && <div className="alert alert-success page-alert" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss message">×</button></div>}

      {selectedCourse ? (
        <CourseDetail
          course={selectedCourse}
          enrollment={activeEnrollment}
          isAdmin={user.role === "admin"}
          onBack={() => setSelectedCourse(null)}
          onEnroll={() => enroll(selectedCourse)}
          onToggleLesson={(lesson, completed) => toggleLesson(selectedCourse, lesson, completed)}
          onEdit={() => { setTab("manage"); beginEdit(selectedCourse); setSelectedCourse(null); }}
          onArchive={() => archiveCourse(selectedCourse)}
        />
      ) : tab === "learning" ? (
        <section className="content-section">
          <SectionHeading title="Your learning" detail={`${enrollments.length} course${enrollments.length === 1 ? "" : "s"} enrolled`} />
          {enrollments.length === 0 ? (
            <EmptyState title="Your learning starts here" detail="Browse the catalog and enroll in a course to see it here." actionLabel="Explore courses" onAction={() => setTab("discover")} />
          ) : (
            <div className="course-grid">{enrollments.map((enrollment) => (
              <CourseCard key={enrollment._id} course={enrollment.course} progress={enrollment.progress} onOpen={() => void openCourse(enrollment.course._id)} />
            ))}</div>
          )}
        </section>
      ) : tab === "manage" ? (
        <div className="manage-layout">
          <section className="editor-panel">
            <SectionHeading title={editingCourseId ? "Edit course" : "Publish a course"} detail="Course content is stored in your database." />
            <form className="form-stack" onSubmit={saveCourse}>
              <label>Course title<input value={courseDraft.title} maxLength={120} required onChange={(event) => setCourseDraft({ ...courseDraft, title: event.target.value })} /></label>
              <label>Description<textarea value={courseDraft.description} minLength={20} maxLength={4000} rows={4} required onChange={(event) => setCourseDraft({ ...courseDraft, description: event.target.value })} /></label>
              <div className="form-row">
                <label>Category<input value={courseDraft.category} maxLength={60} required onChange={(event) => setCourseDraft({ ...courseDraft, category: event.target.value })} placeholder="e.g. Data science" /></label>
                <label>Level<select value={courseDraft.level} onChange={(event) => setCourseDraft({ ...courseDraft, level: event.target.value })}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
              </div>
              <div className="lesson-editor-heading"><h3>Lessons</h3><button className="text-button" type="button" onClick={() => setCourseDraft({ ...courseDraft, lessons: [...courseDraft.lessons, { ...emptyLesson }] })}>+ Add lesson</button></div>
              {courseDraft.lessons.map((lesson, index) => (
                <fieldset className="lesson-editor" key={index}>
                  <legend>Lesson {index + 1}</legend>
                  {courseDraft.lessons.length > 1 && <button className="remove-lesson" type="button" onClick={() => setCourseDraft({ ...courseDraft, lessons: courseDraft.lessons.filter((_, lessonIndex) => lessonIndex !== index) })} aria-label={`Remove lesson ${index + 1}`}>×</button>}
                  <label>Lesson title<input value={lesson.title} minLength={2} maxLength={120} required onChange={(event) => updateLesson(setCourseDraft, courseDraft.lessons, index, "title", event.target.value)} /></label>
                  <label>Lesson content<textarea value={lesson.content} maxLength={12000} rows={4} required onChange={(event) => updateLesson(setCourseDraft, courseDraft.lessons, index, "content", event.target.value)} /></label>
                  <label>YouTube video URL (optional)<input type="url" value={lesson.videoUrl ?? ""} placeholder="https://www.youtube.com/watch?v=..." onChange={(event) => updateLesson(setCourseDraft, courseDraft.lessons, index, "videoUrl", event.target.value)} /></label>
                </fieldset>
              ))}
              <div className="button-row">
                <button className="button button-primary" type="submit">{editingCourseId ? "Save changes" : "Publish course"}</button>
                {editingCourseId && <button className="button button-quiet" type="button" onClick={clearCourseDraft}>Cancel</button>}
              </div>
            </form>
          </section>
          <section className="content-section management-list">
            <SectionHeading title="Published courses" detail={`${courses.length} in the catalog`} />
            {courses.length === 0 ? <EmptyState title="No courses yet" detail="Create and publish your first course using the form." /> : (
              <div className="manage-course-list">{courses.map((course) => (
                <article className="manage-course" key={course._id}>
                  <div><span className="course-category">{course.category}</span><h3>{course.title}</h3><p>{course.lessons.length} lessons · {course.level}</p></div>
                  <div className="button-row"><button className="button button-quiet" onClick={() => beginEdit(course)}>Edit</button><button className="button button-danger" onClick={() => void archiveCourse(course)}>Unpublish</button></div>
                </article>
              ))}</div>
            )}
          </section>
        </div>
      ) : (
        <>
          {user.role === "learner" && (
            <section className="content-section recommendations-section">
              <SectionHeading title="Recommended for you" detail="Suggestions based on the categories you are learning." />
              {recommendations.length ? (
                <div className="course-grid">{recommendations.map(({ course, reason }) => <CourseCard key={course._id} course={course} badge={reason} onOpen={() => void openCourse(course._id)} />)}</div>
              ) : <p className="quiet-note">{recommendationReason || "Complete an enrollment to get personalized course suggestions."}</p>}
            </section>
          )}
          <section className="content-section catalog-section">
            <div className="catalog-heading">
              <SectionHeading title="Course catalog" detail="Real courses published by your learning community." />
              <label className="search-field"><span className="sr-only">Search courses</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search courses" /><span aria-hidden="true">⌕</span></label>
            </div>
            {loading ? <div className="inline-loading"><span className="spinner" />Loading courses…</div> : filteredCourses.length === 0 ? (
              <EmptyState title="No published courses yet" detail={search ? "Try another search, or clear the search field." : "There are no courses to show yet. An administrator can publish the first course."} actionLabel={search ? "Clear search" : undefined} onAction={search ? () => setSearch("") : undefined} />
            ) : (
              <div className="course-grid">{filteredCourses.map((course) => {
                const enrollment = enrollments.find((item) => item.course._id === course._id);
                return <CourseCard key={course._id} course={course} progress={enrollment?.progress} onOpen={() => void openCourse(course._id)} />;
              })}</div>
            )}
          </section>
          {user.role === "learner" && enrollments.length > 0 && (
            <section className="content-section">
              <SectionHeading title="Pick up where you left off" detail={`${enrollments.length} active enrollment${enrollments.length === 1 ? "" : "s"}`} />
              <div className="course-grid">{enrollments.slice(0, 3).map((enrollment) => <CourseCard key={enrollment._id} course={enrollment.course} progress={enrollment.progress} onOpen={() => void openCourse(enrollment.course._id)} />)}</div>
            </section>
          )}
        </>
      )}

      <footer className="app-footer"><span>LMS</span><span>Your progress is saved as you learn.</span></footer>
    </main>
  );
}

function CourseDetail({
  course, enrollment, isAdmin, onBack, onEnroll, onToggleLesson, onEdit, onArchive,
}: {
  course: Course;
  enrollment?: Enrollment;
  isAdmin: boolean;
  onBack: () => void;
  onEnroll: () => void;
  onToggleLesson: (lesson: CourseLesson, completed: boolean) => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <section className="detail-layout">
      <div className="detail-main">
        <button className="back-link" onClick={onBack}>← Back to courses</button>
        <div className="detail-meta"><span className="course-category">{course.category}</span><span className="level-pill">{course.level}</span><span>{course.lessons.length} lessons</span></div>
        <h1>{course.title}</h1>
        <p className="detail-description">{course.description}</p>
        <div className="lessons-panel">
          <SectionHeading title="Course lessons" detail={enrollment ? `${enrollment.progress}% complete` : "Enroll to record your progress"} />
          <div className="lesson-list">{course.lessons.map((lesson, index) => {
            const completed = enrollment?.completedLessons.some((id) => id === lesson._id) ?? false;
            return (
              <article className="lesson-item" key={lesson._id}>
                <label className={enrollment ? "lesson-check lesson-check-active" : "lesson-check"} title={enrollment ? "Mark lesson complete" : "Enroll to track this lesson"}>
                  <input type="checkbox" aria-label={`${completed ? "Mark incomplete" : "Mark complete"}: ${lesson.title}`} checked={completed} disabled={!enrollment} onChange={(event) => onToggleLesson(lesson, event.target.checked)} />
                  <span>{completed ? "✓" : String(index + 1).padStart(2, "0")}</span>
                </label>
                <div className="lesson-copy"><h3>{lesson.title}</h3><p>{lesson.content}</p>{lesson.videoUrl && <YouTubeEmbed url={lesson.videoUrl} title={lesson.title} />}</div>
              </article>
            );
          })}</div>
        </div>
      </div>
      <aside className="detail-aside">
        <div className="aside-card"><span className="eyebrow">YOUR COURSE</span>
          {enrollment ? <><div className="progress-value">{enrollment.progress}<span>%</span></div><p>{enrollment.status === "completed" ? "Course completed. Great work!" : "Progress is saved to your account."}<span className="progress-track"><span style={{ width: `${enrollment.progress}%` }} /></span></p></> : <p>Enroll to access lesson tracking and save your progress.</p>}
          {!isAdmin && !enrollment && <button className="button button-primary button-wide" onClick={onEnroll}>Enroll in this course</button>}
          {isAdmin && <div className="button-row"><button className="button button-quiet" onClick={onEdit}>Edit course</button><button className="button button-danger" onClick={onArchive}>Unpublish</button></div>}
        </div>
      </aside>
    </section>
  );
}

function CourseCard({ course, progress, badge, onOpen }: { course: Course; progress?: number; badge?: string; onOpen: () => void }) {
  return (
    <article className="course-card">
      <div className="course-card-top"><span className="course-category">{course.category}</span><span className="level-pill">{course.level}</span></div>
      {badge && <p className="recommendation-badge">{badge}</p>}
      <h3>{course.title}</h3>
      <p className="course-description">{course.description}</p>
      <div className="course-card-bottom"><span>{course.lessons.length} lessons{course.enrollmentCount !== undefined ? ` · ${course.enrollmentCount} enrolled` : ""}</span><button className="text-button" onClick={onOpen}>{progress === undefined ? "View course →" : `${progress}% complete →`}</button></div>
      {progress !== undefined && <span className="progress-track"><span style={{ width: `${progress}%` }} /></span>}
    </article>
  );
}

function YouTubeEmbed({ url, title }: { url: string; title: string }) {
  let videoId = "";
  try {
    const parsed = new URL(url);
    videoId = parsed.hostname === "youtu.be" ? parsed.pathname.slice(1) : parsed.searchParams.get("v") ?? "";
  } catch {
    return null;
  }
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
  return (
    <>
    <div className="video-frame">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={`YouTube video: ${title}`}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
    <a className="video-link" href={url} target="_blank" rel="noreferrer">Open on YouTube</a>
    </>
  );
}

function SectionHeading({ title, detail }: { title: string; detail: string }) {
  return <div className="section-heading"><div><h2>{title}</h2><p>{detail}</p></div></div>;
}

function EmptyState({ title, detail, actionLabel, onAction }: { title: string; detail: string; actionLabel?: string; onAction?: () => void }) {
  return <div className="empty-state"><span className="empty-icon" aria-hidden="true">✳</span><h3>{title}</h3><p>{detail}</p>{actionLabel && onAction && <button className="button button-quiet" onClick={onAction}>{actionLabel}</button>}</div>;
}

function updateLesson(
  setDraft: Dispatch<SetStateAction<CourseDraft>>,
  lessons: LessonDraft[],
  index: number,
  field: keyof LessonDraft,
  value: string,
) {
  setDraft((draft) => ({
    ...draft,
    lessons: lessons.map((lesson, lessonIndex) => lessonIndex === index ? { ...lesson, [field]: value } : lesson),
  }));
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
