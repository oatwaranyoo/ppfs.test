import { Menu, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const Header = ({ toggleSidebar }) => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const handleLogout = () => {
        Swal.fire({
            title: 'ต้องการออกจากระบบ?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ออกจากระบบ',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
            }
        });
    };

    return (
        <header className="bg-white h-16 shadow-sm border-b border-slate-200 flex items-center justify-between px-4 z-10 relative">
            <button 
                onClick={toggleSidebar}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors md:hidden"
            >
                <Menu size={24} />
            </button>

            {/* เว้นว่างไว้สำหรับจัด layout หาก Sidebar เปิดอยู่บน Desktop */}
            <div className="hidden md:block"></div>

            <div className="flex items-center space-x-4">
                <div className="hidden md:flex flex-col text-right">
                    <span className="text-sm font-bold text-slate-800">{user.firstName} {user.lastName}</span>
                    <span className="text-xs text-slate-500 capitalize">{user.role}</span>
                </div>
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 border border-blue-200">
                    <User size={20} />
                </div>
                <button 
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="ออกจากระบบ"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );
};

export default Header;