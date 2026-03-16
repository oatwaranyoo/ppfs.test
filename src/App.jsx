import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home'; 
import UploadHDC from './pages/UploadHDC';
import AuditLogs from './pages/AuditLogs';
import UploadNHSO from './pages/UploadNHSO';
import DataNHSO from './pages/DataNHSO';

// สร้าง Wrapper Component เพื่อดักจับเฉพาะหน้าที่ต้อง Login
const ProtectedRoute = () => {
    // ดึงค่า Token จากระบบที่คุณใช้ (เช่น localStorage หรือ Context)
    const token = localStorage.getItem('token'); 
    
    if (!token) {
        // ถ้าไม่มี Token ให้ Redirect ไปหน้า Login
        return <Navigate to="/login" replace />;
    }
    
    // ถ้ามี Token ให้เรนเดอร์หน้า Component ย่อย (Outlet) ตามปกติ
    return <Outlet />;
};

const PlaceholderPage = ({ title }) => (
    <div className="flex items-center justify-center h-full">
        <h2 className="text-2xl text-slate-400 font-medium">อยู่ระหว่างการพัฒนา: {title}</h2>
    </div>
);

function App() {
    return (
        <Routes>
            {/* หน้า Login (แยกออกไปต่างหาก ไม่มี Sidebar) */}
            <Route path="/login" element={<Login />} />
            
            {/* MainLayout จะครอบทุกหน้าเพื่อแสดง Sidebar และ Header */}
            <Route path="/" element={<MainLayout />}>
                
                {/* 🟢 PUBLIC ROUTE: หน้า Home (Dashboard) เข้าได้ทันทีไม่ต้อง Login */}
                <Route index element={<Home />} /> 

                {/* 🔴 PROTECTED ROUTES: หน้าที่ต้อง Login ก่อนถึงจะเข้าได้ */}
                <Route element={<ProtectedRoute />}>
                    <Route path="upload-hdc" element={<UploadHDC />} />
                    <Route path="upload-nhso" element={<UploadNHSO />} />
                    <Route path="data-nhso" element={<DataNHSO />} />
                    <Route path="users" element={<PlaceholderPage title="ระบบจัดการผู้ใช้งาน" />} />
                    <Route path="settings" element={<AuditLogs />} />
                </Route>

            </Route>
        </Routes>
    );
}

export default App;