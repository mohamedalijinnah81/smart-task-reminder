import { NextRequest, NextResponse } from "next/server";
import { getAllTasks, createTask } from "@/lib/tasks";
import type { CreateTaskInput } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email") ?? undefined;
    const tasks = await getAllTasks(email);
    return NextResponse.json({ tasks });
  } catch (err) {
    console.error("[GET /api/tasks]", err);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, due_date, priority, user_email } = body;

    if (!title || !due_date || !user_email) {
      return NextResponse.json(
        { error: "title, due_date, and user_email are required" },
        { status: 400 }
      );
    }

    const p = parseInt(priority, 10);
    if (isNaN(p) || p < 1 || p > 10) {
      return NextResponse.json(
        { error: "priority must be a number between 1 and 10" },
        { status: 400 }
      );
    }

    const input: CreateTaskInput = {
      title: String(title).trim(),
      description: description ? String(description).trim() : undefined,
      due_date: String(due_date),
      priority: p as CreateTaskInput["priority"],
      user_email: String(user_email).trim().toLowerCase(),
    };

    const task = await createTask(input);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tasks]", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}