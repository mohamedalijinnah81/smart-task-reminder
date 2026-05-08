"use client";

import { useState, useTransition } from "react";
import type { Task, Priority } from "@/types";
import { differenceInCalendarDays, format, parseISO } from "date-fns";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function priorityColor(p: number): string {
  if (p >= 9) return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
  if (p >= 7) return "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300";
  if (p >= 5) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
  if (p >= 3) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  return "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
}

function priorityLabel(p: number): string {
  if (p >= 9) return "Critical";
  if (p >= 7) return "High";
  if (p >= 5) return "Medium";
  if (p >= 3) return "Low";
  return "Minimal";
}

function dueBadge(dueDate: string, isDone: boolean) {
  if (isDone) return null;
  const days = differenceInCalendarDays(parseISO(dueDate), new Date());
  if (days < 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
        🚨 {Math.abs(days)}d overdue
      </span>
    );
  if (days === 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        🔔 Due today
      </span>
    );
  if (days <= 2)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
        ⏰ {days}d left
      </span>
    );
  return null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormState {
  title: string;
  description: string;
  due_date: string;
  priority: string;
  user_email: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  due_date: "",
  priority: "5",
  user_email: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TasksClient({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");
  const [isPending, startTransition] = useTransition();

  // ---------- CRUD ----------

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        priority: parseInt(form.priority, 10),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create task");
      return;
    }

    setTasks((prev) => [data.task, ...prev]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  async function handleToggleDone(task: Task) {
    startTransition(async () => {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_done: !task.is_done }),
      });
      if (!res.ok) return;
      const { task: updated } = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    });
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this task?")) return;
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  // ---------- Filtering ----------

  const filtered = tasks.filter((t) => {
    if (filter === "pending") return !t.is_done;
    if (filter === "done") return t.is_done;
    return true;
  });

  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => !t.is_done).length,
    done: tasks.filter((t) => t.is_done).length,
  };

  // ---------- Render ----------

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              📋 Smart Task Reminder
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Stay on top of your tasks — we'll chase you until they're done.
            </p>
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); setError(null); }}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {showForm ? "✕ Cancel" : "+ New Task"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {/* Create Form */}
        {showForm && (
          <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-white">
              New Task
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Call Mr. Smith"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:ring-zinc-700"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Notes (optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Any additional context…"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:ring-zinc-700"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-zinc-700"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Priority: <span className="font-bold">{form.priority}/10</span>{" "}
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-xs ${priorityColor(parseInt(form.priority))}`}>
                      {priorityLabel(parseInt(form.priority))}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full accent-zinc-900 dark:accent-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Your Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="you@example.com"
                    value={form.user_email}
                    onChange={(e) => setForm((f) => ({ ...f, user_email: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:ring-zinc-700"
                  />
                  <p className="mt-1 text-xs text-zinc-400">
                    Reminders will be sent to this address.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-4 flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {(["pending", "all", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {f === "pending" ? "Active" : f === "done" ? "Completed" : "All"}
              <span className="ml-1.5 text-xs opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>

        {/* Task List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 dark:border-zinc-700 dark:bg-zinc-900">
            <span className="text-4xl">✅</span>
            <p className="mt-3 text-base font-medium text-zinc-500 dark:text-zinc-400">
              {filter === "done" ? "No completed tasks yet" : "No active tasks — great work!"}
            </p>
            {filter === "pending" && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-sm font-medium text-zinc-900 underline underline-offset-2 dark:text-white"
              >
                + Add your first task
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((task) => (
              <li
                key={task.id}
                className={`rounded-xl border bg-white p-4 shadow-sm transition-opacity dark:bg-zinc-900 ${
                  task.is_done
                    ? "border-zinc-100 opacity-60 dark:border-zinc-800"
                    : "border-zinc-200 dark:border-zinc-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleDone(task)}
                    disabled={isPending}
                    aria-label={task.is_done ? "Mark as pending" : "Mark as done"}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      task.is_done
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-600"
                    }`}
                  >
                    {task.is_done && (
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-semibold text-zinc-900 dark:text-white ${
                          task.is_done ? "line-through" : ""
                        }`}
                      >
                        {task.title}
                      </span>
                      {dueBadge(task.due_date, task.is_done)}
                    </div>

                    {task.description && (
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                      <span>
                        📅 {format(parseISO(task.due_date), "MMM d, yyyy")}
                      </span>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 font-medium ${priorityColor(task.priority)}`}
                      >
                        P{task.priority} · {priorityLabel(task.priority)}
                      </span>
                      <span>✉️ {task.user_email}</span>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(task.id)}
                    aria-label="Delete task"
                    className="shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9H3z"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Reminder legend */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            📬 How reminders work
          </h3>
          <ul className="space-y-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            <li>⏰ <strong className="text-zinc-700 dark:text-zinc-300">2 days before</strong> — early heads-up email</li>
            <li>🔔 <strong className="text-zinc-700 dark:text-zinc-300">Due date</strong> — reminder to complete today</li>
            <li>🚨 <strong className="text-zinc-700 dark:text-zinc-300">Overdue</strong> — daily chase until you mark it done</li>
          </ul>
        </div>
      </main>
    </div>
  );
}