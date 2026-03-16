import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await api.post('/auth/login', { username, password });

            if (response.status === 200) {
                sessionStorage.setItem('token_payload', response.data.token_payload);
                sessionStorage.setItem('user', JSON.stringify(response.data.user)); 
                
                await Swal.fire({
                    icon: 'success',
                    title: 'เข้าสู่ระบบสำเร็จ',
                    text: `ยินดีต้อนรับคุณ ${response.data.user.first_name || response.data.user.username}`,
                    timer: 1300,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    allowOutsideClick: false
                });

                navigate('/');
                window.location.reload(); 
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        /* [ปรับปรุง] เปลี่ยน bg ธรรมดา เป็น bg-gradient-to-br */
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-[#080d1a] flex flex-col justify-center items-center p-4 transition-colors duration-300 relative overflow-hidden">
            
            {/* Background Decoration (คงไว้เพื่อให้ดูมีมิติ) */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-600/10 to-transparent dark:from-blue-900/20 -z-10"></div>
            <div className="absolute w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-600/5 rounded-full blur-3xl -top-48 -right-48 -z-10"></div>
            <div className="absolute w-[400px] h-[400px] bg-indigo-500/5 dark:bg-indigo-600/5 rounded-full blur-3xl bottom-10 -left-48 -z-10"></div>

            <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-slate-100 dark:border-slate-800 p-8 sm:p-10">
                
                {/* Logo & Header */}
                <div className="text-center mb-10">
                    <div className="w-16 h-16 mx-auto mb-5 flex items-center justify-center bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-2">
                        <img src="/img/logo.svg" alt="PPFS Logo" className="w-full h-full object-contain drop-shadow-sm" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                        PPFS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">System</span>
                    </h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">
                        เข้าสู่ระบบเพื่อจัดการข้อมูล สสจ.กาฬสินธุ์
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 rounded-r-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 dark:text-red-400 font-medium leading-relaxed">{error}</p>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            ชื่อผู้ใช้งาน
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500">
                                <User className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="block w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-sm font-medium"
                                placeholder="Username"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            รหัสผ่าน
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500">
                                <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-blue-500" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all text-sm font-medium"
                                placeholder="••••••••"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* ปุ่ม Action */}
                    <div className="flex items-center gap-3 mt-8 pt-2">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            disabled={isLoading}
                            className="flex-1 flex justify-center items-center py-3 px-4 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            กลับหน้าหลัก
                        </button>
                        
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm shadow-blue-500/30 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                                    รอสักครู่...
                                </>
                            ) : (
                                'เข้าสู่ระบบ'
                            )}
                        </button>
                    </div>
                </form>

            </div>
            
            <div className="mt-10 text-center text-[11px] text-slate-500 dark:text-slate-500 font-medium tracking-wide uppercase">
                &copy; {new Date().getFullYear()} กลุ่มงานสุขภาพดิจิทัล สำนักงานสาธารณสุขจังหวัดกาฬสินธุ์
            </div>
        </div>
    );
}