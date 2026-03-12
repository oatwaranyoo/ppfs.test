import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileUp, Database, Users, Settings } from 'lucide-react';

const Sidebar = ({ isOpen }) => {
    const menus = [
        { name: 'แดชบอร์ด', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'นำเข้าข้อมูล HDC', path: '/upload-hdc', icon: <FileUp size={20} /> },
        { name: 'นำเข้าข้อมูล สปสช.', path: '/upload-nhso', icon: <Database size={20} /> },
        { name: 'จัดการผู้ใช้งาน', path: '/users', icon: <Users size={20} /> },
        { name: 'ตั้งค่าระบบ', path: '/settings', icon: <Settings size={20} /> },
    ];

    return (
        <aside className={`bg-slate-900 text-white w-64 min-h-screen flex-shrink-0 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative z-20`}>
            <div className="p-4 flex items-center justify-center border-b border-slate-700 h-16">
                <h1 className="text-xl font-bold tracking-wider text-blue-400">PPFS SYSTEM</h1>
            </div>
            
            <nav className="p-4 space-y-2 mt-4">
                {menus.map((menu, index) => (
                    <NavLink
                        key={index}
                        to={menu.path}
                        className={({ isActive }) =>
                            `flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`
                        }
                    >
                        {menu.icon}
                        <span className="font-medium">{menu.name}</span>
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;