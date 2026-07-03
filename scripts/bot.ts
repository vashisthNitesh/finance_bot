import "dotenv/config";
import { bot } from "../src/lib/bot";

// Start the bot using long polling for local development
bot.launch().then(() => {
  console.log("Finance Telegram Bot is running in long-polling mode!");
});

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
