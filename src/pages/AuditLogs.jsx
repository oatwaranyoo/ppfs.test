import { useState, useEffect } from 'react';
import { Settings, ShieldAlert, UploadCloud, Trash2, LogIn, Activity, Loader2 } from 'lucide-react';

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // [จำลองข้อมูล] รอเชื่อม API จริง (GET /api/logs)
        setTimeout(() => {
            setLogs([
                { id: 1, action: 'UPLOAD', module: 'NHSO', detail: 'นำเข้าข้อมูล สปสช. ปีงบ 2569 (15,200 แถว)', user: 'สมชาย ใจดี (Uploader)', timestamp: '16 มี.ค. 2569 10:05 น.', status: 'success' },
                { id: 2, action: 'DELETE', module: 'USER', detail: 'ลบบัญชีผู้ใช้ "สมหญิง รักเรียน"', user: 'สสจ. แอดมิน (Admin)', timestamp: '15 มี.ค. 2569 15:30 น.', status: 'warning' },
                { id: 3, action: 'LOGIN', module: 'AUTH', detail: 'เข้าสู่ระบบสำเร็จ (IP: 192.168.1.45)', user: 'สมชาย ใจดี (Uploader)', timestamp: '15 มี.ค. 2569 08:00 น.', status: 'info' },
                { id: 4, action: 'ERROR', module: 'SYSTEM', detail: 'พบความพยายามล็อคอินผิดพลาดเกิน 5 ครั้ง บัญชี admin', user: 'SYSTEM', timestamp: '14 มี.ค. 2569 22:15 น.', status: 'danger' },
            ]);
            setIsLoading(false);
        }, 800);
    }, []);

    const getIcon = (action, status) => {
        if (action === 'UPLOAD') return <UploadCloud className="w-5 h-5 text-blue-500" />;
        if (action === 'DELETE') return <Trash2 className="w-5 h-5 text-amber-500" />;
        if (action === 'LOGIN') return <LogIn className="w-5 h-5 text-emerald-500" />;
        if (action === 'ERROR') return <ShieldAlert className="w-5 h-5 text-red-500" />;
        return <Activity className="w-5 h-5 text-slate-500" />;
    };

    const getStatusColor = (status) => {
        if (status === 'success') return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50';
        if (status === 'warning') return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50';
        if (status === 'danger') return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50';
        return 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50';
    };

    return (
        <div className="space-y-6 animation-fade-in max-w-5xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                    <Settings className="mr-2 text-blue-600" /> ตั้งค่าระบบ & ประวัติการใช้งาน
                </h1>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">
                    System Configuration & Audit Logs
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* เมนูตั้งค่า (ซ้าย) */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4">เมนูการตั้งค่า</h3>
                        <div className="space-y-2">
                            <button className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 font-bold text-sm border border-blue-100 dark:border-blue-800/30 cursor-pointer">
                                ประวัติการใช้งาน (Audit Logs)
                                <Activity className="w-4 h-4" />
                            </button>
                            <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-sm transition-colors cursor-pointer">
                                ตั้งค่าปีงบประมาณ
                            </button>
                            <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-sm transition-colors cursor-pointer">
                                จัดการตารางอ้างอิง (Master Data)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Timeline ประวัติ (ขวา) */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8">
                        <h3 className="text-base font-black text-slate-800 dark:text-white mb-8 flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-slate-400" /> 
                            ประวัติการใช้งานระบบล่าสุด
                        </h3>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-10">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                <p className="text-slate-500 mt-4 font-medium">กำลังโหลดประวัติ...</p>
                            </div>
                        ) : (
                            <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 md:ml-4 space-y-8">
                                {logs.map((log) => (
                                    <div key={log.id} className="relative pl-6 md:pl-8">
                                        {/* Timeline Dot */}
                                        <div className="absolute -left-[17px] top-1 w-8 h-8 rounded-full bg-white dark:bg-slate-900 border-4 border-slate-50 dark:border-slate-950 flex items-center justify-center shadow-sm">
                                            <div className="w-full h-full rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                                                {getIcon(log.action, log.status)}
                                            </div>
                                        </div>

                                        {/* Content Card */}
                                        <div className={`p-4 rounded-2xl border ${getStatusColor(log.status)}`}>
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                    {log.detail}
                                                </h4>
                                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap bg-white dark:bg-slate-900 px-2 py-1 rounded-md shadow-sm">
                                                    {log.timestamp}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-3">
                                                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                    {log.user.charAt(0)}
                                                </div>
                                                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                    ดำเนินการโดย: <span className="text-slate-800 dark:text-slate-300">{log.user}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}