import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    return (
        // พื้นหลังเป็นสีเทาอ่อน/เข้ม แบบ Solid (ดูทางการและสบายตากว่า Gradient)
        <div className="flex h-screen overflow-hidden font-sans bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            
            <Sidebar isOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Header 
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
                    isDarkMode={isDarkMode}
                    toggleTheme={toggleTheme}
                />
                
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
                    {/* จำกัดความกว้างสูงสุดเพื่อให้เนื้อหาไม่อ่านยากบนจอใหญ่ */}
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>

            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/60 z-20 md:hidden cursor-pointer backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}
        </div>
    );
};

export default MainLayout;