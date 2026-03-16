import { Menu, Bell, Sun, Moon, ChevronDown } from 'lucide-react';

const Header = ({ toggleSidebar, isDarkMode, toggleTheme }) => {
    return (
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10 sticky top-0 transition-colors duration-300">
            <div className="flex items-center justify-between px-4 md:px-6 h-16">
                
                {/* ฝั่งซ้าย */}
                <div className="flex items-center">
                    <button 
                        onClick={toggleSidebar}
                        className="mr-4 p-2 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 md:hidden cursor-pointer transition-colors"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    {/* ชื่อหน้าหรือ Title จะแสดงตรงนี้แทน Logo ใหญ่ๆ แบบเดิม */}
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 hidden sm:block">
                        สสจ.กาฬสินธุ์
                    </h2>
                </div>

                {/* ฝั่งขวา */}
                <div className="flex items-center space-x-1 md:space-x-3">
                    
                    {/* แจ้งเตือน */}
                    <button className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 cursor-pointer transition-colors">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full outline outline-2 outline-white dark:outline-slate-900"></span>
                    </button>

                    {/* สลับโหมด */}
                    <button 
                        onClick={toggleTheme}
                        className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 cursor-pointer transition-colors"
                        title={isDarkMode ? "Light Mode" : "Dark Mode"}
                    >
                        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>

                    {/* เส้นแบ่ง */}
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 md:mx-2 hidden sm:block"></div>

                    {/* โปรไฟล์ */}
                    <div className="flex items-center gap-3 pl-1 pr-2 py-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                        <div className="w-8 h-8 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm">
                            อ
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-none mb-1">โอ๊ต</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-none">ผู้ดูแลระบบ</p>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
                    </div>

                </div>
            </div>
        </header>
    );
};

export default Header;