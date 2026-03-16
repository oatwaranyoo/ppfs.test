import { useState, useEffect } from 'react';
import { Database, Search, Filter, Download, FileSpreadsheet, Loader2, Calendar } from 'lucide-react';
import api from '../services/api';

export default function DataNHSO() {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState('all');

    const fetchData = async () => {
        try {
            setIsLoading(true);
            // ปลดล็อค API ของจริง
            const res = await api.get('/nhso/data');
            setData(res.data);
            setIsLoading(false);
        } catch (error) {
            console.error("Error fetching NHSO data", error);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredData = data.filter(item => {
        const matchesSearch = item.hosname.includes(searchTerm) || item.hoscode.includes(searchTerm) || item.activity.includes(searchTerm);
        const matchesYear = selectedYear === 'all' || item.fiscal_year === selectedYear;
        return matchesSearch && matchesYear;
    });

    const years = [...new Set(data.map(item => item.fiscal_year))].sort((a, b) => b - a);

    return (
        <div className="space-y-6 animation-fade-in">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                        <Database className="mr-2 text-blue-600" /> ฐานข้อมูล สปสช.
                    </h1>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">
                        NHSO Allocated Budget
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {/* ตัวกรองปีงบ */}
                    <div className="relative">
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select 
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white appearance-none cursor-pointer"
                        >
                            <option value="all">ทุกปีงบประมาณ</option>
                            {years.map(y => <option key={y} value={y}>ปีงบฯ {y}</option>)}
                        </select>
                        <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* ช่องค้นหา */}
                    <div className="relative flex-1 md:w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input 
                            type="text" 
                            placeholder="รหัสหน่วย, ชื่อ, กิจกรรม..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all"
                        />
                    </div>

                    {/* ปุ่ม Export */}
                    <button className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-sm font-bold rounded-xl transition-all shrink-0 cursor-pointer">
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export Excel</span>
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                                <th className="px-6 py-4">ปีงบฯ</th>
                                <th className="px-6 py-4">หน่วยบริการ</th>
                                <th className="px-6 py-4">กิจกรรมย่อย</th>
                                <th className="px-6 py-4 text-right">จำนวนเงิน (บาท)</th>
                                <th className="px-6 py-4 text-right">อัปเดตล่าสุด</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">กำลังดึงข้อมูล...</p>
                                    </td>
                                </tr>
                            ) : filteredData.length > 0 ? (
                                filteredData.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
                                                {row.fiscal_year}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{row.hosname}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">รหัส: {row.hoscode}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                                            <div className="flex items-center gap-2">
                                                <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                                                {row.activity}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-black text-emerald-600 dark:text-emerald-400">
                                                {row.budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs text-slate-500 dark:text-slate-400 font-medium">
                                            {row.updated_at}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                                        ไม่พบข้อมูล
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}