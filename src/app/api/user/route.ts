import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

// Persist dashboard preferences (currently: language) for the logged-in user.
export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("sessionId")?.value;

  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const language = body.language === "id" ? "id" : body.language === "en" ? "en" : null;
  if (!language) {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: { language },
  });

  return NextResponse.json({ user });
}
