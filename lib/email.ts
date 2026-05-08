import nodemailer from "nodemailer";
import type { Task } from "@/types";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: parseInt(process.env.SMTP_PORT ?? "587", 10),
  secure: process.env.SMTP_SECURE === "true", // true for port 465
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
});

type ReminderType = "early" | "due" | "overdue";

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day)
  ).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function priorityLabel(p: number): string {
  if (p >= 9) return "🔴 Critical";
  if (p >= 7) return "🟠 High";
  if (p >= 5) return "🟡 Medium";
  if (p >= 3) return "🟢 Low";
  return "⚪ Minimal";
}

function buildEmailContent(task: Task, type: ReminderType) {
  const dueFormatted = formatDate(task.due_date);
  const priorityStr = `${priorityLabel(task.priority)} (${task.priority}/10)`;

  const subjects: Record<ReminderType, string> = {
    early: `⏰ Reminder: "${task.title}" is due in 2 days`,
    due: `🔔 Due Today: "${task.title}"`,
    overdue: `🚨 Overdue: "${task.title}" needs your attention`,
  };

  const intros: Record<ReminderType, string> = {
    early: `This is a heads-up that the following task is due in <strong>2 days</strong>.`,
    due: `Your task is <strong>due today</strong>. Don't forget to complete it!`,
    overdue: `Your task is <strong>overdue</strong> and has not been marked as done. This reminder will repeat until the task is completed.`,
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f9f9; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: ${type === "overdue" ? "#ef4444" : type === "due" ? "#f59e0b" : "#3b82f6"}; padding: 28px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 700; }
    .body { padding: 28px 32px; }
    .intro { color: #374151; font-size: 15px; margin-bottom: 24px; line-height: 1.6; }
    .task-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .task-title { font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 12px; }
    .meta { display: flex; flex-direction: column; gap: 6px; }
    .meta-row { font-size: 14px; color: #6b7280; }
    .meta-row strong { color: #374151; }
    .cta { display: inline-block; background: #111827; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 8px; }
    .footer { padding: 16px 32px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${subjects[type]}</h1>
    </div>
    <div class="body">
      <p class="intro">${intros[type]}</p>
      <div class="task-card">
        <p class="task-title">${task.title}</p>
        <div class="meta">
          <div class="meta-row">📅 <strong>Due Date:</strong> ${dueFormatted}</div>
          <div class="meta-row">⚡ <strong>Priority:</strong> ${priorityStr}</div>
          ${task.description ? `<div class="meta-row">📝 <strong>Notes:</strong> ${task.description}</div>` : ""}
        </div>
      </div>
      <a class="cta" href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/tasks">
        View &amp; Manage Tasks →
      </a>
    </div>
    <div class="footer">
      You're receiving this because you have tasks in Smart Task Reminder.
      Reminders will stop once you mark this task as done.
    </div>
  </div>
</body>
</html>
  `.trim();

  return { subject: subjects[type], html };
}

export async function sendReminderEmail(
  task: Task,
  type: ReminderType
): Promise<void> {
  const { subject, html } = buildEmailContent(task, type);

  await transporter.sendMail({
    from: `"Task Reminder" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to: task.user_email,
    subject,
    html,
  });
}