"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  BarChart, Bar, PieChart as RePieChart, Pie, Cell, ResponsiveContainer,
  Tooltip as RechartsTooltip, Legend, CartesianGrid, XAxis, YAxis
} from "recharts";
import {
  Wallet, ArrowDownRight, ArrowUpRight, Search, User, ShoppingBag, Utensils, Gift,
  Car, Tv, HeartPulse, Briefcase, FileText, MoreHorizontal, DollarSign, TrendingUp,
  TrendingDown, Minus, PieChart, Calendar as CalendarIcon, LogOut, RefreshCw,
  Download, ChevronLeft, ChevronRight, LineChart, Send
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CATEGORIES, normalizeCategory, categoryLabel, type CategoryKey } from "@/lib/categories";

// Income/expense pair + per-category colors validated with the dataviz palette
// checker (CVD ΔE 21.2, gaps + labels provide the sub-3:1 contrast relief).
const INCOME_COLOR = "#1baf7a";
const EXPENSE_COLOR = "#e34948";

const CATEGORY_ICONS: Record<CategoryKey, React.ReactNode> = {
  food: <Utensils size={14} />,
  transport: <Car size={14} />,
  entertainment: <Tv size={14} />,
  shopping: <ShoppingBag size={14} />,
  health: <HeartPulse size={14} />,
  business: <Briefcase size={14} />,
  bills: <FileText size={14} />,
  salary: <DollarSign size={14} />,
  gift: <Gift size={14} />,
  investment: <TrendingUp size={14} />,
  other: <MoreHorizontal size={14} />,
};

const getCategoryIcon = (raw: string) => {
  const cat = normalizeCategory(raw);
  return <span style={{ color: cat.color }}>{CATEGORY_ICONS[cat.key]}</span>;
};

type Preset = "thisMonth" | "lastMonth" | "last30" | "thisYear" | "all" | "custom";

const i18n = {
  en: {
    netBalance: "Net Balance",
    expenses: "Total Expenses",
    income: "Total Income",
    thisMonth: "Selected Period",
    vsLastMonth: "vs previous period",
    cashFlow: "Cash Flow",
    spendingBreakdown: "Spending Breakdown",
    largestTx: "Largest Transactions",
    history: "Transaction History",
    search: "Search transactions...",
    date: "Date",
    item: "Item / Store",
    category: "Category",
    amount: "Amount",
    noData: "No data available",
    noFound: "No transactions found",
    unauthTitle: "Finance Tracker",
    unauthDesc: "Your dashboard opens straight from Telegram — no password needed.",
    unauthStep1: "Open the bot in Telegram",
    unauthStep2: "Send the /dashboard command",
    unauthStep3: "Tap the “Open Dashboard” button",
    presets: { thisMonth: "This month", lastMonth: "Last month", last30: "Last 30 days", thisYear: "This year", all: "All time", custom: "Custom" },
    typeAll: "All",
    typeIncome: "Income",
    typeExpense: "Expenses",
    allCategories: "All categories",
    exportCsv: "Export CSV",
    logout: "Log out",
    refresh: "Refresh",
    overview: "Overview",
    txCount: "transactions",
    pageOf: (a: number, b: number) => `Page ${a} of ${b}`,
    incomeLabel: "Income",
    expenseLabel: "Expense",
    ofSpending: "of spending",
  },
  id: {
    netBalance: "Sisa Saldo",
    expenses: "Total Pengeluaran",
    income: "Total Pemasukan",
    thisMonth: "Periode Terpilih",
    vsLastMonth: "vs periode sebelumnya",
    cashFlow: "Arus Kas",
    spendingBreakdown: "Rincian Pengeluaran",
    largestTx: "Transaksi Terbesar",
    history: "Riwayat Transaksi",
    search: "Cari transaksi...",
    date: "Tanggal",
    item: "Item / Toko",
    category: "Kategori",
    amount: "Nominal",
    noData: "Tidak ada data",
    noFound: "Tidak ada transaksi ditemukan",
    unauthTitle: "Finance Tracker",
    unauthDesc: "Dashboard kamu terbuka langsung dari Telegram — tanpa kata sandi.",
    unauthStep1: "Buka bot di Telegram",
    unauthStep2: "Kirim perintah /dashboard",
    unauthStep3: "Ketuk tombol “Buka Dashboard”",
    presets: { thisMonth: "Bulan ini", lastMonth: "Bulan lalu", last30: "30 hari terakhir", thisYear: "Tahun ini", all: "Semua", custom: "Kustom" },
    typeAll: "Semua",
    typeIncome: "Pemasukan",
    typeExpense: "Pengeluaran",
    allCategories: "Semua kategori",
    exportCsv: "Ekspor CSV",
    logout: "Keluar",
    refresh: "Muat ulang",
    overview: "Ringkasan",
    txCount: "transaksi",
    pageOf: (a: number, b: number) => `Halaman ${a} dari ${b}`,
    incomeLabel: "Pemasukan",
    expenseLabel: "Pengeluaran",
    ofSpending: "dari pengeluaran",
  },
};

const PAGE_SIZE = 10;
const fmt = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

function presetRange(preset: Preset): [Date | null, Date | null] {
  const now = new Date();
  switch (preset) {
    case "thisMonth":
      return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)];
    case "lastMonth":
      return [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)];
    case "last30":
      return [new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000), now];
    case "thisYear":
      return [new Date(now.getFullYear(), 0, 1), now];
    default:
      return [null, null];
  }
}

export default function Dashboard() {
  const [lang, setLang] = useState<"en" | "id">("en");
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "pemasukan" | "pengeluaran">("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey | null>(null);
  const [page, setPage] = useState(1);
  const [preset, setPreset] = useState<Preset>("thisMonth");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  const t = i18n[lang];
  const locale = lang === "en" ? "en-US" : "id-ID";

  const fetchData = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await fetch(`/api/data`);
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setTransactions(data.transactions);
        if (data.user?.language === "id" || data.user?.language === "en") setLang(data.user.language);
      }
    } catch {
      // keep whatever we had; unauth screen shows when user stays null
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Set the default range after mount to avoid an SSR hydration mismatch.
    setDateRange(presetRange("thisMonth"));
  }, [fetchData]);

  const changeLang = (next: "en" | "id") => {
    setLang(next);
    // Persist so the bot and the next visit speak the same language.
    fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: next }),
    }).catch(() => null);
  };

  const applyPreset = (p: Preset) => {
    setPreset(p);
    setDateRange(presetRange(p));
    setPage(1);
  };

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => null);
    setUser(null);
    setTransactions([]);
  };

  // Transactions inside the selected date range (charts + KPIs use this).
  const periodTx = useMemo(() => {
    if (!startDate || !endDate) return transactions;
    return transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d >= startDate && d <= endDate;
    });
  }, [transactions, startDate, endDate]);

  // Table adds search / type / category on top of the period.
  const filteredTx = useMemo(() => {
    const q = search.toLowerCase();
    return periodTx.filter((tx) => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (categoryFilter && normalizeCategory(tx.category).key !== categoryFilter) return false;
      if (!q) return true;
      return (
        tx.note?.toLowerCase().includes(q) ||
        tx.category?.toLowerCase().includes(q) ||
        categoryLabel(tx.category, lang).toLowerCase().includes(q) ||
        tx.store?.toLowerCase().includes(q)
      );
    });
  }, [periodTx, search, typeFilter, categoryFilter, lang]);

  const totalPages = Math.max(1, Math.ceil(filteredTx.length / PAGE_SIZE));
  const pageTx = filteredTx.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, typeFilter, categoryFilter, startDate, endDate]);

  const stats = useMemo(() => {
    let expense = 0;
    let income = 0;
    let prevExpense = 0;
    let prevIncome = 0;

    const dailyMap: Record<string, { inc: number; exp: number; timestamp: number }> = {};
    const catMap: Record<string, number> = {};
    let largestExpenses: any[] = [];

    // Previous window of the same length, for the trend badges.
    let prevStart: Date | null = null;
    let prevEnd: Date | null = null;
    if (startDate && endDate) {
      const duration = endDate.getTime() - startDate.getTime();
      prevStart = new Date(startDate.getTime() - duration - 24 * 60 * 60 * 1000);
      prevEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    }

    transactions.forEach((tx) => {
      const amt = Number(tx.amount);
      const txDate = new Date(tx.date);
      const inPeriod = startDate && endDate ? txDate >= startDate && txDate <= endDate : true;
      const inPrev = prevStart && prevEnd ? txDate >= prevStart && txDate <= prevEnd : false;

      if (tx.type === "pengeluaran") {
        if (inPeriod) {
          expense += amt;
          const key = normalizeCategory(tx.category).key;
          catMap[key] = (catMap[key] || 0) + amt;
          largestExpenses.push(tx);
        }
        if (inPrev) prevExpense += amt;
      } else {
        if (inPeriod) income += amt;
        if (inPrev) prevIncome += amt;
      }

      if (inPeriod) {
        const dateKey = txDate.toLocaleDateString(locale, { day: "2-digit", month: "short" });
        if (!dailyMap[dateKey]) dailyMap[dateKey] = { inc: 0, exp: 0, timestamp: txDate.getTime() };
        if (tx.type === "pengeluaran") dailyMap[dateKey].exp += amt;
        else dailyMap[dateKey].inc += amt;
      }
    });

    largestExpenses = largestExpenses.sort((a, b) => b.amount - a.amount).slice(0, 4);

    const categoryData = (Object.keys(catMap) as CategoryKey[])
      .map((key) => ({ key, value: catMap[key], color: normalizeCategory(key).color }))
      .sort((a, b) => b.value - a.value);

    const trendData = Object.keys(dailyMap)
      .sort((a, b) => dailyMap[a].timestamp - dailyMap[b].timestamp)
      .map((dateKey) => ({ date: dateKey, inc: dailyMap[dateKey].inc, exp: dailyMap[dateKey].exp }));

    const net = income - expense;
    const prevNet = prevIncome - prevExpense;
    const pct = (cur: number, prev: number) => (prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : cur !== 0 ? 100 : 0);

    return {
      net, expense, income,
      expChange: pct(expense, prevExpense),
      incChange: pct(income, prevIncome),
      netChange: pct(net, prevNet),
      categoryData, trendData, largestExpenses,
      hasPrev: !!(prevStart && prevEnd),
    };
  }, [transactions, locale, startDate, endDate]);

  const renderTrend = (value: number, invertColors = false) => {
    if (!stats.hasPrev) return null;
    const isPositive = value > 0;
    const isNeutral = Math.abs(value) < 0.05;

    let color = "text-slate-500 bg-slate-100";
    let Icon = Minus;
    if (!isNeutral) {
      const good = invertColors ? !isPositive : isPositive;
      color = good ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100";
      Icon = isPositive ? TrendingUp : TrendingDown;
    }

    return (
      <span title={t.vsLastMonth} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>
        <Icon size={10} />
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  const exportCsv = () => {
    const header = ["date", "type", "category", "note", "store", "amount", "currency"];
    const rows = filteredTx.map((tx) => [
      new Date(tx.date).toISOString().slice(0, 10),
      tx.type,
      categoryLabel(tx.category, lang),
      tx.note ?? "",
      tx.store ?? "",
      tx.amount,
      tx.currency,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bento-card p-8 max-w-sm w-full text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white mb-4">
            <Wallet size={26} />
          </div>
          <h1 className="text-xl font-bold mb-1.5">{t.unauthTitle}</h1>
          <p className="text-muted-foreground text-xs mb-6">{t.unauthDesc}</p>
          <ol className="text-left text-xs space-y-3 mb-6">
            {[t.unauthStep1, t.unauthStep2, t.unauthStep3].map((step, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                <span className="font-medium text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
          <div className="flex justify-center gap-2 mb-2">
            <button onClick={() => setLang("en")} className={`px-3 py-1 text-xs rounded-md font-medium border ${lang === "en" ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-muted-foreground"}`}>EN</button>
            <button onClick={() => setLang("id")} className={`px-3 py-1 text-xs rounded-md font-medium border ${lang === "id" ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-muted-foreground"}`}>ID</button>
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Send size={12} /> Telegram → /dashboard
          </div>
        </div>
      </div>
    );
  }

  const donutTotal = stats.expense;

  return (
    <div className="min-h-screen bg-background pb-10 text-sm">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold truncate">{user.name}</h2>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <User size={10} /> ID: ••••••••
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex bg-muted p-1 rounded-lg border border-border">
            <button onClick={() => changeLang("en")} className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${lang === "en" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>EN</button>
            <button onClick={() => changeLang("id")} className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${lang === "id" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>ID</button>
          </div>
          <div className="bg-primary px-3 py-1.5 rounded-full text-[10px] font-bold text-primary-foreground tracking-widest uppercase">
            {user.plan === "free" ? "Free" : "PRO"}
          </div>
          <button onClick={() => fetchData(true)} title={t.refresh} className="p-2 rounded-lg border border-border bg-white text-slate-500 hover:text-slate-800 transition-colors">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button onClick={logout} title={t.logout} className="p-2 rounded-lg border border-border bg-white text-slate-500 hover:text-red-600 transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 mt-2">

        {/* Period controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-2">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 shrink-0">
            <CalendarIcon size={20} className="text-slate-400" />
            {startDate && endDate
              ? `${startDate.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })} – ${endDate.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`
              : t.presets.all}{" "}{t.overview}
          </h2>
          <div className="flex flex-wrap items-center gap-2 relative z-40">
            {(["thisMonth", "lastMonth", "last30", "thisYear", "all"] as Preset[]).map((p) => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${preset === p ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
              >
                {t.presets[p]}
              </button>
            ))}
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => { setPreset("custom"); setDateRange(update); }}
              isClearable={true}
              placeholderText={t.presets.custom}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-full px-4 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400 cursor-pointer shadow-sm transition-all w-[210px]"
            />
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <Wallet size={20} />, iconCls: "bg-slate-100 text-slate-700", label: t.netBalance, value: stats.net, trend: renderTrend(stats.netChange) },
            { icon: <ArrowDownRight size={20} />, iconCls: "bg-red-50 text-red-600", label: t.expenses, value: stats.expense, trend: renderTrend(stats.expChange, true) },
            { icon: <ArrowUpRight size={20} />, iconCls: "bg-green-50 text-green-600", label: t.income, value: stats.income, trend: renderTrend(stats.incChange) },
          ].map((kpi, i) => (
            <div key={i} className="bento-card p-6">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-2.5 rounded-xl ${kpi.iconCls}`}>{kpi.icon}</div>
                {kpi.trend}
              </div>
              <p className="text-muted-foreground text-xs font-medium mb-1.5">{kpi.label}</p>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{fmt(kpi.value)}</h3>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Cash flow bars */}
          <div className="bento-card p-5 lg:col-span-2">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <LineChart size={16} className="text-slate-500" /> {t.cashFlow}
            </h3>
            <div className="h-64">
              {stats.trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.trendData} margin={{ top: 10, right: 10, left: -14, bottom: 0 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <RechartsTooltip
                      cursor={{ fill: "#f8fafc" }}
                      formatter={(value, name) => [fmt(Number(value)), name === "inc" ? t.incomeLabel : t.expenseLabel]}
                      contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "12px", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
                    <Legend verticalAlign="top" height={32} iconType="circle" iconSize={8} formatter={(v) => <span className="text-[11px] text-slate-600">{v === "inc" ? t.incomeLabel : t.expenseLabel}</span>} />
                    <Bar dataKey="inc" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="exp" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">{t.noData}</div>
              )}
            </div>
          </div>

          {/* Spending donut + labeled list */}
          <div className="bento-card p-5">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <PieChart size={16} className="text-slate-500" /> {t.spendingBreakdown}
            </h3>
            {stats.categoryData.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="h-40 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={stats.categoryData}
                        dataKey="value"
                        nameKey="key"
                        innerRadius={48}
                        outerRadius={70}
                        paddingAngle={2}
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {stats.categoryData.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={entry.color}
                            opacity={categoryFilter && categoryFilter !== entry.key ? 0.25 : 1}
                            cursor="pointer"
                            onClick={() => setCategoryFilter(categoryFilter === entry.key ? null : entry.key)}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value, name) => [fmt(Number(value)), categoryLabel(String(name), lang)]}
                        contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "12px", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-muted-foreground">{t.expenses}</span>
                    <span className="text-xs font-bold text-slate-900">{fmt(donutTotal)}</span>
                  </div>
                </div>
                <div className="w-full mt-3 space-y-2.5">
                  {stats.categoryData.slice(0, 5).map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setCategoryFilter(categoryFilter === cat.key ? null : cat.key)}
                      className={`w-full flex justify-between items-center text-xs rounded-lg px-2 py-1 transition-colors ${categoryFilter === cat.key ? "bg-slate-100" : "hover:bg-slate-50"}`}
                    >
                      <span className="font-medium flex items-center gap-2 text-slate-700">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                        {getCategoryIcon(cat.key)} {categoryLabel(cat.key, lang)}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {fmt(cat.value)}
                        <span className="text-muted-foreground font-normal ml-1.5">{donutTotal ? Math.round((cat.value / donutTotal) * 100) : 0}%</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-muted-foreground text-xs">{t.noData}</div>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Transactions table */}
          <div className="bento-card lg:col-span-2 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border flex flex-col gap-3 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row justify-between gap-3 items-center">
                <h3 className="font-semibold text-sm">{t.history} <span className="text-muted-foreground font-normal">({filteredTx.length} {t.txCount})</span></h3>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-56">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={t.search}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-white border border-border rounded-full pl-9 pr-4 py-1.5 text-xs outline-none focus:border-slate-400 transition-colors shadow-sm"
                    />
                  </div>
                  <button onClick={exportCsv} title={t.exportCsv} className="p-2 rounded-full border border-border bg-white text-slate-500 hover:text-slate-800 transition-colors shrink-0">
                    <Download size={13} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {([["all", t.typeAll], ["pemasukan", t.typeIncome], ["pengeluaran", t.typeExpense]] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setTypeFilter(val)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${typeFilter === val ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
                  >
                    {label}
                  </button>
                ))}
                {categoryFilter && (
                  <button
                    onClick={() => setCategoryFilter(null)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-slate-100 text-slate-700 border-slate-300 flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: normalizeCategory(categoryFilter).color }}></span>
                    {categoryLabel(categoryFilter, lang)} ✕
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-white text-muted-foreground text-[10px] font-semibold uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3 px-5">{t.date}</th>
                    <th className="py-3 px-5">{t.item}</th>
                    <th className="py-3 px-5">{t.category}</th>
                    <th className="py-3 px-5 text-right">{t.amount}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs bg-white">
                  {pageTx.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground">{t.noFound}</td>
                    </tr>
                  )}
                  {pageTx.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-5 text-muted-foreground text-[11px] font-medium whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3 px-5">
                        <div className="font-semibold text-slate-900">{tx.note || "—"}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{tx.store}</div>
                      </td>
                      <td className="py-3 px-5">
                        <button
                          onClick={() => setCategoryFilter(normalizeCategory(tx.category).key)}
                          className="bg-slate-50 px-2.5 py-1 rounded-md text-[10px] border border-slate-200 flex items-center gap-1.5 w-fit font-medium text-slate-700 hover:border-slate-300 transition-colors"
                        >
                          {getCategoryIcon(tx.category)} {categoryLabel(tx.category, lang)}
                        </button>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className={`font-semibold ${tx.type === "pengeluaran" ? "text-slate-900" : "text-green-700"} flex justify-end items-center gap-1.5 tabular-nums`}>
                          {tx.type === "pengeluaran" ? <ArrowDownRight size={14} className="text-red-500" /> : <ArrowUpRight size={14} />}
                          {fmt(Number(tx.amount))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="p-3 border-t border-border flex justify-between items-center bg-slate-50/50">
                <span className="text-[11px] text-muted-foreground">{t.pageOf(page, totalPages)}</span>
                <div className="flex gap-1.5">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg border border-border bg-white text-slate-600 disabled:opacity-40 hover:border-slate-300 transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg border border-border bg-white text-slate-600 disabled:opacity-40 hover:border-slate-300 transition-colors">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Largest transactions */}
          <div className="bento-card p-5">
            <h3 className="font-semibold text-sm mb-6 flex items-center gap-2">
              <TrendingDown size={16} className="text-slate-500" /> {t.largestTx}
            </h3>
            <div className="space-y-4">
              {stats.largestExpenses.length > 0 ? stats.largestExpenses.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
                      {getCategoryIcon(tx.category)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-slate-900 truncate">{tx.note || "—"}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {categoryLabel(tx.category, lang)}
                        {stats.expense > 0 && <span className="ml-1">· {Math.round((tx.amount / stats.expense) * 100)}% {t.ofSpending}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="font-bold text-xs whitespace-nowrap tabular-nums">{fmt(Number(tx.amount))}</div>
                </div>
              )) : (
                <div className="py-10 text-center text-muted-foreground text-xs">{t.noData}</div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
