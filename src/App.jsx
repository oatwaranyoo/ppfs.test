import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './components/layout/MainLayout';
import Home from './pages/Home'; 
import UploadHDC from './pages/UploadHDC';
import AuditLogs from './pages/AuditLogs';
import UploadNHSO from './pages/UploadNHSO';
import DataNHSO from './pages/DataNHSO';

// [เพิ่ม Import หน้าใหม่ 2 หน้า]
import Profile from './pages/Profile';
import Users from './pages/Users';

const ProtectedRoute = () => {
    const tokenPayload = sessionStorage.getItem('token_payload'); 
    const user = sessionStorage.getItem('user');
    
    if (!tokenPayload || !user) {
        return <Navigate to="/login" replace />;
    }
    return <Outlet />;
};

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<MainLayout />}>
                <Route index element={<Home />} /> 

                <Route element={<ProtectedRoute />}>
                    <Route path="upload-hdc" element={<UploadHDC />} />
                    <Route path="upload-nhso" element={<UploadNHSO />} />
                    <Route path="data-nhso" element={<DataNHSO />} />
                    <Route path="settings" element={<AuditLogs />} />
                    
                    {/* [อัปเดต] ผูก Route เข้ากับหน้าใหม่ */}
                    <Route path="profile" element={<Profile />} />
                    <Route path="users" element={<Users />} />
                </Route>
            </Route>
        </Routes>
    );
}

export default App;