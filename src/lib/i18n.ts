// Bot-side translations. The dashboard has its own strings in page.tsx;
// both share the user's persisted `language` ("en" | "id").

export type Lang = "en" | "id";

export const DEFAULT_LANG: Lang = "en";

export function asLang(value: string | null | undefined): Lang {
  return value === "id" ? "id" : "en";
}

type Dict = Record<string, { en: string; id: string }>;

const messages: Dict = {
  welcomeNew: {
    en: "👋 Hello *{name}*! Registration successful!\n\nJust send me a message (or a 🎙️ voice note) whenever you spend or receive money:\n• _lunch 75k_\n• _received 50000 from john_\n• _gas 20 usd_\n\n📊 /dashboard — your web dashboard\n📈 /stats — quick monthly summary\n🌐 /language — switch language",
    id: "👋 Halo *{name}*! Pendaftaran berhasil!\n\nKirim pesan (atau 🎙️ pesan suara) setiap kali kamu mengeluarkan atau menerima uang:\n• _makan siang 75rb_\n• _terima 50000 dari john_\n• _bensin 20 usd_\n\n📊 /dashboard — dashboard web kamu\n📈 /stats — ringkasan bulanan\n🌐 /language — ganti bahasa",
  },
  welcomeBack: {
    en: "👋 Welcome back, *{name}*!\n\nLog a transaction by typing it or sending a voice note. Try /stats or /dashboard.",
    id: "👋 Selamat datang kembali, *{name}*!\n\nCatat transaksi dengan mengetik atau kirim pesan suara. Coba /stats atau /dashboard.",
  },
  chooseLanguage: {
    en: "🌐 Choose your language:",
    id: "🌐 Pilih bahasa kamu:",
  },
  languageSet: {
    en: "✅ Language set to *English*. The bot and your dashboard will use it everywhere.",
    id: "✅ Bahasa diatur ke *Bahasa Indonesia*. Bot dan dashboard kamu akan memakainya di mana saja.",
  },
  notRegistered: {
    en: "❌ You are not registered. Type /start to register.",
    id: "❌ Kamu belum terdaftar. Ketik /start untuk mendaftar.",
  },
  registrationFailed: {
    en: "❌ Registration failed. Try again later.",
    id: "❌ Pendaftaran gagal. Coba lagi nanti.",
  },
  premiumLock: {
    en: "🔒 *PRO FEATURE*\n\nUpgrade to PRO to log unlimited transactions and access your dashboard.\n\nPay securely with Telegram Stars — one tap, instant activation. ⭐",
    id: "🔒 *FITUR PRO*\n\nUpgrade ke PRO untuk mencatat transaksi tanpa batas dan mengakses dashboard kamu.\n\nBayar aman dengan Telegram Stars — sekali ketuk, langsung aktif. ⭐",
  },
  upgradeButton: {
    en: "⭐ Upgrade to PRO ({price} Stars)",
    id: "⭐ Upgrade ke PRO ({price} Stars)",
  },
  invoiceTitle: {
    en: "Finance Tracker PRO",
    id: "Finance Tracker PRO",
  },
  invoiceDescription: {
    en: "Lifetime PRO access: unlimited transaction logging, voice input and the web dashboard.",
    id: "Akses PRO selamanya: pencatatan transaksi tanpa batas, input suara, dan dashboard web.",
  },
  paymentSuccess: {
    en: "🎉 *Payment received — your account is now PRO!*\n\nStart logging transactions right away, or open your dashboard with /dashboard.",
    id: "🎉 *Pembayaran diterima — akun kamu sekarang PRO!*\n\nLangsung catat transaksi, atau buka dashboard dengan /dashboard.",
  },
  alreadyPro: {
    en: "✨ You are already a PRO user!",
    id: "✨ Kamu sudah pengguna PRO!",
  },
  dashboardReady: {
    en: "📊 *Your dashboard is ready!*\n\nThe button below signs you in automatically — no password needed. The link is private, don't share it.",
    id: "📊 *Dashboard kamu siap!*\n\nTombol di bawah langsung memasukkan kamu — tanpa kata sandi. Tautannya privat, jangan dibagikan.",
  },
  openDashboard: {
    en: "📊 Open Dashboard",
    id: "📊 Buka Dashboard",
  },
  processing: {
    en: "⏳ Processing...",
    id: "⏳ Memproses...",
  },
  downloadingVoice: {
    en: "🎙️ Downloading voice message...",
    id: "🎙️ Mengunduh pesan suara...",
  },
  transcribing: {
    en: "🎙️ Transcribing with AI...",
    id: "🎙️ Mentranskripsi dengan AI...",
  },
  categorizing: {
    en: "🎙️ *\" {text} \"*\n\n⏳ Categorizing...",
    id: "🎙️ *\" {text} \"*\n\n⏳ Mengategorikan...",
  },
  invalidAmount: {
    en: "❌ Failed to process: could not find a valid amount in your message.",
    id: "❌ Gagal diproses: tidak menemukan nominal yang valid di pesan kamu.",
  },
  txSaved: {
    en: "✅ *Transaction saved!*\n\n🏪 Store/Source: {store}\n📝 Item: {note}\n💰 Total: {sign}Rp {amount}\n📅 Date: {date}\n🏷️ Category: {category}",
    id: "✅ *Transaksi tersimpan!*\n\n🏪 Toko/Sumber: {store}\n📝 Item: {note}\n💰 Total: {sign}Rp {amount}\n📅 Tanggal: {date}\n🏷️ Kategori: {category}",
  },
  txFailed: {
    en: "❌ Failed to process transaction. Please try again!",
    id: "❌ Gagal memproses transaksi. Coba lagi ya!",
  },
  voiceFailed: {
    en: "❌ Failed to process voice message. Please try typing it.",
    id: "❌ Gagal memproses pesan suara. Coba ketik saja.",
  },
  undoButton: {
    en: "🗑 Undo",
    id: "🗑 Batalkan",
  },
  txDeleted: {
    en: "🗑 Transaction deleted.",
    id: "🗑 Transaksi dihapus.",
  },
  txDeleteFailed: {
    en: "❌ Could not delete this transaction anymore.",
    id: "❌ Transaksi ini sudah tidak bisa dihapus.",
  },
  statsTitle: {
    en: "📈 *{month} summary*",
    id: "📈 *Ringkasan {month}*",
  },
  statsBody: {
    en: "💚 Income: Rp {income}\n❤️ Expenses: Rp {expense}\n💰 Net: Rp {net}\n🧾 Transactions: {count}",
    id: "💚 Pemasukan: Rp {income}\n❤️ Pengeluaran: Rp {expense}\n💰 Sisa: Rp {net}\n🧾 Transaksi: {count}",
  },
  statsTopCategories: {
    en: "\n🏷️ *Top spending:*\n{list}",
    id: "\n🏷️ *Pengeluaran teratas:*\n{list}",
  },
  statsEmpty: {
    en: "📭 No transactions this month yet. Send something like _lunch 50k_ to get started!",
    id: "📭 Belum ada transaksi bulan ini. Kirim misalnya _makan siang 50rb_ untuk mulai!",
  },
  grantUsage: {
    en: "Usage: /grant <userId>",
    id: "Cara pakai: /grant <userId>",
  },
  grantSuccess: {
    en: "✅ User {id} upgraded to PRO!",
    id: "✅ User {id} berhasil di-upgrade ke PRO!",
  },
  grantFailed: {
    en: "❌ Failed to upgrade: user not found.",
    id: "❌ Gagal upgrade: user tidak ditemukan.",
  },
  adminOnly: {
    en: "⛔ This command is for admins only.",
    id: "⛔ Perintah ini hanya untuk admin.",
  },
  myId: {
    en: "🆔 *Your User ID:* `{id}`\n👤 Name: {name}\n📦 Plan: {plan}",
    id: "🆔 *User ID kamu:* `{id}`\n👤 Nama: {name}\n📦 Paket: {plan}",
  },
  notMentioned: {
    en: "not mentioned",
    id: "tidak disebut",
  },
};

export type MessageKey = keyof typeof messages;

export function t(lang: Lang, key: MessageKey, vars: Record<string, string | number> = {}): string {
  let text = messages[key][lang];
  for (const [k, v] of Object.entries(vars)) {
    text = text.split(`{${k}}`).join(String(v));
  }
  return text;
}
