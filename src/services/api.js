import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
    withCredentials: true, // สำคัญมากสำหรับ Split-Token (เพื่อรับส่ง HttpOnly Cookie ของ Signature)
});

// Interceptor: ดึง Token Payload จาก sessionStorage แนบไปกับ Header อัตโนมัติ
api.interceptors.request.use(
    (config) => {
        // [แก้ไข] เปลี่ยนจาก localStorage('token') เป็น sessionStorage('token_payload')
        const tokenPayload = sessionStorage.getItem('token_payload');
        
        if (tokenPayload) {
            config.headers.Authorization = `Bearer ${tokenPayload}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// [เสริม] Interceptor ขาเข้า (Response) เพื่อจับ Error กรณี Token หมดอายุ
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // หาก API ตอบกลับมาว่า 401 (Unauthorized) หรือ 403 (Forbidden) หมายถึง Token หมดอายุหรือไม่ถูกต้อง
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // เคลียร์ข้อมูลทิ้งและดีดกลับหน้า Login (เฉพาะกรณีที่ไม่ได้อยู่หน้า login อยู่แล้ว)
            if (window.location.pathname !== '/login') {
                sessionStorage.clear();
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;