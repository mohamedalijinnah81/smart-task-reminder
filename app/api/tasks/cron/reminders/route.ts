import { NextRequest, NextResponse } from "next/server";
import { getTasksDueForReminder, updateReminderStatus } from "@/lib/tasks";
import { sendReminderEmail } from "@/lib/email";
import type { Task } from "@/types";

// This route is called by Vercel Cron on a schedule defined in vercel.json.
// It can also be triggered manually for testing.
//
// Protection: Vercel sets the Authorization header automatically for cron jobs.
// We also accept a manual secret for local testing via CRON_SECRET env var.

function getReminderType(task: Task): "early" | "due" | "overdue" {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [y, m, d] = task.due_date.split("-").map(Number);
  const due = new Date(Date.UTC(y, m - 1, d));

  const diffDays = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays > 0) return "early";
  if (diffDays === 0) return "due";
  return "overdue";
}

export async function GET(req: NextRequest) {
  // --- Auth check ---
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret) {
    // Vercel sends: Authorization: Bearer <CRON_SECRET>
    const isVercelCron = authHeader === `Bearer ${cronSecret}`;
    // Allow manual trigger with ?secret=... for local testing
    const querySecret = req.nextUrl.searchParams.get("secret");
    const isManual = querySecret === cronSecret;

    if (!isVercelCron && !isManual) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results: Array<{
    taskId: number;
    title: string;
    email: string;
    type: string;
    success: boolean;
    error?: string;
  }> = [];

  try {
    const tasks = await getTasksDueForReminder();
    console.log(`[cron] Found ${tasks.length} task(s) needing reminders`);

    for (const task of tasks) {
      const type = getReminderType(task);

      try {
        await sendReminderEmail(task, type);

        // Update status
        const newStatus: Task["reminder_status"] =
          type === "early" ? "early" : type === "due" ? "due" : "overdue";
        await updateReminderStatus(task.id, newStatus);

        console.log(`[cron] ✅ Sent ${type} reminder for task #${task.id} to ${task.user_email}`);
        results.push({
          taskId: task.id,
          title: task.title,
          email: task.user_email,
          type,
          success: true,
        });
      } catch (emailErr) {
        const errMsg = emailErr instanceof Error ? emailErr.message : String(emailErr);
        console.error(`[cron] ❌ Failed to send reminder for task #${task.id}:`, errMsg);
        results.push({
          taskId: task.id,
          title: task.title,
          email: task.user_email,
          type,
          success: false,
          error: errMsg,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: tasks.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[cron] Fatal error:", errMsg);
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}

// Vercel Cron also uses POST in some configurations
export const POST = GET;