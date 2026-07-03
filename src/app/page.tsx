"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  BarChart, Bar, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, CartesianGrid, XAxis, YAxis
} from "recharts";
import { Wallet, ArrowDownRight, ArrowUpRight, Search, User, ShoppingBag, Utensils, Gift, Car, Tv, HeartPulse, Briefcase, FileText, MoreHorizontal, DollarSign, TrendingUp, TrendingDown, Minus, PieChart, ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const getCategoryIcon = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'food & drink': return <Utensils size={14} className="text-orange-500"/>;
    case 'shopping': return <ShoppingBag size={14} className="text-pink-500"/>;
    case 'gift': return <Gift size={14} className="text-purple-500"/>;
    case 'transport': return <Car size={14} className="text-blue-500"/>;
    case 'entertainment': return <Tv size={14} className="text-indigo-500"/>;
    case 'health': return <HeartPulse size={14} className="text-red-500"/>;
    case 'business': return <Briefcase size={14} className="text-amber-500"/>;
    case 'bills': return <FileText size={14} className="text-slate-500"/>;
    case 'salary': return <DollarSign size={14} className="text-emerald-500"/>;
    default: return <MoreHorizontal size={14} className="text-muted-foreground"/>;
  }
};

const getCategoryColor = (category: string) => {
  switch (category?.toLowerCase()) {
    case 'food & drink': return "bg-orange-500";
    case 'shopping': return "bg-pink-500";
    case 'gift': return "bg-purple-500";
    case 'transport': return "bg-blue-500";
    case 'entertainment': return "bg-indigo-500";
    case 'health': return "bg-red-500";
    case 'business': return "bg-amber-500";
    case 'bills': return "bg-slate-500";
    case 'salary': return "bg-emerald-500";
    default: return "bg-slate-400";
  }
};

const i18n = {
  en: {
    netBalance: "Net Balance",
    expenses: "Total Expenses",
    income: "Total Income",
    thisMonth: "Selected Period",
    vsLastMonth: "vs previous period",
    cashFlow: "Cash Flow (Selected Period)",
    topCategories: "Top Spending Categories",
    largestTx: "Largest Transactions",
    history: "Transaction History",
    search: "Search transactions...",
    date: "Date",
    item: "Item / Store",
    category: "Category",
    amount: "Amount",
    noData: "No data available",
    noFound: "No transactions found",
    loginDesc: "Login using your User ID (Optional fallback)",
    loginBtn: "Login",
    unauth: "Please log in via the Telegram bot link to view your dashboard securely.",
  },
  id: {
    netBalance: "Sisa Saldo",
    expenses: "Total Pengeluaran",
    income: "Total Pemasukan",
    thisMonth: "Periode Terpilih",
    vsLastMonth: "vs periode sebelumnya",
    cashFlow: "Arus Kas (Periode Terpilih)",
    topCategories: "Kategori Pengeluaran Teratas",
    largestTx: "Transaksi Terbesar",
    history: "Riwayat Transaksi",
    search: "Cari transaksi...",
    date: "Tanggal",
    item: "Item / Toko",
    category: "Kategori",
    amount: "Nominal",
    noData: "Tidak ada data",
    noFound: "Tidak ada transaksi ditemukan",
    loginDesc: "Masuk menggunakan User ID Anda (Opsional)",
    loginBtn: "Masuk",
    unauth: "Silakan masuk melalui tautan bot Telegram untuk melihat dashboard Anda secara aman.",
  }
};

export default function Dashboard() {
  const [lang, setLang] = useState<"en" | "id">("en");
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  
  // Default to null to prevent SSR hydration mismatch
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  const t = i18n[lang];

  useEffect(() => {
    fetchData();
    setDateRange([
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    ]);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/data`);
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setTransactions(data.transactions);
      } else {
        setError(data.error || "User not found");
      }
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const filteredTx = useMemo(() => {
    let filtered = transactions;
    if (startDate && endDate) {
      filtered = filtered.filter(tx => {
        const d = new Date(tx.date);
        return d >= startDate && d <= endDate;
      });
    }
    return filtered.filter(tx => 
      tx.note?.toLowerCase().includes(search.toLowerCase()) || 
      tx.category?.toLowerCase().includes(search.toLowerCase()) ||
      tx.store?.toLowerCase().includes(search.toLowerCase())
    );
  }, [transactions, search, startDate, endDate]);

  const stats = useMemo(() => {
    let thisMonthExpense = 0;
    let thisMonthIncome = 0;
    let lastMonthExpense = 0;
    let lastMonthIncome = 0;
    
    const dailyMap: Record<string, { inc: number; exp: number; timestamp: number }> = {};
    const catMap: Record<string, number> = {};
    let largestExpenses: any[] = [];

    // Calculate previous period exact duration for fair comparison
    let prevStart: Date | null = null;
    let prevEnd: Date | null = null;
    if (startDate && endDate) {
        const duration = endDate.getTime() - startDate.getTime();
        prevStart = new Date(startDate.getTime() - duration - (24*60*60*1000));
        prevEnd = new Date(startDate.getTime() - (24*60*60*1000));
    }

    transactions.forEach(tx => {
      const amt = Number(tx.amount);
      const txDate = new Date(tx.date);
      
      const isThisPeriod = startDate && endDate ? (txDate >= startDate && txDate <= endDate) : true;
      const isLastPeriod = prevStart && prevEnd ? (txDate >= prevStart && txDate <= prevEnd) : (!startDate && !endDate ? false : true); // If no range, no previous period comparison

      if (tx.type === "pengeluaran") {
        if (isThisPeriod) {
            thisMonthExpense += amt;
            catMap[tx.category] = (catMap[tx.category] || 0) + amt;
            largestExpenses.push(tx);
        }
        if (isLastPeriod) lastMonthExpense += amt;
      } else {
        if (isThisPeriod) thisMonthIncome += amt;
        if (isLastPeriod) lastMonthIncome += amt;
      }

      // Chart only for selected period
      if (isThisPeriod) {
          const dateKey = txDate.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { day: "2-digit", month: "short" });
          if (!dailyMap[dateKey]) dailyMap[dateKey] = { inc: 0, exp: 0, timestamp: txDate.getTime() };
          if (tx.type === "pengeluaran") dailyMap[dateKey].exp += amt;
          else dailyMap[dateKey].inc += amt;
      }
    });

    largestExpenses = largestExpenses.sort((a,b) => b.amount - a.amount).slice(0, 4);
    const categoryData = Object.keys(catMap).map(name => ({ name, value: catMap[name] })).sort((a,b) => b.value - a.value).slice(0, 5);
    
    const trendData = Object.keys(dailyMap)
        .sort((a, b) => dailyMap[a].timestamp - dailyMap[b].timestamp)
        .map(dateKey => ({
            date: dateKey,
            Income: dailyMap[dateKey].inc,
            Expense: dailyMap[dateKey].exp
        }));

    const netBalance = thisMonthIncome - thisMonthExpense;
    
    const expChange = lastMonthExpense ? (((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100) : (thisMonthExpense > 0 ? 100 : 0);
    const incChange = lastMonthIncome ? (((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100) : (thisMonthIncome > 0 ? 100 : 0);
    const netChange = (lastMonthIncome - lastMonthExpense) !== 0 ? (((netBalance - (lastMonthIncome - lastMonthExpense)) / Math.abs(lastMonthIncome - lastMonthExpense)) * 100) : (netBalance !== 0 ? 100 : 0);

    return { netBalance, thisMonthExpense, thisMonthIncome, expChange, incChange, netChange, categoryData, trendData, largestExpenses, hasPrev: !!(prevStart && prevEnd) };
  }, [transactions, lang, startDate, endDate]);

  const renderTrend = (value: number, invertColors = false) => {
    if (!stats.hasPrev) return null; // Hide if no comparison
    const isPositive = value > 0;
    const isNeutral = value === 0;
    
    let color = "text-slate-500 bg-slate-100";
    let Icon = Minus;

    if (!isNeutral) {
        if (invertColors) {
            // For expenses, going UP is bad (red)
            color = isPositive ? "text-red-600 bg-red-100" : "text-green-600 bg-green-100";
        } else {
            // For income/net, going UP is good (green)
            color = isPositive ? "text-green-600 bg-green-100" : "text-red-600 bg-red-100";
        }
        Icon = isPositive ? TrendingUp : TrendingDown;
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>
        <Icon size={10} />
        {Math.abs(value).toFixed(1)}%
      </span>
    );
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
        <div className="bento-card p-6 max-w-sm w-full text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-800 mb-4">
            <Wallet size={24} />
          </div>
          <h1 className="text-xl font-bold mb-2">Finance Tracker</h1>
          <p className="text-muted-foreground text-xs mb-4">{t.unauth}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10 text-sm">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="font-semibold">{user.name}</h2>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <User size={10} /> ID: ••••••••
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-muted p-1 rounded-lg border border-border">
            <button onClick={() => setLang("en")} className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${lang === "en" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>EN</button>
            <button onClick={() => setLang("id")} className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${lang === "id" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>ID</button>
          </div>
          <div className="bg-primary px-3 py-1.5 rounded-full text-[10px] font-bold text-primary-foreground tracking-widest uppercase">
            {user.plan === "free" ? "Free" : "PRO"}
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 mt-2">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon size={20} className="text-slate-400" />
            {startDate ? startDate.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", year: "numeric" }) : ""} 
            {endDate ? ` - ${endDate.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", year: "numeric" })}` : ""}
            {!startDate && !endDate && "All Time"} Overview
          </h2>
          <div className="flex items-center gap-3 relative z-40">
             <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => setDateRange(update)}
                isClearable={true}
                placeholderText="Select Date Range"
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 cursor-pointer shadow-sm transition-all w-[240px]"
              />
          </div>
        </div>

        {/* Top KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bento-card p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700">
                <Wallet size={20} />
              </div>
              {renderTrend(stats.netChange)}
            </div>
            <p className="text-muted-foreground text-xs font-medium mb-1.5">{t.netBalance} ({t.thisMonth})</p>
            <h3 className="text-3xl font-bold tracking-tight text-slate-900">Rp {stats.netBalance.toLocaleString("id-ID")}</h3>
          </div>
          
          <div className="bento-card p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="p-2.5 bg-red-50 rounded-xl text-red-600">
                <ArrowDownRight size={20} />
              </div>
              {renderTrend(stats.expChange, true)}
            </div>
            <p className="text-muted-foreground text-xs font-medium mb-1.5">{t.expenses} ({t.thisMonth})</p>
            <h3 className="text-3xl font-bold tracking-tight text-slate-900">Rp {stats.thisMonthExpense.toLocaleString("id-ID")}</h3>
          </div>

          <div className="bento-card p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="p-2.5 bg-green-50 rounded-xl text-green-600">
                <ArrowUpRight size={20} />
              </div>
              {renderTrend(stats.incChange)}
            </div>
            <p className="text-muted-foreground text-xs font-medium mb-1.5">{t.income} ({t.thisMonth})</p>
            <h3 className="text-3xl font-bold tracking-tight text-slate-900">Rp {stats.thisMonthIncome.toLocaleString("id-ID")}</h3>
          </div>
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Dual Bar Chart */}
          <div className="bento-card p-5 lg:col-span-2">
            <h3 className="font-semibold text-sm mb-6 flex items-center gap-2">
              <TrendingUp size={16} className="text-slate-500" /> {t.cashFlow}
            </h3>
            <div className="h-64">
              {stats.trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000}k`} />
                    <RechartsTooltip cursor={{fill: '#f8fafc'}} formatter={(value) => `Rp ${Number(value).toLocaleString("id-ID")}`} contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}/>
                    <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">{t.noData}</div>
              )}
            </div>
          </div>

          {/* Top Categories Progress */}
          <div className="bento-card p-5">
            <h3 className="font-semibold text-sm mb-6 flex items-center gap-2">
              <PieChart size={16} className="text-slate-500" /> {t.topCategories}
            </h3>
            <div className="space-y-5">
              {stats.categoryData.length > 0 ? stats.categoryData.map((cat, i) => (
                <div key={cat.name} className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium flex items-center gap-1.5">
                      {getCategoryIcon(cat.name)} {cat.name}
                    </span>
                    <span className="font-semibold">Rp {cat.value.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${getCategoryColor(cat.name)}`} 
                      style={{ width: `${Math.max((cat.value / stats.thisMonthExpense) * 100, 2)}%` }}
                    ></div>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center text-muted-foreground text-xs">{t.noData}</div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Transaction History Table */}
          <div className="bento-card lg:col-span-2 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border flex flex-col sm:flex-row justify-between gap-3 items-center bg-slate-50/50">
              <h3 className="font-semibold text-sm">{t.history}</h3>
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder={t.search}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-border rounded-full pl-9 pr-4 py-1.5 text-xs outline-none focus:border-slate-400 transition-colors shadow-sm"
                />
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
                  {filteredTx.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-muted-foreground">{t.noFound}</td>
                    </tr>
                  )}
                  {filteredTx.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-5 text-muted-foreground text-[11px] font-medium">
                        {new Date(tx.date).toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3 px-5">
                        <div className="font-semibold text-slate-900">{tx.note || "Transaksi"}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{tx.store}</div>
                      </td>
                      <td className="py-3 px-5">
                        <span className="bg-slate-50 px-2.5 py-1 rounded-md text-[10px] border border-slate-200 flex items-center gap-1.5 w-fit font-medium text-slate-700">
                          {getCategoryIcon(tx.category)} {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className={`font-semibold ${tx.type === 'pengeluaran' ? 'text-slate-900' : 'text-green-600'} flex justify-end items-center gap-1.5`}>
                          {tx.type === 'pengeluaran' ? <ArrowDownRight size={14} className="text-red-500"/> : <ArrowUpRight size={14}/>}
                          Rp {Number(tx.amount).toLocaleString("id-ID")}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Largest Transactions */}
          <div className="bento-card p-5">
            <h3 className="font-semibold text-sm mb-6 flex items-center gap-2">
              <TrendingDown size={16} className="text-slate-500" /> {t.largestTx} ({t.thisMonth})
            </h3>
            <div className="space-y-4">
              {stats.largestExpenses.length > 0 ? stats.largestExpenses.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                      {getCategoryIcon(tx.category)}
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-slate-900 line-clamp-1">{tx.note}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{tx.category}</p>
                    </div>
                  </div>
                  <div className="font-bold text-xs">
                    Rp {Number(tx.amount).toLocaleString("id-ID")}
                  </div>
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
