import pool from "@/lib/db";
import type { Task, CreateTaskInput, UpdateTaskInput } from "@/types";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function row2Task(row: RowDataPacket): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    due_date: row.due_date instanceof Date
      ? row.due_date.toISOString().slice(0, 10)
      : String(row.due_date),
    priority: row.priority,
    is_done: Boolean(row.is_done),
    user_email: row.user_email,
    reminder_status: row.reminder_status,
    last_reminded_at: row.last_reminded_at
      ? new Date(row.last_reminded_at).toISOString()
      : null,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getAllTasks(userEmail?: string): Promise<Task[]> {
  const [rows] = userEmail
    ? await pool.execute<RowDataPacket[]>(
        "SELECT * FROM tasks WHERE user_email = ? ORDER BY due_date ASC, priority DESC",
        [userEmail]
      )
    : await pool.execute<RowDataPacket[]>(
        "SELECT * FROM tasks ORDER BY due_date ASC, priority DESC"
      );
  return (rows as RowDataPacket[]).map(row2Task);
}

export async function getTaskById(id: number): Promise<Task | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT * FROM tasks WHERE id = ?",
    [id]
  );
  const row = (rows as RowDataPacket[])[0];
  return row ? row2Task(row) : null;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO tasks (title, description, due_date, priority, user_email)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.title,
      input.description ?? null,
      input.due_date,
      input.priority,
      input.user_email,
    ]
  );
  const task = await getTaskById(result.insertId);
  if (!task) throw new Error("Failed to retrieve created task");
  return task;
}

export async function updateTask(
  id: number,
  input: UpdateTaskInput
): Promise<Task | null> {
  const fields: string[] = [];
  const values: (string | number | null | boolean)[] = [];

  if (input.title !== undefined) { fields.push("title = ?"); values.push(input.title); }
  if (input.description !== undefined) { fields.push("description = ?"); values.push(input.description); }
  if (input.due_date !== undefined) { fields.push("due_date = ?"); values.push(input.due_date); }
  if (input.priority !== undefined) { fields.push("priority = ?"); values.push(input.priority); }
  if (input.is_done !== undefined) {
    fields.push("is_done = ?");
    values.push(input.is_done ? 1 : 0);
    // Reset reminder tracking when task is re-opened
    if (!input.is_done) {
      fields.push("reminder_status = 'pending'");
      fields.push("last_reminded_at = NULL");
    }
  }

  if (fields.length === 0) return getTaskById(id);

  values.push(id);
  await pool.execute(
    `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`,
    values as any
  );

  return getTaskById(id);
}

export async function deleteTask(id: number): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    "DELETE FROM tasks WHERE id = ?",
    [id]
  );
  return result.affectedRows > 0;
}

// ---------------------------------------------------------------------------
// Cron helpers
// ---------------------------------------------------------------------------

/**
 * Returns all tasks that need a reminder today.
 * Uses UTC date comparison — make sure your DB timezone is UTC.
 */
export async function getTasksDueForReminder(): Promise<Task[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM tasks
     WHERE is_done = 0
       AND (
         -- Early reminder: exactly 2 days before due, not yet sent early/due/overdue
         (DATEDIFF(due_date, CURDATE()) = 2 AND reminder_status = 'pending')

         -- Due today reminder: due today, hasn't had due or overdue reminder yet
         OR (DATEDIFF(due_date, CURDATE()) = 0 AND reminder_status IN ('pending', 'early'))

         -- Overdue: past due, not done — chase every day (last reminder > 0 days ago to avoid double-firing)
         OR (due_date < CURDATE() AND (last_reminded_at IS NULL OR DATE(last_reminded_at) < CURDATE()))
       )
     ORDER BY priority DESC, due_date ASC`
  );
  return (rows as RowDataPacket[]).map(row2Task);
}

export async function updateReminderStatus(
  id: number,
  status: Task["reminder_status"]
): Promise<void> {
  await pool.execute(
    "UPDATE tasks SET reminder_status = ?, last_reminded_at = NOW() WHERE id = ?",
    [status, id]
  );
}