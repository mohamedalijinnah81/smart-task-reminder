import { getAllTasks } from "@/lib/tasks";
import TasksClient from "./TasksClient";

export const dynamic = "force-dynamic"; // always fresh, no caching

export default async function TasksPage() {
  const tasks = await getAllTasks();
  return <TasksClient initialTasks={tasks} />;
}