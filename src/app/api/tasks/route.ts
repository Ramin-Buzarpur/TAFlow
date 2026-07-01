import { requireUser } from "@/server/auth/session";
import { created, ok, fail } from "@/server/utils/api";
import { createTaskSchema } from "@/server/validation/tasks";
import { createTask, listTasks } from "@/server/services/tasks";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const courseOfferingId = new URL(request.url).searchParams.get("courseOfferingId");
    if (!courseOfferingId) return ok([]);
    return ok(await listTasks(user.id, courseOfferingId));
  } catch (e) { return fail(e, "Could not list tasks"); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = createTaskSchema.parse(await request.json());
    return created(await createTask(user.id, body));
  } catch (e) { return fail(e, "Could not create task"); }
}
