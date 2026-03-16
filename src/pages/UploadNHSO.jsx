import { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, X, CloudUpload, Calendar, Clock } from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';
import Select from 'react-select'; // [เพิ่ม] ใช้งาน React Select

export default function UploadNHSO() {
    const currentYear = new Date().getFullYear() + 543;
    
    // [อัปเดต] ตัวเลือกสำหรับ React Select
    const yearOptions = [
        { value: String(currentYear - 1), label: `ปีงบประมาณ ${currentYear - 1}` },
        { value: String(currentYear), label: `ปีงบประมาณ ${currentYear}` },
        { value: String(currentYear + 1), label: `ปีงบประมาณ ${currentYear + 1}` },
        { value: String(currentYear + 2), label: `ปีงบประมาณ ${currentYear + 2}` },
    ];

    // [อัปเดต] สร้างตัวเลือกจำนวนเดือน 1-12
    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1),
        label: i === 11 ? '12 เดือน (เหมาจ่ายทั้งปี)' : `${i + 1} เดือน`
    }));

    const [fiscalYear, setFiscalYear] = useState(String(currentYear + 1)); 
    const [monthCount, setMonthCount] = useState('12'); 

    const [file, setFile] = useState(null);
    const [sanitizedFileName, setSanitizedFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [batchId, setBatchId] = useState(null);

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

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (selectedFile.size > 20 * 1024 * 1024) {
            Swal.fire({
                icon: 'error',
                title: 'ไฟล์ขนาดใหญ่เกินไป',
                text: 'ขนาดไฟล์เกิน 20MB กรุณาเลือกไฟล์ใหม่',
                confirmButtonColor: '#3b82f6'
            });
            setFile(null);
            return;
        }

        setSanitizedFileName(sanitizeHTML(selectedFile.name));
        setFile(selectedFile);
        setStatus({ type: '', message: '' });
        setProgress(0);
    };

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const sendChunkWithRetry = async (chunk, currentBatchId, retries = 3) => {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await api.post('/upload/nhso-chunk', {
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
            const initResponse = await api.post('/upload/init', { scope: ['nhso_data'] });
            const currentBatchId = initResponse.data.batch_id;
            setBatchId(currentBatchId);

            const worker = new Worker(new URL('../workers/excelWorker.js', import.meta.url), { type: 'module' });
            
            worker.postMessage({ 
                file, 
                expectedFiscalYear: fiscalYear, 
                defaultMonthCount: monthCount 
            });

            worker.onmessage = async (e) => {
                const { success, data, error } = e.data;
                worker.terminate();

                if (!success) {
                    setStatus({ type: 'error', message: `อ่านไฟล์ Excel ไม่สำเร็จ: ${error}` });
                    setUploading(false);
                    api.post('/upload/unlock', { batch_id: currentBatchId }).catch(() => {});
                    setBatchId(null);
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
                await api.post('/upload/finalize-nhso', { batch_id: currentBatchId, scope: ['nhso_data'] });

                Swal.fire({
                    icon: 'success',
                    title: 'อัปโหลดข้อมูลสำเร็จ!',
                    text: `นำเข้าข้อมูล สปสช. (ปีงบ ${fiscalYear} รอบ ${monthCount} เดือน) จำนวน ${data.length.toLocaleString()} รายการเรียบร้อยแล้ว`,
                    confirmButtonColor: '#10b981'
                });

                setStatus({ type: 'success', message: 'อัปโหลดข้อมูลสำเร็จเรียบร้อย' });
                setBatchId(null);
                setFile(null);
                setUploading(false);
                setProgress(100);
            };

            worker.onerror = () => {
                worker.terminate();
                setUploading(false);
                setStatus({ type: 'error', message: "เกิดข้อผิดพลาดรุนแรงใน Web Worker" });
            };

        } catch (error) {
            setStatus({ type: 'error', message: error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
            if (batchId) {
                api.post('/upload/unlock', { batch_id: batchId }).catch(() => console.log("Unlock failed"));
                setBatchId(null);
            }
            setUploading(false);
        }
    };

    // [เพิ่ม] Custom Styles สำหรับ React Select ให้เข้ากับ Tailwind (รองรับ Dark Mode)
    const selectClassNames = {
        control: ({ isFocused, isDisabled }) =>
            `flex items-center justify-between w-full px-2 py-1.5 bg-transparent outline-none cursor-pointer ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`,
        menu: () =>
            `mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50`,
        menuList: () => `p-1.5 custom-scrollbar max-h-60 overflow-y-auto`,
        option: ({ isFocused, isSelected }) =>
            `px-4 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                isSelected
                    ? 'bg-blue-600 text-white font-bold'
                    : isFocused
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'
            }`,
        singleValue: () => `text-sm font-bold text-slate-700 dark:text-slate-200`,
        placeholder: () => `text-sm font-medium text-slate-400`,
        valueContainer: () => `flex gap-1 px-2`,
        input: () => `text-slate-700 dark:text-slate-200 m-0 p-0 outline-none border-none focus:ring-0`,
        indicatorSeparator: () => `hidden`,
        dropdownIndicator: () => `p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer`,
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animation-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                    <CloudUpload className="mr-2 text-blue-600" /> นำเข้าข้อมูล สปสช. (NHSO)
                </h1>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">
                    NHSO Data Import
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
                
                {/* ส่วนการเลือกปีงบประมาณและจำนวนเดือนด้วย React Select */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                    {/* Select: ปีงบประมาณ */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ปีงบประมาณ (ในไฟล์)</label>
                        <div className={`relative flex items-center bg-slate-50 dark:bg-slate-800/50 border ${uploading ? 'opacity-60 cursor-not-allowed' : ''} border-slate-200 dark:border-slate-700 rounded-xl transition-all focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 dark:focus-within:border-blue-400`}>
                            <Calendar className="w-5 h-5 text-slate-400 ml-4 shrink-0" />
                            <Select
                                options={yearOptions}
                                value={yearOptions.find(y => y.value === fiscalYear)}
                                onChange={(selected) => setFiscalYear(selected.value)}
                                isDisabled={uploading}
                                unstyled
                                classNames={selectClassNames}
                                className="flex-1"
                                placeholder="ค้นหาหรือเลือกปีงบ..."
                                noOptionsMessage={() => "ไม่พบข้อมูล"}
                            />
                        </div>
                    </div>

                    {/* Select: จำนวนเดือน */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">จำนวนเดือนของข้อมูลชุดนี้</label>
                        <div className={`relative flex items-center bg-slate-50 dark:bg-slate-800/50 border ${uploading ? 'opacity-60 cursor-not-allowed' : ''} border-slate-200 dark:border-slate-700 rounded-xl transition-all focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 dark:focus-within:border-blue-400`}>
                            <Clock className="w-5 h-5 text-slate-400 ml-4 shrink-0" />
                            <Select
                                options={monthOptions}
                                value={monthOptions.find(m => m.value === monthCount)}
                                onChange={(selected) => setMonthCount(selected.value)}
                                isDisabled={uploading}
                                unstyled
                                classNames={selectClassNames}
                                className="flex-1"
                                placeholder="ค้นหาจำนวนเดือน..."
                                noOptionsMessage={() => "ไม่พบข้อมูล"}
                            />
                        </div>
                    </div>
                </div>

                {/* Dropzone */}
                <div className={`
                    border-2 border-dashed rounded-2xl p-8 md:p-12 text-center transition-all duration-200
                    ${file ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500'}
                `}>
                    <input 
                        type="file" 
                        id="file-upload" 
                        className="hidden" 
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                    <label htmlFor="file-upload" className={`flex flex-col items-center justify-center w-full h-full ${uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                        <div className="w-16 h-16 mb-4 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700">
                            <Upload className="w-8 h-8 text-blue-500" />
                        </div>
                        <span className="text-slate-700 dark:text-slate-200 font-bold text-lg mb-2">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</span>
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">รองรับนามสกุล .xlsx, .xls (ขนาดสูงสุดไม่เกิน 20MB)</span>
                    </label>
                </div>

                {/* File Selected Indicator */}
                {file && (
                    <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-4 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm shrink-0">
                                <FileSpreadsheet className="text-blue-600 dark:text-blue-400 w-6 h-6" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate" dangerouslySetInnerHTML={{ __html: sanitizedFileName }}></p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setFile(null)} 
                            disabled={uploading} 
                            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full text-slate-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            title="ยกเลิกไฟล์นี้"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Progress Bar */}
                {uploading && (
                    <div className="mt-6 space-y-2 animate-in fade-in">
                        <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300">
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                {status.message || 'กำลังอัปโหลด...'}
                            </span>
                            <span className="text-blue-600 dark:text-blue-400">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-200 dark:border-slate-700">
                            <div 
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out relative" 
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status Message */}
                {status.message && !uploading && (
                    <div className={`mt-6 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in ${
                        status.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/20' 
                        : status.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20' 
                        : 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20'
                    }`}>
                        {status.type === 'error' ? <AlertCircle className="shrink-0 mt-0.5" /> : status.type === 'success' ? <CheckCircle2 className="shrink-0 mt-0.5" /> : <Loader2 className="shrink-0 mt-0.5 animate-spin" />}
                        <span className="font-semibold text-sm leading-relaxed">{status.message}</span>
                    </div>
                )}

                {/* Action Button */}
                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 disabled:dark:from-slate-700 disabled:dark:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold shadow-sm shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        {uploading ? 'กำลังดำเนินการ...' : 'เริ่มนำเข้าข้อมูล'}
                    </button>
                </div>
            </div>
        </div>
    );
}