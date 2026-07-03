import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("sessionId")?.value;

  if (sessionId) {
    await prisma.session.deleteMany({ where: { id: sessionId } }).catch(() => null);
    cookieStore.delete("sessionId");
  }

  return NextResponse.json({ ok: true });
}
