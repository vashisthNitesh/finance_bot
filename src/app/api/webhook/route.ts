import { NextResponse } from "next/server";
import { bot } from "@/lib/bot";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Pass the update to Telegraf
    await bot.handleUpdate(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
