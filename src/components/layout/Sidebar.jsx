import { NavLink } from 'react-router-dom';
import { 
    LayoutDashboard, 
    FileUp, 
    Database, 
    Users, 
    Settings,
    Activity, 
    ChevronRight,
    Home
} from 'lucide-react';

const Sidebar = ({ isOpen, setIsSidebarOpen }) => {
    const isLoggedIn = !!sessionStorage.getItem('user');

    const authMenuGroups = [
        {
            title: 'Overview',
            items: [
                { path: '/', icon: LayoutDashboard, label: 'แดชบอร์ด' },
            ]
        },
        {
            title: 'Data Management',
            items: [
                { path: '/upload-nhso', icon: FileUp, label: 'นำเข้าข้อมูล สปสช.' },
                { path: '/data-nhso', icon: Database, label: 'ฐานข้อมูล สปสช.' },
                { path: '/upload-hdc', icon: Activity, label: 'นำเข้าข้อมูล HDC' },
            ]
        },
        {
            title: 'System',
            items: [
                { path: '/users', icon: Users, label: 'จัดการผู้ใช้งาน' },
                { path: '/settings', icon: Settings, label: 'ตั้งค่าระบบ' },
            ]
        }
    ];

    const guestMenuGroups = [
        {
            title: 'Public Access',
            items: [
                { path: '/', icon: Home, label: 'หน้าหลัก / แดชบอร์ด' },
            ]
        }
    ];

    const menuGroups = isLoggedIn ? authMenuGroups : guestMenuGroups;

    return (
        <aside className={`
            fixed inset-y-0 left-0 z-30 w-72 
            bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950
            border-r border-slate-200 dark:border-slate-800/60 
            transform transition-all duration-300 ease-in-out flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] md:shadow-none
            ${isOpen ? 'translate-x-0 md:ml-0' : '-translate-x-full md:-ml-72'} 
            md:relative
        `}>
            {/* โลโก้ */}
            <div className="h-[72px] flex items-center px-6 border-b border-slate-100 dark:border-slate-800/60 shrink-0">
                <div className="flex items-center gap-3.5 w-full cursor-default">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm p-1.5 min-w-[40px]">
                        <img src="/img/logo.svg" alt="PPFS Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 whitespace-nowrap overflow-hidden">
                        <h1 className="text-[17px] font-black text-slate-800 dark:text-white leading-tight tracking-tight">
                            PPFS <span className="text-blue-600 dark:text-blue-400">System</span>
                        </h1>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                            Kalasin Health Office
                        </p>
                    </div>
                </div>
            </div>

            {/* รายการเมนู */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
                {menuGroups.map((group, index) => (
                    <div key={index} className="space-y-2">
                        <div className="px-2 mb-3">
                            <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest cursor-default">
                                {group.title}
                            </p>
                        </div>
                        <div className="space-y-1">
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => window.innerWidth < 768 && setIsSidebarOpen(false)}
                                    className={({ isActive }) => `
                                        group flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                                        ${isActive 
                                            ? 'bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-900/10 text-blue-700 dark:text-blue-400 font-bold shadow-sm ring-1 ring-blue-500/10 dark:ring-blue-400/20' 
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 font-semibold'
                                        }
                                    `}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <div className="flex items-center gap-3.5 cursor-pointer">
                                                <item.icon className={`w-5 h-5 transition-colors duration-200 cursor-pointer ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`} />
                                                <span className="text-[13px] cursor-pointer tracking-wide">{item.label}</span>
                                            </div>
                                            {isActive && <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400 cursor-pointer" />}
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;