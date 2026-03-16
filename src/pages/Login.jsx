import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BriefcaseMedical, Lock, User, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import api from '../services/api';

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
                // เก็บเฉพาะ Payload ไว้ใน sessionStorage
                sessionStorage.setItem('token_payload', response.data.token_payload);
                navigate('/');
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
            setError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 transition-colors duration-300">
            {/* ปรับขอบให้โค้งน้อยลง (rounded-lg) ดูเป็นทางการมากขึ้น */}
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 p-8">
                
                {/* Logo & Header */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-blue-600 rounded flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <BriefcaseMedical className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                        PPFS <span className="text-blue-600 dark:text-blue-400">System</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        เข้าสู่ระบบเพื่อจัดการข้อมูล สสจ.กาฬสินธุ์
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-md flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 dark:text-red-400 font-medium">{error}</p>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            ชื่อผู้ใช้งาน
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                                placeholder="กรอกชื่อผู้ใช้งาน"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            รหัสผ่าน
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                                placeholder="กรอกรหัสผ่าน"
                                required
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* ปุ่ม Action (แบ่งซ้าย-ขวา) */}
                    <div className="flex items-center gap-3 mt-8">
                        {/* ปุ่มย้อนกลับ (สีรอง) */}
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            disabled={isLoading}
                            className="flex-1 flex justify-center items-center py-2.5 px-4 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            หน้าหลัก
                        </button>
                        
                        {/* ปุ่มเข้าสู่ระบบ (สีหลัก) */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            
            <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-500 font-medium">
                &copy; {new Date().getFullYear()} กลุ่มงานสุขภาพดิจิทัล สำนักงานสาธารณสุขจังหวัดกาฬสินธุ์
            </div>
        </div>
    );
}