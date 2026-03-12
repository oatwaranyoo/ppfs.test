import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // ชี้ไปที่ Backend ของเรา
    withCredentials: true,
});

// Interceptor: ดึง Token จาก localStorage แนบไปกับ Header อัตโนมัติ
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;