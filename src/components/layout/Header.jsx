import { useEffect, useState, useRef } from 'react';
import { Menu, Bell, Sun, Moon, ChevronDown, User, LogOut, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Swal from 'sweetalert2'; 

const Header = ({ toggleSidebar, isDarkMode, toggleTheme }) => {
    const navigate = useNavigate();
    const dropdownRef = useRef(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userData, setUserData] = useState({
        firstName: 'ผู้ใช้งานทั่วไป',
        roleDisplay: 'ทั่วไป',
        initial: 'U',
        isGeneral: true 
    });

    useEffect(() => {
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setIsLoggedIn(true);
                
                let roleDisplay = 'ผู้ใช้งาน';
                let isGeneral = true;

                if (user.role === 'admin') {
                    roleDisplay = 'ผู้ดูแลระบบ';
                    isGeneral = false;
                } else if (user.role === 'uploader') {
                    roleDisplay = 'ผู้นำเข้าข้อมูล';
                    isGeneral = false;
                }

                const displayName = user.first_name || user.username || 'ผู้ใช้งาน';
                const initial = displayName.charAt(0).toUpperCase();

                setUserData({
                    firstName: displayName,
                    roleDisplay: roleDisplay,
                    initial: initial,
                    isGeneral: isGeneral
                });
            } catch (error) {
                setIsLoggedIn(false);
            }
        } else {
            setIsLoggedIn(false);
        }

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        setIsDropdownOpen(false); 
        const result = await Swal.fire({
            title: 'ยืนยันการออกจากระบบ?',
            text: "คุณต้องการออกจากระบบใช่หรือไม่",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444', 
            cancelButtonColor: '#94a3b8', 
            confirmButtonText: 'ใช่, ออกจากระบบ',
            cancelButtonText: 'ยกเลิก',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            try {
                await api.post('/auth/logout');
            } catch (error) {
                console.error("Logout error:", error);
            } finally {
                sessionStorage.clear();
                localStorage.clear();
                setIsLoggedIn(false);

                await Swal.fire({
                    icon: 'success',
                    title: 'ออกจากระบบสำเร็จ',
                    showConfirmButton: false,
                    timer: 1300,
                    timerProgressBar: true,
                    allowOutsideClick: false
                });

                navigate('/login');
                window.location.reload();
            }
        }
    };

    return (
        <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 z-20 sticky top-0 transition-colors duration-300">
            <div className="flex items-center justify-between px-4 md:px-8 h-[72px]">
                
                {/* ฝั่งซ้าย */}
                <div className="flex items-center">
                    {/* [ปรับปรุง] เอา md:hidden ออก เพื่อให้ Hamburger โชว์บนหน้าจอคอมพิวเตอร์ด้วย */}
                    <button 
                        onClick={toggleSidebar}
                        className="mr-4 p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 cursor-pointer transition-colors focus:outline-none"
                    >
                        <Menu className="w-5 h-5 cursor-pointer" />
                    </button>
                    <div className="hidden sm:flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-slate-700/60 cursor-default">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <h2 className="text-[13px] font-bold text-slate-700 dark:text-slate-200 tracking-wide">
                            สำนักงานสาธารณสุขจังหวัดกาฬสินธุ์
                        </h2>
                    </div>
                </div>

                {/* ฝั่งขวา */}
                <div className="flex items-center space-x-1 sm:space-x-3">
                    
                    <button className="relative p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 cursor-pointer transition-all hover:scale-105 active:scale-95">
                        <Bell className="w-[18px] h-[18px] cursor-pointer" />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                    </button>

                    <button 
                        onClick={toggleTheme}
                        className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 cursor-pointer transition-all hover:scale-105 active:scale-95"
                        title={isDarkMode ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
                    >
                        {isDarkMode ? <Sun className="w-[18px] h-[18px] text-amber-500 cursor-pointer" /> : <Moon className="w-[18px] h-[18px] text-indigo-500 cursor-pointer" />}
                    </button>

                    <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>

                    <div className="relative pl-1" ref={dropdownRef}>
                        <div 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-3 p-1.5 pr-4 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 select-none group"
                        >
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20 cursor-pointer">
                                {(!isLoggedIn || userData.isGeneral) ? (
                                    <User className="w-[18px] h-[18px] text-white" />
                                ) : (
                                    userData.initial
                                )}
                            </div>
                            <div className="hidden md:block text-left cursor-pointer">
                                <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 leading-none mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {isLoggedIn ? userData.firstName : 'บุคคลทั่วไป'}
                                </p>
                                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none">
                                    {isLoggedIn ? userData.roleDisplay : 'ยังไม่เข้าสู่ระบบ'}
                                </p>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden md:block transition-transform duration-200 cursor-pointer ${isDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
                        </div>

                        {/* Dropdown Menu */}
{isDropdownOpen && (
    <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-slate-700/80 p-2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        {isLoggedIn ? (
            <>
                <div className="px-4 py-3 mb-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl md:hidden">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{userData.firstName}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-1">{userData.roleDisplay}</p>
                </div>
                
                {/* [เพิ่ม] เมนูข้อมูลส่วนตัว */}
                <button 
                    onClick={() => { setIsDropdownOpen(false); navigate('/profile'); }}
                    className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl flex items-center gap-3 cursor-pointer transition-colors mb-1"
                >
                    <User className="w-4 h-4 cursor-pointer" />
                    ข้อมูลส่วนตัว
                </button>

                <div className="h-px bg-slate-100 dark:bg-slate-700/80 my-1"></div>

                <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                >
                    <LogOut className="w-4 h-4 cursor-pointer" />
                    ออกจากระบบ
                </button>
            </>
        ) : (
                                    <button 
                                        onClick={() => { setIsDropdownOpen(false); navigate('/login'); }}
                                        className="w-full text-left px-4 py-2.5 text-[13px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl flex items-center gap-3 cursor-pointer transition-colors"
                                    >
                                        <LogIn className="w-4 h-4 cursor-pointer" />
                                        ลงชื่อเข้าใช้งาน
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </header>
    );
};

export default Header;