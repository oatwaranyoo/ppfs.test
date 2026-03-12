import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // ให้เปิดเป็นค่าเริ่มต้น
    const token = localStorage.getItem('token');

    // ถ้าไม่มี Token ให้เตะกลับไปหน้า Login
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            <Sidebar isOpen={isSidebarOpen} />
            
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                
                {/* พื้นที่สำหรับแสดงเนื้อหาของแต่ละหน้า */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6">
                    <Outlet />
                </main>
            </div>

            {/* Overlay สำหรับตอนย่อจอในมือถือแล้วเปิด Sidebar */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-10 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}
        </div>
    );
};

export default MainLayout;