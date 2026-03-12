import { useEffect, useState } from 'react';
import { ClipboardList, User, Clock, Database, Eye, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        try {
            const res = await api.get('/logs');
            setLogs(res.data);
        } catch (err) { console.error('Fetch Logs Error:', err); } 
        finally { setLoading(false); }
    };

    const showDetail = (log) => {
        const oldVal = log.old_values;
        const newVal = log.new_values;

        Swal.fire({
            title: `<span class="text-lg font-bold">รายละเอียดการกระทำ (${log.action_type})</span>`,
            html: `
                <div class="text-left space-y-4 max-h-[70vh] overflow-y-auto px-1">
                    <div class="flex items-center justify-between text-[11px] bg-slate-100 p-2 rounded-lg border border-slate-200">
                        <div class="flex items-center"><User size={14} className="mr-1 text-blue-600"/> <b>ผู้ทำ:</b> ${log.first_name} ${log.last_name}</div>
                        <div class="flex items-center"><Clock size={14} className="mr-1 text-slate-500"/> <b>เวลา:</b> ${log.acted_at ? new Date(log.acted_at.replace(' ', 'T')).toLocaleString('th-TH') : 'N/A'}</div>
                    </div>

                    ${oldVal ? `
                        <div class="space-y-1">
                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ข้อมูลเดิม (Old Values)</p>
                            <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-600"><pre class="whitespace-pre-wrap">${JSON.stringify(oldVal, null, 2)}</pre></div>
                        </div>
                    ` : ''}

                    <div class="space-y-1">
                        <p class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">ข้อมูลใหม่ (New Values / Results)</p>
                        <div class="bg-blue-50 p-3 rounded-lg border border-blue-100 text-[10px] font-mono text-blue-800"><pre class="whitespace-pre-wrap">${JSON.stringify(newVal, null, 2)}</pre></div>
                    </div>
                </div>
            `,
            width: '800px', confirmButtonText: 'ปิดหน้าต่าง', confirmButtonColor: '#3b82f6'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center"><ClipboardList className="mr-2 text-blue-600" /> ประวัติการใช้งานระบบ (Audit Logs)</h1>
                <button onClick={fetchLogs} className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200">รีเฟรชข้อมูล</button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">วัน-เวลา</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">ผู้กระทำ</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">การกระทำ</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">ตาราง / Batch ID</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">ตรวจสอบ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600 font-mono">
                                        <div className="flex items-center"><Clock size={14} className="mr-1.5 text-slate-400" /> {log.acted_at ? new Date(log.acted_at.replace(' ', 'T')).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center text-sm font-semibold text-slate-700">{log.first_name} {log.last_name}</div></td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider ${log.action_type === 'INSERT' ? 'bg-emerald-100 text-emerald-700' : log.action_type === 'UPDATE' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>{log.action_type}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500"><div className="flex items-center font-medium text-slate-700 mb-0.5"><Database size={13} className="mr-1.5 text-slate-400" /> {log.table_name}</div><div className="text-[10px] font-mono text-slate-400 pl-[21px]">{log.record_id}</div></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center"><button onClick={() => showDetail(log)} className="inline-flex items-center justify-center h-9 w-9 bg-white hover:bg-blue-50 text-blue-600 rounded-full border border-slate-200 transition-all shadow-sm"><Eye size={18} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;