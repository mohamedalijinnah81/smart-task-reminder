export type Priority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type ReminderStatus = "pending" | "early" | "due" | "overdue";

export interface Task {
  id: number;
  title: string;
  description: string | null;
  due_date: string; // ISO date string YYYY-MM-DD
  priority: Priority;
  is_done: boolean;
  user_email: string;
  reminder_status: ReminderStatus;
  last_reminded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  due_date: string;
  priority: Priority;
  user_email: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  due_date?: string;
  priority?: Priority;
  is_done?: boolean;
}