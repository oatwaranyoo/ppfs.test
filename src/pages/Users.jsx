import { useState, useEffect } from 'react';
import { Users as UsersIcon, Search, Plus, Edit, Trash2, Key, Shield, UserX, CheckCircle2, Loader2, Building2, X, AlertCircle } from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // สถานะสำหรับการ Validate Username & Password
    const [usernameStatus, setUsernameStatus] = useState('idle'); // idle, checking, available, taken
    const [passwordError, setPasswordError] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        position: '',
        phone: '',
        email: '',
        role: 'uploader',
        department_id: ''
    });

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/users');
            setUsers(res.data);
            setIsLoading(false);
        } catch (error) {
            console.error("Error fetching users", error);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // [ใหม่] ตรวจสอบ Username ซ้ำในฐานข้อมูล เมื่อผู้ใช้หยุดพิมพ์ 500ms
    useEffect(() => {
        const checkUsername = async () => {
            if (formData.username.length === 0) {
                setUsernameStatus('idle');
                return;
            }
            setUsernameStatus('checking');
            try {
                const res = await api.post('/users/check-username', { username: formData.username });
                if (res.data.isAvailable) {
                    setUsernameStatus('available');
                } else {
                    setUsernameStatus('taken');
                }
            } catch (error) {
                setUsernameStatus('idle');
            }
        };

        const timer = setTimeout(() => {
            checkUsername();
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.username]);

    const filteredUsers = users.filter(user => 
        user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.department_name && user.department_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // [ใหม่] ควบคุมการกรอก Username (รับเฉพาะอักษรอังกฤษและตัวเลข)
    const handleUsernameChange = (e) => {
        const val = e.target.value;
        if (val === '' || /^[a-zA-Z0-9]+$/.test(val)) {
            setFormData({ ...formData, username: val });
        }
    };

    // [ใหม่] ควบคุมการกรอกและตรวจสอบความปลอดภัยของ Password
    const handlePasswordChange = (e) => {
        const val = e.target.value;
        // รับเฉพาะอังกฤษและตัวเลข
        if (val === '' || /^[a-zA-Z0-9]+$/.test(val)) {
            setFormData({ ...formData, password: val });
            
            // ตรวจสอบเงื่อนไข: พิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และ >= 8 ตัว
            if (val.length === 0) {
                setPasswordError('');
            } else if (val.length < 8) {
                setPasswordError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
            } else if (!/(?=.*[a-z])/.test(val)) {
                setPasswordError('ต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว');
            } else if (!/(?=.*[A-Z])/.test(val)) {
                setPasswordError('ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว');
            } else if (!/(?=.*\d)/.test(val)) {
                setPasswordError('ต้องมีตัวเลขอย่างน้อย 1 ตัว');
            } else {
                setPasswordError(''); // ผ่านเงื่อนไขทั้งหมด
            }
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        
        // เช็ค Validation ด่านสุดท้ายก่อนส่ง API
        if (usernameStatus === 'taken') {
            Swal.fire('ข้อผิดพลาด', 'Username นี้ถูกใช้งานแล้ว', 'warning');
            return;
        }
        if (passwordError || formData.password.length < 8) {
            Swal.fire('ข้อผิดพลาด', 'รหัสผ่านไม่ตรงตามเงื่อนไขที่กำหนด', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/users', formData);
            Swal.fire({ icon: 'success', title: 'เพิ่มผู้ใช้งานสำเร็จ', showConfirmButton: false, timer: 1500 });
            setIsAddModalOpen(false);
            setFormData({ username: '', password: '', first_name: '', last_name: '', position: '', phone: '', email: '', role: 'uploader', department_id: '' });
            fetchUsers();
        } catch (error) {
            Swal.fire('ผิดพลาด', error.response?.data?.message || 'ไม่สามารถเพิ่มผู้ใช้งานได้', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ... (ฟังก์ชัน handleResetPassword และ handleDelete คงเดิม)
    const handleResetPassword = (id, username) => {
        Swal.fire({
            title: 'รีเซ็ตรหัสผ่าน?', text: `คุณต้องการตั้งค่ารหัสผ่านใหม่ให้กับ "${username}" ใช่หรือไม่?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#f59e0b', cancelButtonColor: '#94a3b8', confirmButtonText: 'ใช่, รีเซ็ตเลย', cancelButtonText: 'ยกเลิก', reverseButtons: true
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.put(`/users/${id}/reset-password`);
                    Swal.fire({ icon: 'success', title: 'รีเซ็ตสำเร็จ', text: 'รหัสผ่านคือ: password123', showConfirmButton: true });
                } catch (error) {
                    Swal.fire('ผิดพลาด', error.response?.data?.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้', 'error');
                }
            }
        });
    };

    const handleDelete = (id, username) => {
        Swal.fire({
            title: 'ยืนยันการลบ?', text: `ลบบัญชี "${username}" ข้อมูลนี้ไม่สามารถกู้คืนได้`, icon: 'error', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#94a3b8', confirmButtonText: 'ใช่, ลบเลย', cancelButtonText: 'ยกเลิก', reverseButtons: true
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/users/${id}`);
                    setUsers(users.filter(u => u.id !== id));
                    Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', showConfirmButton: false, timer: 1000 });
                } catch (error) {
                    Swal.fire('ผิดพลาด', error.response?.data?.message || 'ไม่สามารถลบผู้ใช้ได้', 'error');
                }
            }
        });
    };

    return (
        <div className="space-y-6 animation-fade-in max-w-6xl mx-auto relative">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                        <UsersIcon className="mr-2 text-blue-600" /> จัดการผู้ใช้งาน
                    </h1>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">
                        User Management
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" placeholder="ค้นหาชื่อ, username, หน่วยงาน..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all w-full sm:w-64" />
                    </div>
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-500/30 transition-all active:scale-95 shrink-0 cursor-pointer">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">เพิ่มผู้ใช้</span>
                    </button>
                </div>
            </div>

            {/* Table Card (เหมือนเดิม) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                                <th className="px-6 py-4">ผู้ใช้งาน / Username</th>
                                <th className="px-6 py-4">หน่วยงาน (Department)</th>
                                <th className="px-6 py-4">สถานะ</th>
                                <th className="px-6 py-4 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">กำลังโหลดข้อมูล...</p>
                                    </td>
                                </tr>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
                                                    {user.first_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{user.first_name} {user.last_name}</div>
                                                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">@{user.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                <Building2 className="w-4 h-4 text-slate-400" />
                                                <span className="truncate max-w-[250px]">{user.department_name || 'ไม่ระบุหน่วยงาน'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.status === 'active' ? (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50"><CheckCircle2 className="w-3.5 h-3.5" /> ปกติ</div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50"><UserX className="w-3.5 h-3.5" /> ถูกระงับ</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button onClick={() => handleResetPassword(user.id, user.username)} className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors cursor-pointer" title="รีเซ็ตรหัสผ่าน"><Key className="w-4 h-4" /></button>
                                                <button className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer" title="แก้ไข"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(user.id, user.username)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer" title="ลบ"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">ไม่พบข้อมูลผู้ใช้งาน</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal เพิ่มผู้ใช้งานใหม่ (ขยายขนาดรองรับฟิลด์เพิ่ม) */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
                        
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-600" /> เพิ่มผู้ใช้งานใหม่
                            </h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-5">
                            {/* แถวที่ 1: Username & Password */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 flex justify-between">
                                        Username (อังกฤษ/ตัวเลข)
                                        {usernameStatus === 'checking' && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
                                        {usernameStatus === 'available' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                    </label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.username} 
                                        onChange={handleUsernameChange} 
                                        className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all ${usernameStatus === 'taken' ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-200 dark:border-slate-700'}`} 
                                        placeholder="เช่น somchai123" 
                                    />
                                    {usernameStatus === 'taken' && <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />ชื่อนี้มีคนใช้แล้ว</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                                        รหัสผ่าน (อังกฤษ/ตัวเลข)
                                    </label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={formData.password} 
                                        onChange={handlePasswordChange} 
                                        className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all ${passwordError ? 'border-amber-500 focus:ring-amber-500/50' : 'border-slate-200 dark:border-slate-700'}`} 
                                        placeholder="พิมพ์เล็ก, พิมพ์ใหญ่, ตัวเลข, >= 8 ตัว" 
                                    />
                                    {passwordError && <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{passwordError}</p>}
                                </div>
                            </div>

                            {/* แถวที่ 2: ชื่อ & สกุล */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">ชื่อจริง</label>
                                    <input type="text" required value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all" placeholder="ชื่อจริง" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">นามสกุล</label>
                                    <input type="text" required value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all" placeholder="นามสกุล" />
                                </div>
                            </div>

                            {/* แถวที่ 3: ตำแหน่ง & เบอร์โทร */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">ตำแหน่ง (ตัวเลือก)</label>
                                    <input type="text" value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all" placeholder="เช่น นักวิชาการสาธารณสุข" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">เบอร์โทรศัพท์ (ตัวเลือก)</label>
                                    <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all" placeholder="เช่น 0812345678" />
                                </div>
                            </div>

                            {/* แถวที่ 4: Email & รหัสกลุ่มงาน */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">อีเมล (ตัวเลือก)</label>
                                    <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all" placeholder="example@mail.com" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">รหัสหน่วยงาน (Department ID)</label>
                                    <input type="number" required value={formData.department_id} onChange={(e) => setFormData({...formData, department_id: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all" placeholder="กรอกรหัสหน่วยงาน เช่น 1, 2, 3..." />
                                </div>
                            </div>

                            {/* แถวที่ 5: Role */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">สิทธิ์การใช้งาน (Role)</label>
                                <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer">
                                    <option value="uploader">ผู้นำเข้าข้อมูล (Uploader)</option>
                                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                                </select>
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting} className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl transition-all cursor-pointer">
                                    ยกเลิก
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting || usernameStatus === 'taken' || !!passwordError || formData.password.length < 8} 
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-500/30 transition-all active:scale-95 cursor-pointer"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}