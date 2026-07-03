import { Telegraf } from "telegraf";
import { prisma } from "./prisma";
import { categorizeTransaction } from "./ai";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import https from "https";
import OpenAI from "openai";

const token = process.env.TELEGRAM_TOKEN;
if (!token) throw new Error("TELEGRAM_TOKEN is required");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const bot = new Telegraf(token);

bot.start(async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  const name = ctx.from?.first_name || "User";
  if (!telegramId) return;

  try {
    let user = await prisma.user.findUnique({ where: { id: telegramId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: telegramId,
          name: name,
        },
      });
      await ctx.reply(`👋 Hello *${name}*! Registration successful!\n\n🆔 User ID: \`${user.id}\`\n\nYou can now start logging your expenses and income!\n*Examples:*\n• _lunch 75k_\n• _received 50000 from john_\n• _gas 20 usd_\n🎙️ *NEW:* You can also send Voice Messages to log expenses!`, { parse_mode: "Markdown" });
    } else {
      await ctx.reply(`👋 Welcome back, *${user.name}*!\n\n🆔 User ID: \`${user.id}\`\nYou can log your transactions directly or via Voice!`, { parse_mode: "Markdown" });
    }
  } catch (error) {
    console.error(error);
    await ctx.reply("❌ Registration failed. Try again later.");
  }
});

bot.command("myid", async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const user = await prisma.user.findUnique({ where: { id: telegramId } });
  if (user) {
    await ctx.reply(`🆔 *Your User ID:* \`${user.id}\`\n👤 Name: ${user.name}\n📦 Plan: ${user.plan}`, { parse_mode: "Markdown" });
  } else {
    await ctx.reply("❌ You are not registered. Type /start to register.");
  }
});

bot.command("upgrade", async (ctx) => {
  const text = ctx.message.text;
  const parts = text.split(" ");
  if (parts.length < 2) {
    await ctx.reply("Usage: /upgrade <userId>");
    return;
  }
  const targetId = parts[1];
  try {
    await prisma.user.update({
      where: { id: targetId },
      data: { plan: "PRO" }
    });
    await ctx.reply(`✅ User ${targetId} upgraded to PRO!`);
    await ctx.telegram.sendMessage(targetId, "🎉 *Your account has been upgraded to PRO!*\n\nYou can now start logging your transactions and accessing the dashboard.", { parse_mode: "Markdown" });
  } catch (err) {
    await ctx.reply(`❌ Failed to upgrade: User not found`);
  }
});

async function sendDashboard(ctx: any, user: any) {
  const sessionToken = crypto.randomUUID();
  await prisma.session.create({
    data: {
      id: sessionToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
    }
  });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://your-deployment-url.com") + "/api/auth?token=" + sessionToken;

    await ctx.reply(
      `📊 *Your dashboard is ready!*\n\nClick the button below to open your personalized dashboard in your browser.`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📊 Open Dashboard", url: appUrl }],
          ],
        },
      }
    );
}

bot.command("dashboard", async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const user = await prisma.user.findUnique({ where: { id: telegramId } });
  if (!user) return ctx.reply("❌ You are not registered. Type /start to register.");

  if (user.plan !== 'PRO') {
    return ctx.reply("🔒 *PREMIUM FEATURE*\n\nTo use this bot and track your expenses, you must upgrade to the PRO plan.\n\nPlease transfer Rp 50.000 to Bank BCA 123456789 and send the receipt to @admin.\n\n_(Admin: use /upgrade <userId> to unlock this account)_", { parse_mode: "Markdown" });
  }

  await sendDashboard(ctx, user);
});

async function processTransactionText(ctx: any, user: any, text: string, processingMsgId: number) {
  try {
    const json = await categorizeTransaction(text);
    const now = new Date();
    const amount = Number(json.amount);
    
    if (isNaN(amount) || amount <= 0) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        processingMsgId,
        undefined,
        "❌ Failed to process: Could not find a valid amount in your message."
      );
      return;
    }

    const kodeTransaksi = `${user.id}x${now.getTime()}`;
    await prisma.transaction.create({
      data: {
        user: { connect: { id: user.id } },
        amount: amount,
        currency: json.currency || "IDR",
        type: json.type || "pengeluaran",
        category: json.category || "Other",
        note: json.note || "",
        store: json.store || "Not mentioned",
        kodeTransaksi,
        raw: text,
      },
    });

    const dateStr = now.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' });
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsgId,
      undefined,
      `✅ *Transaction saved!*\n\nStore/Source: ${json.store || "Not mentioned"}\nItem: ${json.note}\nTotal: ${json.type === 'pemasukan' ? '+' : '-'}Rp ${amount.toLocaleString("id-ID")}\nDate: ${dateStr}\nCategory: ${json.category}\n\n_(TxID: \`${kodeTransaksi}\`)_`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("Transaction Error:", err);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsgId,
      undefined,
      "❌ Failed to process transaction. Please try again!"
    );
  }
}

bot.on("text", async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  const text = ctx.message.text;
  if (!telegramId || text.startsWith("/")) return;

  const user = await prisma.user.findUnique({ where: { id: telegramId } });
  if (!user) return ctx.reply("❌ You are not registered. Type /start to register.");

  if (user.plan !== 'PRO') {
    return ctx.reply("🔒 *PREMIUM FEATURE*\n\nTo use this bot and track your expenses, you must upgrade to the PRO plan.", { parse_mode: "Markdown" });
  }

  if (text.toLowerCase().includes("dashboard")) {
    return sendDashboard(ctx, user);
  }

  const processingMsg = await ctx.reply("⏳ Processing...");
  await processTransactionText(ctx, user, text, processingMsg.message_id);
});

bot.on("voice", async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const user = await prisma.user.findUnique({ where: { id: telegramId } });
  if (!user) return ctx.reply("❌ You are not registered. Type /start to register.");

  if (user.plan !== 'PRO') {
    return ctx.reply("🔒 *PREMIUM FEATURE*\n\nTo use this bot and track your expenses, you must upgrade to the PRO plan.", { parse_mode: "Markdown" });
  }

  const processingMsg = await ctx.reply("🎙️ Downloading voice message...");
  
  try {
    const fileId = ctx.message.voice.file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    
    // Ensure tmp dir exists
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    
    const tempFilePath = path.join(tmpDir, `${fileId}.ogg`);
    
    // Download file
    const file = fs.createWriteStream(tempFilePath);
    await new Promise((resolve, reject) => {
      https.get(fileLink.toString(), (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      }).on('error', (err) => {
        fs.unlink(tempFilePath, () => reject(err));
      });
    });

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      undefined,
      "🎙️ Transcribing with AI..."
    );

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
    });
    
    // Clean up
    fs.unlinkSync(tempFilePath);

    const text = transcription.text;
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      undefined,
      `🎙️ *" ${text} "*\n\n⏳ Categorizing...`,
      { parse_mode: "Markdown" }
    );

    await processTransactionText(ctx, user, text, processingMsg.message_id);

  } catch (err) {
    console.error("Voice Error:", err);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      undefined,
      "❌ Failed to process voice message. Please try typing it."
    );
  }
});
