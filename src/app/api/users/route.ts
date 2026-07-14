import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { ids } = await req.json();
    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }

    const names: Record<string, { name: string, imageUrl: string }> = {};
    const uniqueIds = [...new Set(ids.filter((id: unknown) => typeof id === "string" && id))] as string[];

    await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const user = await (await clerkClient()).users.getUser(id);
          names[id] = {
            name: user.fullName ||
              [user.firstName, user.lastName].filter(Boolean).join(" ") ||
              "Unknown User",
            imageUrl: user.imageUrl || ""
          };
        } catch {
          names[id] = { name: "Unknown User", imageUrl: "" };
        }
      }),
    );

    return NextResponse.json(names);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
