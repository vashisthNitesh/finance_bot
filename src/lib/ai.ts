import OpenAI from "openai";
import type { Lang } from "./i18n";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function categorizeTransaction(text: string, lang: Lang = "en") {
  const noteLanguage = lang === "id" ? "Bahasa Indonesia" : "English";
  const prompt = `You are a financial categorization assistant. Extract transaction details from this message.
Return ONLY valid JSON.
Keys must be exactly:
- type (must be "pemasukan" for income or "pengeluaran" for expense)
- amount (number)
- currency (IDR, USD, SGD, EUR)
- category (for pengeluaran: food, transport, entertainment, shopping, health, business, bills, other. for pemasukan: salary, gift, investment, business, other)
- note (item name in ${noteLanguage}, max 3 words)
- store (shop/person name if mentioned, otherwise "")

Example: "makan di mcd 50k" -> {"type": "pengeluaran", "amount": 50000, "currency": "IDR", "category": "food", "note": "makan", "store": "mcd"}
Example: "received 5 million from friend" -> {"type": "pemasukan", "amount": 5000000, "currency": "IDR", "category": "gift", "note": "from friend", "store": "friend"}
Example: "grab to office 25000" -> {"type": "pengeluaran", "amount": 25000, "currency": "IDR", "category": "transport", "note": "grab to office", "store": "grab"}

Message: "${text}"`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const rawContent = res.choices[0]?.message?.content || '{}';
    return JSON.parse(rawContent);
  } catch (err) {
    console.error("AI Error:", err);
    throw err;
  }
}
