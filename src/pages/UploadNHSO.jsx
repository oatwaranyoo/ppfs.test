import React, { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import api from '../services/api';

export default function UploadNHSO() {
    const [file, setFile] = useState(null);
    const [sanitizedFileName, setSanitizedFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [batchId, setBatchId] = useState(null);

    // [SRS Critical] Accidental Closure & Self-Unlock (Beacon API)
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (uploading && batchId) {
                // ส่ง Beacon ไปปลดล็อคทันทีเมื่อปิดแท็บ
                navigator.sendBeacon(`http://localhost:5000/api/upload/unlock?batch_id=${batchId}`);
                e.preventDefault();
                e.returnValue = ''; // แสดงแจ้งเตือนของเบราว์เซอร์
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [uploading, batchId]);

    // ฟังก์ชันกรอง HTML Tags ป้องกัน DOM XSS
    const sanitizeHTML = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        // [SRS Must] File Size Limit (20MB)
        if (selectedFile.size > 20 * 1024 * 1024) {
            setStatus({ type: 'error', message: 'ขนาดไฟล์เกิน 20MB กรุณาเลือกไฟล์ใหม่' });
            setFile(null);
            return;
        }

        // [SRS Critical] File Metadata Sanitization
        setSanitizedFileName(sanitizeHTML(selectedFile.name));
        setFile(selectedFile);
        setStatus({ type: '', message: '' });
        setProgress(0);
    };

    // ฟังก์ชันหน่วงเวลาสำหรับ Auto-Retry
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // ฟังก์ชันส่ง Chunk พร้อมระบบ Auto-Retry 3 ครั้ง
    const sendChunkWithRetry = async (chunk, currentBatchId, retries = 3) => {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await api.post('/upload/nhso-chunk', {
                    batch_id: currentBatchId,
                    data: chunk
                }, { timeout: 120000 }); // Timeout 120 วินาทีตาม SRS
                return response.data;
            } catch (error) {
                if (i === retries - 1) throw error; // ถ้าครบ 3 ครั้งแล้วยังพัง ให้โยน Error
                await delay(2000); // รอ 2 วินาทีก่อนลองใหม่
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setStatus({ type: 'info', message: 'กำลังเตรียมการอัปโหลด...' });

        try {
            // 1. [SRS Critical] Server-Side Batch Allocation
            // ขอ batch_id จาก Backend ก่อน
            const initResponse = await api.post('/upload/init', { scope: ['nhso_data'] });
            const currentBatchId = initResponse.data.batch_id;
            setBatchId(currentBatchId);

            // 2. ปลุก Web Worker ขึ้นมาอ่านไฟล์
            const worker = new Worker(new URL('../workers/excelWorker.js', import.meta.url), { type: 'module' });
            
            worker.postMessage({ file });

            worker.onmessage = async (e) => {
                const { success, data, error } = e.data;
                
                // [SRS Critical] สั่งทำลาย Worker ทันทีเมื่อได้ข้อมูลคืนมา ป้องกัน Memory Leak
                worker.terminate();

                if (!success) {
                    setStatus({ type: 'error', message: `อ่านไฟล์ Excel ไม่สำเร็จ: ${error}` });
                    setUploading(false);
                    return;
                }

                setStatus({ type: 'info', message: 'กำลังส่งข้อมูลเข้าสู่เซิร์ฟเวอร์...' });

                // 3. [SRS Critical] Chunking (ทีละ 1000 แถว)
                const CHUNK_SIZE = 1000;
                const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
                
                for (let i = 0; i < totalChunks; i++) {
                    const chunk = data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                    
                    // ส่งข้อมูลพร้อม Auto-Retry
                    await sendChunkWithRetry(chunk, currentBatchId);
                    
                    const percent = Math.round(((i + 1) / totalChunks) * 100);
                    setProgress(percent);
                }

                // 4. สั่ง Finalize สลับข้อมูล
                setStatus({ type: 'info', message: 'กำลังประมวลผลขั้นตอนสุดท้าย...' });
                await api.post('/upload/finalize', { batch_id: currentBatchId, scope: ['nhso_data'] });

                setStatus({ type: 'success', message: `อัปโหลดข้อมูล สปสช. สำเร็จ (${data.length.toLocaleString()} รายการ)` });
                setBatchId(null);
                setFile(null);
            };

            worker.onerror = (err) => {
                worker.terminate();
                throw new Error("เกิดข้อผิดพลาดรุนแรงใน Web Worker");
            };

        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
            // พยายามปลดล็อคหากเกิด Error
            if (batchId) {
                api.post('/upload/unlock', { batch_id: batchId }).catch(()=>console.log("Unlock failed"));
            }
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="text-blue-600" /> นำเข้าข้อมูล สปสช. (NHSO)
            </h1>

            <div className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-slate-200">
                
                {/* File Upload Zone */}
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                    <input 
                        type="file" 
                        id="file-upload" 
                        className="hidden" 
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-12 h-12 text-slate-400 mb-4" />
                        <span className="text-slate-600 font-medium">คลิกเพื่อเลือกไฟล์ Excel หรือลากไฟล์มาวางที่นี่</span>
                        <span className="text-slate-400 text-sm mt-2">รองรับ .xlsx, .xls ขนาดไม่เกิน 20MB</span>
                    </label>
                </div>

                {file && (
                    <div className="mt-6 bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <FileSpreadsheet className="text-blue-600 shrink-0" />
                            <span className="text-slate-700 font-medium truncate" dangerouslySetInnerHTML={{ __html: sanitizedFileName }}></span>
                        </div>
                        <button onClick={() => setFile(null)} disabled={uploading} className="p-1 hover:bg-blue-100 rounded-full text-slate-500">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Progress Bar */}
                {uploading && (
                    <div className="mt-6 space-y-2">
                        <div className="flex justify-between text-sm font-medium text-slate-600">
                            <span>กำลังอัปโหลด...</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                )}

                {/* Status Message */}
                {status.message && (
                    <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 ${status.type === 'error' ? 'bg-red-50 text-red-700' : status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                        {status.type === 'error' ? <AlertCircle className="shrink-0" /> : status.type === 'success' ? <CheckCircle2 className="shrink-0" /> : <Loader2 className="shrink-0 animate-spin" />}
                        <span className="font-medium text-sm">{status.message}</span>
                    </div>
                )}

                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2"
                    >
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        เริ่มนำเข้าข้อมูล
                    </button>
                </div>
            </div>
        </div>
    );
}