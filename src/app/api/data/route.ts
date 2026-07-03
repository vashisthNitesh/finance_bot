import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('sessionId')?.value;
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  if (!sessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(Number(year), Number(month), 1);
      const endDate = new Date(Number(year), Number(month) + 1, 0, 23, 59, 59);
      dateFilter = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.userId,
        ...dateFilter,
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json({ user: session.user, transactions });
  } catch (error) {
    console.error("Data fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
