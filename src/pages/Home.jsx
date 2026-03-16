import { useState, useEffect } from 'react';
import api from '../services/api';
import { Activity, Database, DollarSign, Users, Loader2 } from 'lucide-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useTheme } from '../contexts/ThemeContext';

export default function Home() {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { isDarkMode } = useTheme();

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // เรียก API ไปที่ Node.js (GET Method)
                const res = await api.get('/dashboard/summary');
                setStats(res.data.data);
            } catch (error) {
                console.error("Error fetching dashboard:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    // การตั้งค่า Options สำหรับ Highcharts
    const getChartOptions = () => {
        const textColor = isDarkMode ? '#f8fafc' : '#1e293b';
        const bgColor = isDarkMode ? '#0f172a' : '#ffffff';
        const tooltipBg = isDarkMode ? '#1e293b' : '#ffffff';

        return {
            chart: {
                type: 'pie',
                backgroundColor: 'transparent', // โปร่งใสเพื่อกลืนกับพื้นหลังของกล่อง
                style: { fontFamily: 'inherit' }
            },
            title: {
                text: '', // ไม่เอา Title ของกราฟ (เราเขียนด้วย HTML เองแล้ว)
            },
            tooltip: {
                backgroundColor: tooltipBg,
                style: { color: textColor },
                pointFormat: '<b>฿{point.y:,.2f}</b> ({point.percentage:.1f}%)'
            },
            plotOptions: {
                pie: {
                    innerRadius: '60%', // ทำให้เป็นโดนัท (Donut Chart)
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: false // ซ่อน Label ที่ยื่นออกมาเพื่อความสะอาดตา (ใช้ Legend แทน)
                    },
                    showInLegend: true,
                    borderWidth: isDarkMode ? 0 : 1,
                    borderColor: bgColor
                }
            },
            legend: {
                itemStyle: { color: textColor, fontWeight: 'normal', fontSize: '12px' },
                itemHoverStyle: { color: '#3b82f6' }
            },
            credits: {
                enabled: false // เอาโลโก้ Highcharts มุมขวาล่างออก
            },
            series: [{
                name: 'ยอดเงินชดเชย',
                colorByPoint: true,
                data: stats?.chart_data || []
            }]
        };
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animation-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                    <Activity className="mr-2 text-blue-600" /> แดชบอร์ดสรุปผล
                </h1>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">
                    System Overview
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: ยอดเงินรวม */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-emerald-500 transition-colors">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-7 h-7 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">ยอดเงินชดเชยรวม (สปสช.)</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white truncate max-w-[200px]" title={`฿ ${stats?.nhso_total_money.toLocaleString()}`}>
                            ฿ {stats?.nhso_total_money.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h3>
                    </div>
                </div>

                {/* Card 2: จำนวนรายการ */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-blue-500 transition-colors">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                        <Database className="w-7 h-7 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">ข้อมูลที่นำเข้าแล้ว</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                            {stats?.nhso_total_rows.toLocaleString() || '0'} <span className="text-sm text-slate-400 font-medium">รายการ</span>
                        </h3>
                    </div>
                </div>

                {/* Card 3: ผู้ใช้งาน */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-purple-500 transition-colors">
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                        <Users className="w-7 h-7 text-purple-500" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">บัญชีผู้ใช้งาน</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                            {stats?.total_users.toLocaleString() || '0'} <span className="text-sm text-slate-400 font-medium">บัญชี</span>
                        </h3>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-base font-black text-slate-800 dark:text-white mb-6">
                        สัดส่วนยอดเงินชดเชยตามกิจกรรมหลัก (5 อันดับแรก)
                    </h3>
                    
                    {stats?.chart_data && stats.chart_data.length > 0 ? (
                        <div className="w-full">
                            <HighchartsReact
                                highcharts={Highcharts}
                                options={getChartOptions()}
                            />
                        </div>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-slate-400 font-medium">
                            ไม่พบข้อมูลสำหรับสร้างกราฟ
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}