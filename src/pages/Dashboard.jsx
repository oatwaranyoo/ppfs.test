const Dashboard = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">แดชบอร์ดผู้บริหาร (Strategic Dashboard)</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* การ์ดสถิติแบบง่ายๆ เตรียมไว้ใส่ข้อมูล */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                    <h3 className="text-slate-500 text-sm font-medium">เป้าหมายรวม (คน)</h3>
                    <p className="text-3xl font-bold text-slate-800 mt-2">0</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
                    <h3 className="text-slate-500 text-sm font-medium">ผลงานบริการ (Visit)</h3>
                    <p className="text-3xl font-bold text-slate-800 mt-2">0</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
                    <h3 className="text-slate-500 text-sm font-medium">ประมาณการรายได้ (บาท)</h3>
                    <p className="text-3xl font-bold text-slate-800 mt-2">0.00</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-96 flex items-center justify-center">
                <p className="text-slate-400">รอใส่กราฟ Highcharts ในลำดับต่อไป</p>
            </div>
        </div>
    );
};

export default Dashboard;