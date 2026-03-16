import { useEffect, useState } from 'react';
import { User, Mail, Phone, Shield, Briefcase, Award, Lock, KeyRound, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../services/api';

export default function Profile() {
    const [userData, setUserData] = useState(null);
    const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
    const [showPassword, setShowPassword] = useState({ old: false, new: false, confirm: false });
    const [isChanging, setIsChanging] = useState(false);

    useEffect(() => {
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            setUserData(JSON.parse(storedUser));
        }
    }, []);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        // ตรวจสอบข้อมูลเบื้องต้น (Validation)
        if (passwords.new !== passwords.confirm) {
            Swal.fire({
                icon: 'error',
                title: 'รหัสผ่านไม่ตรงกัน',
                text: 'กรุณายืนยันรหัสผ่านใหม่ให้ตรงกับรหัสผ่านใหม่ที่ตั้งไว้',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        if (passwords.new.length < 8) {
            Swal.fire({
                icon: 'warning',
                title: 'รหัสผ่านสั้นเกินไป',
                text: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        setIsChanging(true);

        try {
            // ยิง API จริง
            await api.put('/users/change-password', { 
                oldPassword: passwords.old, 
                newPassword: passwords.new 
            });

            Swal.fire({
                icon: 'success',
                title: 'เปลี่ยนรหัสผ่านสำเร็จ',
                text: 'ระบบจะนำคุณไปหน้าเข้าสู่ระบบใหม่ในสักครู่',
                showConfirmButton: false,
                timer: 2000
            }).then(() => {
                // ให้เตะออกไปล็อกอินใหม่เพื่อให้รับ Token ใหม่
                sessionStorage.clear();
                window.location.href = '/login';
            });

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: error.response?.data?.message || 'รหัสผ่านเดิมไม่ถูกต้อง หรือไม่สามารถเปลี่ยนรหัสผ่านได้',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setIsChanging(false);
        }
    };

    const toggleShowPassword = (field) => {
        setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
    };

    if (!userData) return null;

    const initial = (userData.first_name || userData.username || 'U').charAt(0).toUpperCase();
    const roleDisplay = userData.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'ผู้นำเข้าข้อมูล (Uploader)';

    return (
        <div className="w-full space-y-6 animation-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                    <User className="mr-2 text-blue-600" /> ข้อมูลส่วนตัว
                </h1>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">
                    User Profile & Security
                </p>
            </div>

            {/* Profile Card แบบขยายเต็มหน้าจอ */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden w-full transition-colors">
                
                {/* Cover Banner */}
                <div className="h-40 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative">
                    <div className="absolute inset-0 bg-white/10 dark:bg-black/20 backdrop-blur-sm"></div>
                </div>

                {/* Profile Info & Password Section */}
                <div className="px-6 md:px-10 pb-10 relative">
                    
                    {/* Avatar ลอยขึ้นมา */}
                    <div className="absolute -top-20 left-6 md:left-10">
                        <div className="w-36 h-36 rounded-3xl bg-white dark:bg-slate-900 p-2 shadow-xl border border-slate-100 dark:border-slate-800">
                            <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-6xl font-black text-white shadow-inner">
                                {initial}
                            </div>
                        </div>
                    </div>

                    <div className="pt-24">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                            <div>
                                <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                                    {userData.first_name} {userData.last_name}
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 font-semibold mt-1">
                                    @{userData.username}
                                </p>
                            </div>
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold text-sm border border-blue-100 dark:border-blue-800/50 shadow-sm shrink-0">
                                <Shield className="w-4 h-4" />
                                {roleDisplay}
                            </div>
                        </div>

                        {/* Grid แบ่ง 2 ส่วน (ซ้าย: ข้อมูลส่วนตัว, ขวา: เปลี่ยนรหัสผ่าน) */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                            
                            {/* ส่วนข้อมูลส่วนตัว (กินพื้นที่ 2 ส่วน) */}
                            <div className="lg:col-span-2 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* ข้อมูลติดต่อ */}
                                    <div className="space-y-4">
                                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <Mail className="w-3.5 h-3.5" /> ข้อมูลติดต่อ
                                        </p>
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0">
                                                <Mail className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">อีเมล (Email)</p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{userData.email || 'ไม่ระบุอีเมล'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0">
                                                <Phone className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">เบอร์โทรศัพท์ (Phone)</p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{userData.phone || 'ไม่ระบุเบอร์โทรศัพท์'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ข้อมูลหน่วยงาน */}
                                    <div className="space-y-4">
                                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <Briefcase className="w-3.5 h-3.5" /> ข้อมูลหน่วยงาน
                                        </p>
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0">
                                                <Briefcase className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">ตำแหน่ง (Position)</p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{userData.position || 'ไม่ระบุตำแหน่ง'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm shrink-0">
                                                <Award className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">รหัสกลุ่มงาน (Department ID)</p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{userData.department_id || 'ไม่ระบุ'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ส่วนฟอร์มเปลี่ยนรหัสผ่าน (กินพื้นที่ 1 ส่วน) */}
                            <div className="lg:col-span-1">
                                <div className="bg-slate-50/80 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-6 shadow-sm">
                                    <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2 mb-6">
                                        <KeyRound className="w-5 h-5 text-amber-500" /> เปลี่ยนรหัสผ่าน
                                    </h3>
                                    
                                    <form onSubmit={handlePasswordChange} className="space-y-4">
                                        
                                        {/* รหัสผ่านเดิม */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">รหัสผ่านปัจจุบัน</label>
                                            <div className="relative">
                                                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                <input 
                                                    type={showPassword.old ? "text" : "password"}
                                                    required
                                                    value={passwords.old}
                                                    onChange={(e) => setPasswords({...passwords, old: e.target.value})}
                                                    disabled={isChanging}
                                                    className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all disabled:opacity-60"
                                                    placeholder="กรอกรหัสผ่านเดิม"
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => toggleShowPassword('old')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                >
                                                    {showPassword.old ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="h-px bg-slate-200 dark:bg-slate-700/50 my-2"></div>

                                        {/* รหัสผ่านใหม่ */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">รหัสผ่านใหม่ <span className="text-[10px] font-medium text-slate-400">(อย่างน้อย 8 ตัวอักษร)</span></label>
                                            <div className="relative">
                                                <Lock className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                <input 
                                                    type={showPassword.new ? "text" : "password"}
                                                    required
                                                    minLength={8}
                                                    value={passwords.new}
                                                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                                                    disabled={isChanging}
                                                    className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all disabled:opacity-60"
                                                    placeholder="ตั้งรหัสผ่านใหม่"
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => toggleShowPassword('new')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                >
                                                    {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* ยืนยันรหัสผ่านใหม่ */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">ยืนยันรหัสผ่านใหม่</label>
                                            <div className="relative">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                <input 
                                                    type={showPassword.confirm ? "text" : "password"}
                                                    required
                                                    minLength={8}
                                                    value={passwords.confirm}
                                                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                                                    disabled={isChanging}
                                                    className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all disabled:opacity-60"
                                                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => toggleShowPassword('confirm')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                >
                                                    {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <div className="pt-2">
                                            <button 
                                                type="submit"
                                                disabled={isChanging || !passwords.old || !passwords.new || !passwords.confirm}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 disabled:dark:from-slate-700 disabled:dark:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-500/30 transition-all active:scale-95 cursor-pointer"
                                            >
                                                {isChanging ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                                                {isChanging ? 'กำลังอัปเดต...' : 'บันทึกรหัสผ่านใหม่'}
                                            </button>
                                        </div>
                                    </form>

                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}