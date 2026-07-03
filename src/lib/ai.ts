import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function categorizeTransaction(text: string) {
  const prompt = `You are a financial categorization assistant. Extract transaction details from this message.
Return ONLY valid JSON.
Keys must be exactly:
- type (must be "pemasukan" or "pengeluaran")
- amount (number)
- currency (IDR, USD, SGD, EUR)
- category (for pengeluaran: Makan & Minum, Transportasi, Hiburan, Belanja, Kesehatan, Bisnis, Tagihan, Lainnya. for pemasukan: Gaji, Pemberian, Investasi, Bisnis, Lainnya)
- note (item name in Bahasa Indonesia, max 3 words)
- store (shop/person name if mentioned, otherwise "tidak disebut")

Example: "makan di mcd 50k" -> {"type": "pengeluaran", "amount": 50000, "currency": "IDR", "category": "Makan & Minum", "note": "makan", "store": "mcd"}
Example: "received 5 million from friend" -> {"type": "pemasukan", "amount": 5000000, "currency": "IDR", "category": "Pemberian", "note": "dari teman", "store": "teman"}
Example: "grab to office 25000" -> {"type": "pengeluaran", "amount": 25000, "currency": "IDR", "category": "Transportasi", "note": "grab to office", "store": "grab"}

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
