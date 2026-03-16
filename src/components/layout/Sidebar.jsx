import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileUp, Database, Users, Settings, LogOut, Activity, BriefcaseMedical } from 'lucide-react';

const Sidebar = ({ isOpen, setIsSidebarOpen }) => {
    const navigate = useNavigate();

    const menuItems = [
        { path: '/', icon: LayoutDashboard, label: 'แดชบอร์ด' },
        { path: '/upload-nhso', icon: FileUp, label: 'นำเข้าข้อมูล สปสช.' },
        { path: '/data-nhso', icon: Database, label: 'ฐานข้อมูล สปสช.' },
        { path: '/upload-hdc', icon: Activity, label: 'นำเข้าข้อมูล HDC' },
        { path: '/users', icon: Users, label: 'จัดการผู้ใช้งาน' },
        { path: '/settings', icon: Settings, label: 'ตั้งค่าระบบ' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <aside className={`
            fixed inset-y-0 left-0 z-30 w-64 
            bg-white dark:bg-slate-900 
            border-r border-slate-200 dark:border-slate-800 
            transform transition-transform duration-300 ease-in-out 
            ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
            md:relative md:translate-x-0 
            flex flex-col shadow-2xl md:shadow-none
        `}>
            {/* โลโก้แบบมินิมอลและทางการ */}
            <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white shadow-sm">
                        <BriefcaseMedical className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight tracking-tight">
                            PPFS <span className="text-blue-600 dark:text-blue-400">System</span>
                        </h1>
                    </div>
                </div>
            </div>

            {/* รายการเมนูแบบ Enterprise UI */}
            <nav className="flex-1 overflow-y-auto py-4 space-y-1">
                <div className="px-4 mb-2">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Main Menu</p>
                </div>
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}
                        className={({ isActive }) => 
                            `flex items-center gap-3 px-6 py-2.5 transition-all cursor-pointer text-sm font-medium border-l-4 ${
                                isActive 
                                    ? 'border-blue-600 bg-blue-50/50 dark:bg-slate-800/50 text-blue-700 dark:text-blue-400' 
                                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                            }`
                        }
                    >
                        <item.icon className={`w-5 h-5 ${window.location.hash === `#${item.path}` ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* ปุ่มออกจากระบบ (เรียบง่าย ไม่แย่งความสนใจ) */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2 w-full rounded-md text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                    <LogOut className="w-5 h-5" />
                    ออกจากระบบ
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;