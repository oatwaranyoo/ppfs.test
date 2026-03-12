import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import UploadHDC from './pages/UploadHDC'; // <-- นำเข้า Component ใหม่
import AuditLogs from './pages/AuditLogs';
import UploadNHSO from './pages/UploadNHSO';

// Component สร้างหน้าเปล่าๆ ชั่วคราว สำหรับเมนูที่ยังไม่ได้ทำ
const PlaceholderPage = ({ title }) => (
    <div className="flex items-center justify-center h-full">
        <h2 className="text-2xl text-slate-400 font-medium">อยู่ระหว่างการพัฒนา: {title}</h2>
    </div>
);

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<MainLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="upload-hdc" element={<UploadHDC />} />  {/* <-- ใช้ Component ที่สร้างไว้ */}
                <Route path="upload-nhso" element={<UploadNHSO />} />
                <Route path="users" element={<PlaceholderPage title="ระบบจัดการผู้ใช้งาน" />} />
                <Route path="settings" element={<AuditLogs />} />
            </Route>
        </Routes>
    );
}

export default App;