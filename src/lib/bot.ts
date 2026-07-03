import { Telegraf, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { prisma } from "./prisma";
import { categorizeTransaction } from "./ai";
import { t, asLang, type Lang } from "./i18n";
import { categoryLabel } from "./categories";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import https from "https";
import OpenAI from "openai";

const token = process.env.TELEGRAM_TOKEN;
if (!token) throw new Error("TELEGRAM_TOKEN is required");

// Price of the PRO plan in Telegram Stars (XTR). Paid in-chat, activated instantly.
const PRO_PRICE_STARS = Number(process.env.PRO_PRICE_STARS || 250);
// Telegram user ID allowed to run admin commands like /grant.
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
export const bot = new Telegraf(token);

bot.telegram.setMyCommands([
  { command: "start", description: "Register / show help" },
  { command: "dashboard", description: "Open your web dashboard" },
  { command: "stats", description: "This month's summary" },
  { command: "language", description: "Switch language (EN/ID)" },
  { command: "myid", description: "Show your user ID and plan" },
]).catch((err) => console.error("setMyCommands failed:", err));

const getUser = (telegramId: string) => prisma.user.findUnique({ where: { id: telegramId } });

const languageKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("🇬🇧 English", "lang:en"), Markup.button.callback("🇮🇩 Bahasa Indonesia", "lang:id")],
]);

const upgradeKeyboard = (lang: Lang) => Markup.inlineKeyboard([
  [Markup.button.callback(t(lang, "upgradeButton", { price: PRO_PRICE_STARS }), "buy_pro")],
]);

async function sendProInvoice(ctx: any, lang: Lang) {
  await ctx.replyWithInvoice({
    title: t(lang, "invoiceTitle"),
    description: t(lang, "invoiceDescription"),
    payload: "pro_upgrade",
    provider_token: "", // empty for Telegram Stars
    currency: "XTR",
    prices: [{ label: "PRO", amount: PRO_PRICE_STARS }],
  });
}

async function sendDashboard(ctx: any, user: { id: string; language: string }) {
  const lang = asLang(user.language);
  const sessionToken = crypto.randomUUID();
  await prisma.session.create({
    data: {
      id: sessionToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
    },
  });

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://your-deployment-url.com") + "/api/auth?token=" + sessionToken;

  await ctx.reply(t(lang, "dashboardReady"), {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[{ text: t(lang, "openDashboard"), url: appUrl }]],
    },
  });
}

bot.start(async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  const name = ctx.from?.first_name || "User";
  if (!telegramId) return;

  try {
    let user = await getUser(telegramId);
    if (!user) {
      // Default the language to what the user's Telegram client uses.
      const language = ctx.from?.language_code === "id" ? "id" : "en";
      user = await prisma.user.create({ data: { id: telegramId, name, language } });
      const lang = asLang(user.language);
      await ctx.reply(t(lang, "welcomeNew", { name }), { parse_mode: "Markdown" });
      await ctx.reply(t(lang, "chooseLanguage"), languageKeyboard);
    } else {
      await ctx.reply(t(asLang(user.language), "welcomeBack", { name: user.name }), { parse_mode: "Markdown" });
    }
  } catch (error) {
    console.error(error);
    await ctx.reply(t("en", "registrationFailed"));
  }
});

bot.command("language", async (ctx) => {
  const user = await getUser(ctx.from.id.toString());
  const lang = asLang(user?.language);
  await ctx.reply(t(lang, "chooseLanguage"), languageKeyboard);
});

bot.action(/^lang:(en|id)$/, async (ctx) => {
  const lang = ctx.match[1] as Lang;
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return ctx.answerCbQuery();

  await prisma.user.update({ where: { id: telegramId }, data: { language: lang } }).catch(() => null);
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(lang, "languageSet"), { parse_mode: "Markdown" });
});

bot.command("myid", async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const user = await getUser(telegramId);
  if (user) {
    await ctx.reply(t(asLang(user.language), "myId", { id: user.id, name: user.name, plan: user.plan }), { parse_mode: "Markdown" });
  } else {
    await ctx.reply(t("en", "notRegistered"));
  }
});

// --- Payment: Telegram Stars ---

bot.command("upgrade", async (ctx) => {
  const user = await getUser(ctx.from.id.toString());
  if (!user) return ctx.reply(t("en", "notRegistered"));
  const lang = asLang(user.language);
  if (user.plan === "PRO") return ctx.reply(t(lang, "alreadyPro"));
  await sendProInvoice(ctx, lang);
});

bot.action("buy_pro", async (ctx) => {
  const user = await getUser(ctx.from!.id.toString());
  await ctx.answerCbQuery();
  if (!user) return;
  const lang = asLang(user.language);
  if (user.plan === "PRO") return ctx.reply(t(lang, "alreadyPro"));
  await sendProInvoice(ctx, lang);
});

bot.on("pre_checkout_query", async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

bot.on(message("successful_payment"), async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await prisma.user.update({
    where: { id: telegramId },
    data: { plan: "PRO" },
  }).catch(() => null);
  await ctx.reply(t(asLang(user?.language), "paymentSuccess"), { parse_mode: "Markdown" });
});

// Manual fallback: admin can grant PRO (e.g. refunds, promos).
bot.command("grant", async (ctx) => {
  const senderId = ctx.from.id.toString();
  const admin = await getUser(senderId);
  const lang = asLang(admin?.language);
  if (!ADMIN_TELEGRAM_ID || senderId !== ADMIN_TELEGRAM_ID) {
    return ctx.reply(t(lang, "adminOnly"));
  }

  const parts = ctx.message.text.split(" ").filter(Boolean);
  if (parts.length < 2) return ctx.reply(t(lang, "grantUsage"));

  const targetId = parts[1];
  try {
    const target = await prisma.user.update({ where: { id: targetId }, data: { plan: "PRO" } });
    await ctx.reply(t(lang, "grantSuccess", { id: targetId }));
    await ctx.telegram.sendMessage(targetId, t(asLang(target.language), "paymentSuccess"), { parse_mode: "Markdown" });
  } catch {
    await ctx.reply(t(lang, "grantFailed"));
  }
});

// --- Dashboard ---

bot.command("dashboard", async (ctx) => {
  const user = await getUser(ctx.from.id.toString());
  if (!user) return ctx.reply(t("en", "notRegistered"));

  const lang = asLang(user.language);
  if (user.plan !== "PRO") {
    return ctx.reply(t(lang, "premiumLock"), { parse_mode: "Markdown", ...upgradeKeyboard(lang) });
  }

  await sendDashboard(ctx, user);
});

// --- Stats ---

bot.command("stats", async (ctx) => {
  const user = await getUser(ctx.from.id.toString());
  if (!user) return ctx.reply(t("en", "notRegistered"));
  const lang = asLang(user.language);
  if (user.plan !== "PRO") {
    return ctx.reply(t(lang, "premiumLock"), { parse_mode: "Markdown", ...upgradeKeyboard(lang) });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: monthStart } },
  });

  if (transactions.length === 0) {
    return ctx.reply(t(lang, "statsEmpty"), { parse_mode: "Markdown" });
  }

  let income = 0;
  let expense = 0;
  const byCategory: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.type === "pemasukan") income += tx.amount;
    else {
      expense += tx.amount;
      const label = categoryLabel(tx.category, lang);
      byCategory[label] = (byCategory[label] || 0) + tx.amount;
    }
  }

  const topList = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, amt], i) => `${i + 1}. ${name} — Rp ${amt.toLocaleString("id-ID")}`)
    .join("\n");

  const monthName = now.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { month: "long", year: "numeric" });
  let body = t(lang, "statsTitle", { month: monthName }) + "\n\n" + t(lang, "statsBody", {
    income: income.toLocaleString("id-ID"),
    expense: expense.toLocaleString("id-ID"),
    net: (income - expense).toLocaleString("id-ID"),
    count: transactions.length,
  });
  if (topList) body += "\n" + t(lang, "statsTopCategories", { list: topList });

  await ctx.reply(body, { parse_mode: "Markdown" });
});

// --- Transaction logging ---

async function processTransactionText(ctx: any, user: any, text: string, processingMsgId: number) {
  const lang = asLang(user.language);
  try {
    const json = await categorizeTransaction(text, lang);
    const now = new Date();
    const amount = Number(json.amount);

    if (isNaN(amount) || amount <= 0) {
      await ctx.telegram.editMessageText(ctx.chat.id, processingMsgId, undefined, t(lang, "invalidAmount"));
      return;
    }

    const kodeTransaksi = `${user.id}x${now.getTime()}`;
    const tx = await prisma.transaction.create({
      data: {
        user: { connect: { id: user.id } },
        amount,
        currency: json.currency || "IDR",
        type: json.type || "pengeluaran",
        category: json.category || "other",
        note: json.note || "",
        store: json.store || t(lang, "notMentioned"),
        kodeTransaksi,
        raw: text,
      },
    });

    const dateStr = now.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { month: "short", day: "numeric", year: "numeric" });
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsgId,
      undefined,
      t(lang, "txSaved", {
        store: json.store || t(lang, "notMentioned"),
        note: json.note || "-",
        sign: json.type === "pemasukan" ? "+" : "-",
        amount: amount.toLocaleString("id-ID"),
        date: dateStr,
        category: categoryLabel(json.category, lang),
      }),
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: t(lang, "undoButton"), callback_data: `del:${tx.id}` },
            { text: t(lang, "openDashboard"), callback_data: "dash" },
          ]],
        },
      }
    );
  } catch (err) {
    console.error("Transaction Error:", err);
    await ctx.telegram.editMessageText(ctx.chat.id, processingMsgId, undefined, t(lang, "txFailed"));
  }
}

// Undo a just-logged transaction.
bot.action(/^del:(.+)$/, async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  const txId = ctx.match[1];
  const user = telegramId ? await getUser(telegramId) : null;
  const lang = asLang(user?.language);

  // deleteMany scoped to the user so nobody can delete someone else's row.
  const result = user ? await prisma.transaction.deleteMany({ where: { id: txId, userId: user.id } }) : { count: 0 };
  await ctx.answerCbQuery();
  if (result.count > 0) {
    await ctx.editMessageText(t(lang, "txDeleted"));
  } else {
    await ctx.editMessageText(t(lang, "txDeleteFailed"));
  }
});

bot.action("dash", async (ctx) => {
  const user = await getUser(ctx.from!.id.toString());
  await ctx.answerCbQuery();
  if (!user) return;
  if (user.plan !== "PRO") {
    const lang = asLang(user.language);
    return ctx.reply(t(lang, "premiumLock"), { parse_mode: "Markdown", ...upgradeKeyboard(lang) });
  }
  await sendDashboard(ctx, user);
});

bot.on(message("text"), async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  const text = ctx.message.text;
  if (!telegramId || text.startsWith("/")) return;

  const user = await getUser(telegramId);
  if (!user) return ctx.reply(t("en", "notRegistered"));
  const lang = asLang(user.language);

  if (user.plan !== "PRO") {
    return ctx.reply(t(lang, "premiumLock"), { parse_mode: "Markdown", ...upgradeKeyboard(lang) });
  }

  if (text.toLowerCase().includes("dashboard")) {
    return sendDashboard(ctx, user);
  }

  const processingMsg = await ctx.reply(t(lang, "processing"));
  await processTransactionText(ctx, user, text, processingMsg.message_id);
});

bot.on(message("voice"), async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const user = await getUser(telegramId);
  if (!user) return ctx.reply(t("en", "notRegistered"));
  const lang = asLang(user.language);

  if (user.plan !== "PRO") {
    return ctx.reply(t(lang, "premiumLock"), { parse_mode: "Markdown", ...upgradeKeyboard(lang) });
  }

  const processingMsg = await ctx.reply(t(lang, "downloadingVoice"));

  try {
    const fileId = ctx.message.voice.file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);

    // Ensure tmp dir exists
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const tempFilePath = path.join(tmpDir, `${fileId}.ogg`);

    // Download file
    const file = fs.createWriteStream(tempFilePath);
    await new Promise((resolve, reject) => {
      https.get(fileLink.toString(), (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(true);
        });
      }).on("error", (err) => {
        fs.unlink(tempFilePath, () => reject(err));
      });
    });

    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, undefined, t(lang, "transcribing"));

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
      t(lang, "categorizing", { text }),
      { parse_mode: "Markdown" }
    );

    await processTransactionText(ctx, user, text, processingMsg.message_id);
  } catch (err) {
    console.error("Voice Error:", err);
    await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, undefined, t(lang, "voiceFailed"));
  }
});
