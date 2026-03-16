import { useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';
import api from '../services/api';
// 1. เพิ่ม Loader2 เข้ามาในบรรทัดนี้
import { Database, Search, Calendar, RefreshCw, Loader2 } from 'lucide-react'; 

export default function DataNHSO() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Pagination & Filter States
    const [totalRows, setTotalRows] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [page, setPage] = useState(1);
    const [searchText, setSearchText] = useState('');
    const [filterYear, setFilterYear] = useState('');
    
    // 2. ลบ useTheme() ออก และตั้งค่า isDarkMode เป็น false ชั่วคราวก่อน
    const isDarkMode = false; 

    const fetchNhsoData = async (currentPage, currentPerPage, search, year) => {
        setLoading(true);
        try {
            const res = await api.get('/nhso', {
                params: {
                    page: currentPage,
                    limit: currentPerPage,
                    search: search,
                    year: year
                }
            });
            setData(res.data.data);
            setTotalRows(res.data.total);
        } catch (error) {
            console.error("Fetch Data Error:", error);
        } finally {
            setLoading(false);
        }
    };

    // ระบบ Debounce (หน่วงเวลาพิมพ์ 0.5 วิ ค่อยยิง API เพื่อไม่ให้ Server ทำงานหนัก)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchNhsoData(page, perPage, searchText, filterYear);
        }, 500);
        return () => clearTimeout(timer);
    }, [page, perPage, searchText, filterYear]);

    const handlePageChange = newPage => setPage(newPage);
    const handlePerRowsChange = async (newPerPage, newPage) => {
        setPerPage(newPerPage);
        setPage(newPage);
    };

    // ตั้งค่าคอลัมน์ตาราง
    const columns = [
        { name: 'ปีงบ', selector: row => row.fiscal_year, width: '80px', center: true },
        { name: 'หน่วยบริการ', selector: row => row.hoscode, width: '110px', center: true, cell: row => <span className="font-mono text-blue-600 dark:text-blue-400">{row.hoscode}</span> },
        { name: 'กิจกรรมหลัก', selector: row => row.main_activity, wrap: true, grow: 2 },
        { name: 'กิจกรรมย่อย', selector: row => row.sub_id, wrap: true, grow: 2 },
        { name: 'จำนวนคน', selector: row => row.people_count, width: '100px', right: true, format: row => row.people_count.toLocaleString() },
        { name: 'จำนวนครั้ง', selector: row => row.visit_count, width: '100px', right: true, format: row => row.visit_count.toLocaleString() },
        { 
            name: 'จำนวนเงินจ่าย (บาท)', 
            selector: row => row.amount, 
            width: '160px', 
            right: true, 
            format: row => <span className="text-emerald-600 dark:text-emerald-400 font-bold">฿ {Number(row.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span> 
        },
    ];

    const tableStyles = {
        table: { style: { backgroundColor: 'transparent' } },
        noData: { style: { backgroundColor: 'transparent', color: isDarkMode ? '#94a3b8' : '#64748b', padding: '40px' } },
        headRow: { style: { backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', color: isDarkMode ? '#cbd5e1' : '#475569', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}` } },
        rows: { style: { backgroundColor: 'transparent', color: isDarkMode ? '#e2e8f0' : '#334155', borderBottom: `1px solid ${isDarkMode ? '#1e293b' : '#f1f5f9'}`, '&:hover': { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' } } },
        pagination: { style: { backgroundColor: 'transparent', color: isDarkMode ? '#94a3b8' : '#64748b', borderTop: `1px solid ${isDarkMode ? '#1e293b' : '#f1f5f9'}` } }
    };

    return (
        <div className="space-y-6 animation-fade-in">
            {/* ส่วน Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                        <Database className="mr-2 text-blue-600 dark:text-blue-400" /> ข้อมูลจ่ายชดเชย (สปสช.)
                    </h1>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">
                        NHSO Data Viewer
                    </p>
                </div>
                <button 
                    onClick={() => fetchNhsoData(page, perPage, searchText, filterYear)} 
                    className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-blue-500' : ''}`} />
                </button>
            </div>

            {/* ส่วนค้นหาและตัวกรอง */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="ค้นหา รหัสหน่วยบริการ, กิจกรรมหลัก หรือกิจกรรมย่อย..." 
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors dark:text-white text-sm"
                        value={searchText}
                        onChange={e => { setSearchText(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="w-full md:w-48 relative">
                    <Calendar className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select 
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 transition-colors dark:text-white appearance-none cursor-pointer text-sm font-medium"
                        value={filterYear}
                        onChange={e => { setFilterYear(e.target.value); setPage(1); }}
                    >
                        <option value="">ทุกปีงบประมาณ</option>
                        <option value="2568">ปีงบประมาณ 2568</option>
                        <option value="2569">ปีงบประมาณ 2569</option>
                        <option value="2570">ปีงบประมาณ 2570</option>
                    </select>
                </div>
            </div>

            {/* ส่วนตารางข้อมูล */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <DataTable
                    columns={columns}
                    data={data}
                    progressPending={loading}
                    progressComponent={<div className="p-10 flex flex-col items-center"><Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" /><span className="text-sm font-bold text-slate-400">กำลังโหลดข้อมูล...</span></div>}
                    pagination
                    paginationServer
                    paginationTotalRows={totalRows}
                    onChangeRowsPerPage={handlePerRowsChange}
                    onChangePage={handlePageChange}
                    customStyles={tableStyles}
                    highlightOnHover
                />
            </div>
        </div>
    );
}