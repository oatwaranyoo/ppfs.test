import { useState, useEffect, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, X, Activity, TableProperties } from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

export default function UploadHDC() {
    const [file, setFile] = useState(null);
    const [sanitizedFileName, setSanitizedFileName] = useState('');
    const [uploadType, setUploadType] = useState('target'); 
    
    // State สำหรับการอัปโหลด
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [batchId, setBatchId] = useState(null);

    // State สำหรับ Drag & Drop และ Preview
    const [isDragging, setIsDragging] = useState(false);
    const [previewHeaders, setPreviewHeaders] = useState([]);
    const [previewData, setPreviewData] = useState([]);
    const [totalRows, setTotalRows] = useState(0);
    
    const fileInputRef = useRef(null);

    // ป้องกันการปิดหน้าเว็บขณะอัปโหลด
    useEffect(() => {
        const unlockPayload = batchId ? JSON.stringify({ batch_id: batchId }) : null;

        const handleBeforeUnload = (e) => {
            if (uploading && batchId) {
                const blob = new Blob([unlockPayload], { type: 'application/json' });
                navigator.sendBeacon(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/upload/unlock`, blob);
                e.preventDefault();
                e.returnValue = ''; 
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (uploading && batchId) {
                const blob = new Blob([unlockPayload], { type: 'application/json' });
                navigator.sendBeacon(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/upload/unlock`, blob);
            }
        };
    }, [uploading, batchId]);

    const sanitizeHTML = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    // ฟังก์ชันจัดการไฟล์ (รวม Drag&Drop และ Click)
    const processFile = (selectedFile) => {
        if (!selectedFile) return;

        if (selectedFile.size > 20 * 1024 * 1024) {
            Swal.fire({
                icon: 'error',
                title: 'ไฟล์ขนาดใหญ่เกินไป',
                text: 'ขนาดไฟล์เกิน 20MB กรุณาเลือกไฟล์ใหม่',
                confirmButtonColor: '#3b82f6'
            });
            clearFile();
            return;
        }

        setSanitizedFileName(sanitizeHTML(selectedFile.name));
        setFile(selectedFile);
        setStatus({ type: '', message: '' });
        setProgress(0);

        // สร้าง Preview ข้อมูล
        generatePreview(selectedFile);
    };

    const handleFileChange = (e) => {
        processFile(e.target.files[0]);
    };

    // --- ระบบ Drag & Drop ---
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!uploading) setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (uploading) return;
        
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) processFile(droppedFile);
    };

    const clearFile = () => {
        setFile(null);
        setPreviewHeaders([]);
        setPreviewData([]);
        setTotalRows(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- ระบบ Preview ข้อมูลด้วย XLSX (ทำงานฝั่ง Client เบื้องต้น) ---
    const generatePreview = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // อ่านข้อมูลมาทำพรีวิว (เอาแค่ 5 บรรทัดแรก)
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
                
                if (jsonData.length > 0) {
                    // กรองแถวว่างทิ้ง
                    const cleanData = jsonData.filter(row => row.some(cell => cell !== ""));
                    
                    setTotalRows(cleanData.length > 1 ? cleanData.length - 1 : 0);
                    setPreviewHeaders(cleanData[0] || []);
                    setPreviewData(cleanData.slice(1, 6)); // โชว์แค่ 5 แถว
                } else {
                    setPreviewHeaders([]);
                    setPreviewData([]);
                    setTotalRows(0);
                }
            } catch (error) {
                console.error("Preview Error:", error);
                Swal.fire('ข้อผิดพลาด', 'ไม่สามารถอ่านไฟล์เพื่อสร้างพรีวิวได้', 'warning');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const sendChunkWithRetry = async (chunk, currentBatchId, retries = 3) => {
        for (let i = 0; i < retries; i++) {
            try {
                const endpoint = uploadType === 'target' ? '/upload/hdc-target-chunk' : '/upload/hdc-result-chunk';
                const response = await api.post(endpoint, {
                    batch_id: currentBatchId,
                    data: chunk
                }, { timeout: 120000 }); 
                return response.data;
            } catch (error) {
                if (i === retries - 1) throw error; 
                await delay(2000); 
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setStatus({ type: 'info', message: 'กำลังเตรียมการอัปโหลด...' });

        try {
            const scopeKey = uploadType === 'target' ? 'hdc_target_data' : 'hdc_result_data';
            const initResponse = await api.post('/upload/init', { scope: [scopeKey] });
            const currentBatchId = initResponse.data.batch_id;
            setBatchId(currentBatchId);

            const worker = new Worker(new URL('../workers/excelWorker.js', import.meta.url), { type: 'module' });
            
            // [แก้ไขอัปโหลดไม่ผ่าน] แนบ expectedFiscalYear เป็น null เพื่อบอก Worker ว่าหน้า HDC ไม่ต้อง Validate ปีงบ
            worker.postMessage({ 
                file, 
                expectedFiscalYear: null, 
                defaultMonthCount: 12 
            });

            worker.onmessage = async (e) => {
                const { success, data, error } = e.data;
                worker.terminate();

                if (!success) {
                    setStatus({ type: 'error', message: `อ่านไฟล์ Excel ไม่สำเร็จ: ${error}` });
                    setUploading(false);
                    return;
                }

                setStatus({ type: 'info', message: 'กำลังส่งข้อมูลเข้าสู่เซิร์ฟเวอร์...' });

                const CHUNK_SIZE = 1000;
                const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
                
                for (let i = 0; i < totalChunks; i++) {
                    const chunk = data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                    await sendChunkWithRetry(chunk, currentBatchId);
                    
                    const percent = Math.round(((i + 1) / totalChunks) * 100);
                    setProgress(percent);
                }

                setStatus({ type: 'info', message: 'กำลังประมวลผลขั้นตอนสุดท้าย...' });
                await api.post('/upload/finalize-hdc', { batch_id: currentBatchId, type: uploadType });

                Swal.fire({
                    icon: 'success',
                    title: 'อัปโหลดข้อมูลสำเร็จ!',
                    text: `นำเข้าข้อมูล HDC (${uploadType === 'target' ? 'เป้าหมาย' : 'ผลงาน'}) จำนวน ${data.length.toLocaleString()} รายการเรียบร้อยแล้ว`,
                    confirmButtonColor: '#10b981'
                });

                setStatus({ type: 'success', message: 'อัปโหลดข้อมูลสำเร็จเรียบร้อย' });
                setBatchId(null);
                clearFile();
                setUploading(false);
                setProgress(100);
            };

            worker.onerror = () => {
                worker.terminate();
                setUploading(false);
                setStatus({ type: 'error', message: "เกิดข้อผิดพลาดรุนแรงใน Web Worker" });
            };

        } catch (error) {
            // [แก้ไข] ดักจับ Error 423 (Locked) โดยเฉพาะ
            if (error.response && error.response.status === 423) {
                Swal.fire({
                    title: 'ระบบกำลังถูกใช้งาน',
                    text: 'พบการอัปโหลดค้างอยู่ในระบบจากเซสชันก่อนหน้า คุณต้องการ "บังคับล้างค่าที่ค้างอยู่" และเริ่มอัปโหลดใหม่หรือไม่?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#94a3b8',
                    confirmButtonText: 'ใช่, ล้างค่าและเริ่มใหม่',
                    cancelButtonText: 'ยกเลิก',
                    reverseButtons: true
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            // ยิง API ไปสั่ง Force Unlock
                            await api.post('/upload/force-unlock');
                            Swal.fire('ปลดล็อคสำเร็จ', 'กรุณากดปุ่ม "เริ่มนำเข้าข้อมูล" ใหม่อีกครั้ง', 'success');
                        } catch (unlockErr) {
                            Swal.fire('ผิดพลาด', 'ไม่สามารถปลดล็อคได้ กรุณาติดต่อผู้ดูแลระบบ', 'error');
                        }
                    }
                });
                
                setStatus({ type: 'error', message: 'ระบบติดล็อคจากการอัปโหลดครั้งก่อน' });
            } else {
                // Error อื่นๆ (ที่ไม่ใช่ 423)
                setStatus({ type: 'error', message: error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
            }

            if (batchId) {
                api.post('/upload/unlock', { batch_id: batchId }).catch(() => console.log("Unlock failed"));
                setBatchId(null);
            }
            setUploading(false);
        }
    };

    return (
        // [ปรับปรุง] ขยายเป็น w-full เต็มหน้าจอ
        <div className="w-full space-y-6 animation-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                    <Activity className="mr-2 text-blue-600" /> นำเข้าข้อมูล HDC
                </h1>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">
                    Health Data Center Import
                </p>
            </div>

            {/* Grid แบ่ง 2 ฝั่งเมื่อหน้าจอใหญ่ (ซ้าย: อัปโหลด, ขวา: Preview) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* ฝั่งซ้าย: โซนจัดการอัปโหลด */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors h-full flex flex-col">
                        
                        <div className="mb-6">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">ประเภทข้อมูล HDC</p>
                            <div className="flex flex-col gap-3">
                                <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${uploadType === 'target' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500/50 dark:text-blue-400' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                    <input type="radio" name="hdcType" value="target" checked={uploadType === 'target'} onChange={(e) => setUploadType(e.target.value)} className="w-4 h-4 text-blue-600" disabled={uploading} />
                                    <span className="font-bold text-sm">ข้อมูลเป้าหมาย (Target)</span>
                                </label>
                                <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${uploadType === 'result' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-500/50 dark:text-emerald-400' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                    <input type="radio" name="hdcType" value="result" checked={uploadType === 'result'} onChange={(e) => setUploadType(e.target.value)} className="w-4 h-4 text-emerald-600" disabled={uploading} />
                                    <span className="font-bold text-sm">ข้อมูลผลงาน (Result)</span>
                                </label>
                            </div>
                        </div>

                        {/* [ปรับปรุง] Dropzone รองรับ Drag & Drop สมบูรณ์แบบ */}
                        <div 
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`
                            border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 flex-1 flex flex-col items-center justify-center
                            ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]' 
                                : file ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10' 
                                : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500'}
                        `}>
                            <input 
                                type="file" 
                                id="file-upload-hdc" 
                                ref={fileInputRef}
                                className="hidden" 
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileChange}
                                disabled={uploading}
                            />
                            <label htmlFor="file-upload-hdc" className={`flex flex-col items-center justify-center w-full h-full ${uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                <div className={`w-16 h-16 mb-4 rounded-full shadow-sm flex items-center justify-center border transition-colors ${isDragging ? 'bg-blue-100 border-blue-200 dark:bg-blue-800 dark:border-blue-600' : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}>
                                    <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-600 dark:text-blue-400 animate-bounce' : 'text-blue-500'}`} />
                                </div>
                                <span className="text-slate-700 dark:text-slate-200 font-bold text-base mb-2">
                                    {isDragging ? 'ปล่อยไฟล์เพื่ออัปโหลด' : 'คลิกหรือลากไฟล์มาวางที่นี่'}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">รองรับนามสกุล .xlsx, .xls (สูงสุด 20MB)</span>
                            </label>
                        </div>

                        {/* File Indicator */}
                        {file && (
                            <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-3 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm shrink-0">
                                        <FileSpreadsheet className="text-blue-600 dark:text-blue-400 w-5 h-5" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" dangerouslySetInnerHTML={{ __html: sanitizedFileName }}></p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB • {totalRows.toLocaleString()} แถว</p>
                                    </div>
                                </div>
                                <button onClick={clearFile} disabled={uploading} className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full text-slate-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Progress Bar */}
                        {uploading && (
                            <div className="mt-4 space-y-2 animate-in fade-in">
                                <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <span className="flex items-center gap-1.5">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                                        {status.message || 'กำลังอัปโหลด...'}
                                    </span>
                                    <span className="text-blue-600 dark:text-blue-400">{progress}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-slate-700">
                                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out relative" style={{ width: `${progress}%` }}>
                                        <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Status Message */}
                        {status.message && !uploading && (
                            <div className={`mt-4 p-3 rounded-xl flex items-start gap-2 animate-in fade-in ${status.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/20' : status.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20'}`}>
                                {status.type === 'error' ? <AlertCircle className="shrink-0 mt-0.5 w-4 h-4" /> : status.type === 'success' ? <CheckCircle2 className="shrink-0 mt-0.5 w-4 h-4" /> : <Loader2 className="shrink-0 mt-0.5 w-4 h-4 animate-spin" />}
                                <span className="font-semibold text-xs leading-relaxed">{status.message}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="mt-6">
                            <button onClick={handleUpload} disabled={!file || uploading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 disabled:dark:from-slate-700 disabled:dark:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-xl text-sm font-bold shadow-sm shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
                                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                {uploading ? 'กำลังดำเนินการ...' : `เริ่มนำเข้าข้อมูล${uploadType === 'target' ? 'เป้าหมาย' : 'ผลงาน'}`}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ฝั่งขวา: พรีวิวข้อมูล */}
                <div className="lg:col-span-8">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <TableProperties className="w-5 h-5 text-blue-500" /> ตัวอย่างข้อมูล (Preview)
                            </h3>
                            {file && (
                                <span className="text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                    แสดง 5 แถวแรกจากทั้งหมด {totalRows.toLocaleString()} แถว
                                </span>
                            )}
                        </div>

                        {/* ตาราง Preview */}
                        <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-h-[400px]">
                            {file && previewHeaders.length > 0 ? (
                                <div className="overflow-x-auto custom-scrollbar flex-1">
                                    <table className="w-full text-left border-collapse whitespace-nowrap">
                                        <thead>
                                            <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-bold">
                                                <th className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-700 w-12 bg-slate-200/50 dark:bg-slate-700/50">#</th>
                                                {previewHeaders.map((header, idx) => (
                                                    <th key={idx} className="px-4 py-3">{header}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {previewData.map((row, rowIndex) => (
                                                <tr key={rowIndex} className="hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <td className="px-4 py-3 text-center border-r border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/20">
                                                        {rowIndex + 1}
                                                    </td>
                                                    {previewHeaders.map((_, colIndex) => (
                                                        <td key={colIndex} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
                                                            {row[colIndex] !== undefined ? row[colIndex] : '-'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-500">
                                    <FileSpreadsheet className="w-16 h-16 mb-4 opacity-50" />
                                    <p className="font-bold text-slate-600 dark:text-slate-400">ยังไม่มีข้อมูลสำหรับพรีวิว</p>
                                    <p className="text-sm mt-1">อัปโหลดไฟล์ Excel หรือ CSV เพื่อดูตัวอย่างข้อมูลที่นี่</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}