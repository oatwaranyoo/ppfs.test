import { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, X, CloudUpload, Calendar, Clock, Eye, Database, ArrowRight } from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';
import Select from 'react-select'; 

export default function UploadNHSO() {
    // -------------------------------------------------------------
    // State Management
    // -------------------------------------------------------------
    const currentYear = new Date().getFullYear() + 543;
    
    const yearOptions = [
        { value: String(currentYear - 1), label: `ปีงบประมาณ ${currentYear - 1}` },
        { value: String(currentYear), label: `ปีงบประมาณ ${currentYear}` },
        { value: String(currentYear + 1), label: `ปีงบประมาณ ${currentYear + 1}` },
        { value: String(currentYear + 2), label: `ปีงบประมาณ ${currentYear + 2}` },
    ];

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1),
        label: i === 11 ? '12 เดือน (เหมาจ่ายทั้งปี)' : `${i + 1} เดือน`
    }));

    // ดึงค่า VITE_BYEAR จาก .env มาเป็นค่าเริ่มต้น ถ้าไม่มีให้ใช้ปีปัจจุบัน + 1
    const envYear = import.meta.env.VITE_BYEAR;
    const defaultFiscalYear = envYear ? String(envYear) : String(currentYear + 1);

    const [fiscalYear, setFiscalYear] = useState(defaultFiscalYear); 
    const [monthCount, setMonthCount] = useState('12'); 

    // Step Control: 1 = เลือกไฟล์, 2 = แสดงพรีวิว, 3 = กำลังอัปโหลด
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [sanitizedFileName, setSanitizedFileName] = useState('');
    
    // ข้อมูลจาก Excel ที่อ่านสำเร็จแล้ว
    const [parsedData, setParsedData] = useState([]);
    const [summary, setSummary] = useState({ totalRows: 0, totalVisit: 0, totalBudget: 0 });

    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [batchId, setBatchId] = useState(null);

    // -------------------------------------------------------------
    // Unload Event Guard (ปลด Lock เมื่อผู้ใช้ปิดหน้าเว็บหนีระหว่าง Step 3)
    // -------------------------------------------------------------
    useEffect(() => {
        const unlockPayload = batchId ? JSON.stringify({ batch_id: batchId }) : null;

        const handleBeforeUnload = (e) => {
            if (uploading && batchId && step === 3) {
                const blob = new Blob([unlockPayload], { type: 'application/json' });
                navigator.sendBeacon(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/upload/unlock`, blob);
                e.preventDefault();
                e.returnValue = ''; 
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (uploading && batchId && step === 3) {
                const blob = new Blob([unlockPayload], { type: 'application/json' });
                navigator.sendBeacon(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/upload/unlock`, blob);
            }
        };
    }, [uploading, batchId, step]);

    // -------------------------------------------------------------
    // Helper Functions
    // -------------------------------------------------------------
    const sanitizeHTML = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const formatNumber = (num) => {
        return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num || 0);
    };

    // -------------------------------------------------------------
    // Step 1: อ่านไฟล์และประมวลผล Web Worker (ยังไม่อัปโหลดขึ้นฐานข้อมูล)
    // -------------------------------------------------------------
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
            e.target.value = '';
            setFile(null);
            return;
        }

        setSanitizedFileName(sanitizeHTML(selectedFile.name));
        setFile(selectedFile);
        processFile(selectedFile);
        e.target.value = ''; // Reset input
    };

    const processFile = (fileToProcess) => {
        setStatus({ type: 'info', message: 'กำลังอ่านไฟล์และตรวจสอบข้อมูล...' });
        setUploading(true);

        const worker = new Worker(new URL('../workers/excelWorker.js', import.meta.url), { type: 'module' });
        
        worker.postMessage({ 
            file: fileToProcess, 
            expectedFiscalYear: fiscalYear, 
            defaultMonthCount: monthCount 
        });

        worker.onmessage = async (e) => {
            const { success, data, mismatchedCount, firstMismatchRow, error } = e.data;
            worker.terminate();

            if (!success) {
                setStatus({ type: 'error', message: `อ่านไฟล์ Excel ไม่สำเร็จ: ${error}` });
                setUploading(false);
                setFile(null);
                return;
            }

            // ตรวจสอบข้อมูลปีงบประมาณไม่ตรง
            if (mismatchedCount > 0) {
                const confirmResult = await Swal.fire({
                    title: 'พบข้อมูลปีงบประมาณไม่ตรงกัน',
                    html: `พบข้อมูลในไฟล์ที่ไม่ใช่ <b>ปี ${fiscalYear}</b> จำนวน <b>${mismatchedCount.toLocaleString()}</b> รายการ <br/>(เริ่มพบที่แถว ${firstMismatchRow})<br/><br/>คุณต้องการข้ามข้อมูลเหล่านั้น แล้วพรีวิวเฉพาะข้อมูลที่ตรงกับปี ${fiscalYear} จำนวน ${data.length.toLocaleString()} รายการ ใช่หรือไม่?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3b82f6',
                    cancelButtonColor: '#ef4444',
                    confirmButtonText: 'ยืนยัน, ใช้เฉพาะข้อมูลที่ตรง',
                    cancelButtonText: 'ยกเลิกไฟล์นี้'
                });

                if (!confirmResult.isConfirmed) {
                    cancelPreview();
                    return;
                }
            }

            if (data.length === 0) {
                Swal.fire({
                    icon: 'error',
                    title: 'ไม่มีข้อมูลให้พรีวิว',
                    text: `ไฟล์นี้ไม่มีข้อมูลของปีงบประมาณ ${fiscalYear} เลย กรุณาตรวจสอบไฟล์อีกครั้ง`,
                    confirmButtonColor: '#3b82f6'
                });
                cancelPreview();
                return;
            }

            // คำนวณยอดรวม (เพื่อแสดงใน Preview)
            const totalVisit = data.reduce((sum, row) => sum + (Number(row['จำนวนครั้ง'] || row.visit_count) || 0), 0);
            const totalBudget = data.reduce((sum, row) => sum + (Number(row['จำนวนเงินจ่าย'] || row.allocated_budget || row.budget) || 0), 0);

            setParsedData(data);
            setSummary({ totalRows: data.length, totalVisit, totalBudget });
            
            // ขยับไปสู่โหมด Preview
            setStep(2);
            setUploading(false);
            setStatus({ type: '', message: '' });
        };

        worker.onerror = () => {
            worker.terminate();
            setUploading(false);
            setFile(null);
            setStatus({ type: 'error', message: "เกิดข้อผิดพลาดรุนแรงใน Web Worker" });
        };
    };

    const cancelPreview = () => {
        setFile(null);
        setParsedData([]);
        setStep(1);
        setStatus({ type: '', message: '' });
    };

    // -------------------------------------------------------------
    // Step 2-3: ยืนยันพรีวิวและเริ่มส่งข้อมูลเข้า Database (Chunking)
    // -------------------------------------------------------------
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

    const handleConfirmUpload = async () => {
        setStep(3); // เปลี่ยนเป็นโหมดกำลังอัปโหลด
        setUploading(true);
        setStatus({ type: 'info', message: 'กำลังตรวจสอบสถานะระบบและจอง Lock...' });

        try {
            // 1. ยิง API ขอสร้าง Batch ID และจอง Lock เฉพาะเมื่อกดยืนยันอัปโหลดเท่านั้น
            const initResponse = await api.post('/upload/init', { scope: ['nhso_data'] });
            const currentBatchId = initResponse.data.batch_id;
            setBatchId(currentBatchId);

            // 2. หั่นข้อมูลเป็นชุด (Chunk) ชุดละ 500 แถว
            setStatus({ type: 'info', message: 'กำลังส่งข้อมูลเข้าสู่เซิร์ฟเวอร์...' });
            const CHUNK_SIZE = 500;
            const totalChunks = Math.ceil(parsedData.length / CHUNK_SIZE);
            
            for (let i = 0; i < totalChunks; i++) {
                const chunk = parsedData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                await sendChunkWithRetry(chunk, currentBatchId);
                
                const percent = Math.round(((i + 1) / totalChunks) * 100);
                setProgress(percent);
            }

            // 3. สั่ง Finalize ที่ Backend เพื่อทำ Data Swap และปลด Lock
            setStatus({ type: 'info', message: 'กำลังประมวลผลขั้นตอนสุดท้าย (Mapping)...' });
            try {
                const finalizeRes = await api.post('/upload/finalize-nhso', { batch_id: currentBatchId, scope: ['nhso_data'] });
                
                // ตรวจสอบข้อมูลที่ Map ไม่ผ่าน และแสดงตารางแจ้งเตือน
                const unmappedData = finalizeRes.data.unmappedData || [];
                
                if (unmappedData.length > 0) {
                    let tableHtml = `
                        <div class="mt-4 max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                            <table class="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                                <thead class="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-800 dark:text-slate-400 sticky top-0">
                                    <tr>
                                        <th scope="col" class="px-4 py-3 border-b dark:border-slate-700">ชื่อกิจกรรมในไฟล์ที่ไม่มีการ Mapping</th>
                                        <th scope="col" class="px-4 py-3 border-b dark:border-slate-700 text-center w-28">จำนวน (แถว)</th>
                                    </tr>
                                </thead>
                                <tbody>
                    `;
                    let totalErrors = 0;
                    unmappedData.forEach(item => {
                        totalErrors += item.error_count;
                        tableHtml += `
                            <tr class="bg-white border-b dark:bg-slate-900 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td class="px-4 py-2 font-medium text-red-500">${item.sub_activity_name || '<i>(ค่าว่าง)</i>'}</td>
                                <td class="px-4 py-2 text-center font-bold">${item.error_count}</td>
                            </tr>
                        `;
                    });
                    tableHtml += `</tbody></table></div>`;

                    Swal.fire({
                        icon: 'warning',
                        title: 'นำเข้าสำเร็จ (แต่มีบางส่วนถูกข้าม)',
                        html: `<div class="text-left">
                                นำเข้าข้อมูลบางส่วนเรียบร้อยแล้ว แต่พบข้อมูลจำนวน <b>${totalErrors}</b> รายการ ที่ไม่มีการจับคู่ (Mapping) กิจกรรมในปีงบ <b>${fiscalYear}</b> ระบบจึงข้ามข้อมูลดังต่อไปนี้:
                               </div>
                               ${tableHtml}
                               <div class="mt-4 text-xs text-slate-500 text-left">
                                  * ข้อมูลที่ถูกต้องรายการอื่นๆ ถูกนำเข้าเรียบร้อยแล้ว<br/>
                                  * หากต้องการให้รายการเหล่านี้เข้าสู่ระบบ กรุณาเพิ่ม Mapping ให้ถูกต้องแล้วอัปโหลดไฟล์เดิมซ้ำอีกครั้ง
                               </div>`,
                        confirmButtonColor: '#f59e0b',
                        width: '600px'
                    });

                } else {
                    Swal.fire({
                        icon: 'success',
                        title: 'นำเข้าข้อมูลสำเร็จ!',
                        text: `นำเข้าข้อมูล สปสช. จำนวน ${parsedData.length.toLocaleString()} รายการ และ Mapping สมบูรณ์ 100%`,
                        confirmButtonColor: '#10b981'
                    });
                }
                setStatus({ type: 'success', message: 'อัปโหลดข้อมูลสำเร็จเรียบร้อย' });
            } catch (finalizeError) {
                console.error("Finalize Error:", finalizeError);
                const resData = finalizeError.response?.data || {};
                const errorMsg = resData.message || finalizeError.message;
                const errorDetail = resData.error || '';
                
                Swal.fire({
                    icon: 'error',
                    title: 'ล้มเหลวในขั้นตอนสุดท้าย',
                    html: `ส่งข้อมูลครบแล้ว แต่เกิดปัญหาตอนสลับข้อมูลลงฐานข้อมูล (Finalize)<br/><br/>
                           <b class="text-red-500">${errorMsg}</b>
                           ${errorDetail ? `<div class="mt-3 p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-left text-red-600 dark:text-red-400 font-mono break-words">${errorDetail}</div>` : ''}
                           <br/><i>คำแนะนำ: โปรดตรวจสอบ Stored Procedure <b>sp_finalize_nhso_data</b></i>`,
                    confirmButtonColor: '#ef4444'
                });
                setStatus({ type: 'error', message: `Finalize ล้มเหลว: ${errorMsg}` });
            } finally {
                 setBatchId(null);
                 setFile(null);
                 setParsedData([]);
                 setUploading(false);
                 setProgress(100);
                 setTimeout(() => setStep(1), 3000); // รีเซ็ตหน้ากลับไป 1 หลังทำเสร็จ (หน่วงเวลา 3 วิ)
            }

        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
            setStatus({ type: 'error', message: errorMsg });
            setUploading(false);

            if (error.response?.status === 423 || errorMsg.includes('ระบบกำลังถูกใช้งาน')) {
                Swal.fire({
                    title: 'ระบบติดล็อคชั่วคราว',
                    html: `มีผู้ใช้อื่นกำลังอัปโหลดข้อมูล หรือมีสถานะค้างจากการอัปโหลดรอบที่แล้ว<br/><br/><i>ตามปกติระบบจะปลดล็อคอัตโนมัติภายใน 15 นาที</i>`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#3b82f6',
                    confirmButtonText: 'บังคับปลดล็อคเดี๋ยวนี้',
                    cancelButtonText: 'รอ 15 นาที'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            await api.post('/upload/force-unlock');
                            Swal.fire('สำเร็จ', 'ล้างสถานะล็อคเรียบร้อยแล้ว คุณสามารถกดยืนยันอัปโหลดอีกครั้ง', 'success');
                            setStatus({ type: '', message: '' }); 
                        } catch (err) {
                            Swal.fire('ผิดพลาด', 'ไม่สามารถบังคับปลดล็อคได้ กรุณาตรวจสอบฝั่ง Server', 'error');
                        }
                    }
                });
            } else if (batchId) {
                api.post('/upload/unlock', { batch_id: batchId }).catch(() => console.log("Unlock failed"));
                setBatchId(null);
            }
            // กลับไปหน้าพรีวิวเหมือนเดิม เผื่อกดอัปโหลดใหม่
            setStep(2); 
        }
    };

    // -------------------------------------------------------------
    // Styling (ปรับแต่ง Layout และ Cursor Pointer ให้ครบทุกส่วน)
    // -------------------------------------------------------------
    const selectClassNames = {
        control: ({ isFocused, isDisabled }) =>
            `flex items-center justify-between w-full px-2 py-1.5 bg-transparent outline-none cursor-pointer hover:cursor-pointer ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`,
        menu: () =>
            `mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50`,
        menuList: () => `p-1.5 custom-scrollbar max-h-60 overflow-y-auto`,
        option: ({ isFocused, isSelected }) =>
            `px-4 py-2.5 rounded-lg text-sm cursor-pointer hover:cursor-pointer transition-colors ${
                isSelected
                    ? 'bg-blue-600 text-white font-bold'
                    : isFocused
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium'
            }`,
        singleValue: () => `text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer hover:cursor-pointer`,
        placeholder: () => `text-sm font-medium text-slate-400 cursor-pointer hover:cursor-pointer`,
        valueContainer: () => `flex gap-1 px-2 cursor-pointer hover:cursor-pointer`,
        input: () => `text-slate-700 dark:text-slate-200 m-0 p-0 outline-none border-none focus:ring-0 cursor-pointer hover:cursor-pointer`,
        indicatorSeparator: () => `hidden`,
        dropdownIndicator: () => `p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer hover:cursor-pointer`,
    };

    // -------------------------------------------------------------
    // Render UI
    // -------------------------------------------------------------
    return (
        <div className="w-full mx-auto space-y-6 animation-fade-in">
            {/* Header Area */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                        <Database className="mr-3 w-7 h-7 text-blue-600" /> นำเข้าข้อมูล สปสช. (NHSO)
                    </h1>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest">
                        Data Ingestion Protocol
                    </p>
                </div>
                {/* Steps Indicator */}
                <div className="hidden md:flex items-center gap-3 text-sm font-bold text-slate-400 dark:text-slate-500">
                    <span className={step >= 1 ? "text-blue-600 dark:text-blue-400" : ""}>1. เลือกไฟล์</span>
                    <ArrowRight className="w-4 h-4" />
                    <span className={step >= 2 ? "text-blue-600 dark:text-blue-400" : ""}>2. ตรวจสอบข้อมูล</span>
                    <ArrowRight className="w-4 h-4" />
                    <span className={step === 3 ? "text-blue-600 dark:text-blue-400" : ""}>3. นำเข้าฐานข้อมูล</span>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
                
                {/* -------------------- STEP 1: Upload Form -------------------- */}
                {(step === 1 || uploading && step === 1) && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        {/* Options Area */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ปีงบประมาณ (ในไฟล์)</label>
                                <div className={`relative flex items-center bg-slate-50 dark:bg-slate-800/50 border ${uploading ? 'opacity-60 cursor-not-allowed' : ''} border-slate-200 dark:border-slate-700 rounded-xl transition-all focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 dark:focus-within:border-blue-400 cursor-pointer`}>
                                    <Calendar className="w-5 h-5 text-slate-400 ml-4 shrink-0" />
                                    <Select
                                        options={yearOptions}
                                        value={yearOptions.find(y => y.value === fiscalYear)}
                                        onChange={(selected) => setFiscalYear(selected.value)}
                                        isDisabled={uploading}
                                        unstyled
                                        classNames={selectClassNames}
                                        className="flex-1 cursor-pointer"
                                        placeholder="ค้นหาหรือเลือกปีงบ..."
                                        noOptionsMessage={() => "ไม่พบข้อมูล"}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">จำนวนเดือนของข้อมูลชุดนี้</label>
                                <div className={`relative flex items-center bg-slate-50 dark:bg-slate-800/50 border ${uploading ? 'opacity-60 cursor-not-allowed' : ''} border-slate-200 dark:border-slate-700 rounded-xl transition-all focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 dark:focus-within:border-blue-400 cursor-pointer`}>
                                    <Clock className="w-5 h-5 text-slate-400 ml-4 shrink-0" />
                                    <Select
                                        options={monthOptions}
                                        value={monthOptions.find(m => m.value === monthCount)}
                                        onChange={(selected) => setMonthCount(selected.value)}
                                        isDisabled={uploading}
                                        unstyled
                                        classNames={selectClassNames}
                                        className="flex-1 cursor-pointer"
                                        placeholder="ค้นหาจำนวนเดือน..."
                                        noOptionsMessage={() => "ไม่พบข้อมูล"}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Dropzone Area */}
                        <div className={`
                            border-2 border-dashed rounded-2xl p-8 md:p-16 text-center transition-all duration-200
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
                                <div className="w-16 h-16 mb-4 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center border border-slate-200 dark:border-slate-700 group-hover:scale-110 transition-transform">
                                    <Upload className="w-8 h-8 text-blue-500" />
                                </div>
                                <span className="text-slate-700 dark:text-slate-200 font-bold text-xl mb-2">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</span>
                                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">เพื่อตรวจสอบและพรีวิวข้อมูล (รองรับ .xlsx, .csv สูงสุด 20MB)</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* -------------------- STEP 2: Preview Area -------------------- */}
                {(step === 2 || (step === 3 && uploading)) && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        
                        {/* Preview Header & File Info */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                                    <FileSpreadsheet className="text-blue-600 dark:text-blue-400 w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
                                        ตัวอย่างข้อมูล: <span dangerouslySetInnerHTML={{ __html: sanitizedFileName }}></span>
                                    </h3>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                        ปีงบประมาณ <span className="text-blue-600 dark:text-blue-400 font-bold">{fiscalYear}</span> (ตั้งค่าจำนวนเดือน: {monthCount})
                                    </p>
                                </div>
                            </div>
                            
                            {/* Summary Badges */}
                            <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0">
                                <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center min-w-[100px]">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">จำนวนแถว</p>
                                    <p className="text-lg font-black text-slate-700 dark:text-slate-200">{summary.totalRows.toLocaleString()}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center min-w-[100px]">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">รวมจำนวนครั้ง</p>
                                    <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{summary.totalVisit.toLocaleString()}</p>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center min-w-[140px]">
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">รวมเงินจัดสรร (บาท)</p>
                                    <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{formatNumber(summary.totalBudget)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Data Table Preview (Show first 10 rows max) */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden mb-6 shadow-sm">
                            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center">
                                    <Eye className="w-4 h-4 mr-2" /> พรีวิวข้อมูล (10 รายการแรก)
                                </h4>
                            </div>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                                        <tr>
                                            <th className="px-4 py-3 border-b dark:border-slate-700 whitespace-nowrap">รหัสหน่วยฯ</th>
                                            <th className="px-4 py-3 border-b dark:border-slate-700">ชื่อกิจกรรม (ดิบจากไฟล์)</th>
                                            <th className="px-4 py-3 border-b dark:border-slate-700 text-right whitespace-nowrap">จำนวนครั้ง</th>
                                            <th className="px-4 py-3 border-b dark:border-slate-700 text-right whitespace-nowrap">เงินจัดสรร (บาท)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedData.slice(0, 10).map((row, idx) => (
                                            <tr key={idx} className="bg-white border-b dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-4 py-2.5 font-medium">{row['รหัสหน่วยบริการ'] || row.hoscode || '-'}</td>
                                                <td className="px-4 py-2.5 text-blue-600 dark:text-blue-400">{row['กิจกรรมย่อย'] || row.sub_activity_name || '-'}</td>
                                                <td className="px-4 py-2.5 text-right font-medium">{Number(row['จำนวนครั้ง'] || row.visit_count || 0).toLocaleString()}</td>
                                                <td className="px-4 py-2.5 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatNumber(row['จำนวนเงินจ่าย'] || row.allocated_budget || row.budget)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {parsedData.length > 10 && (
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 text-center text-sm font-medium text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
                                    และข้อมูลอื่นๆ อีก {(parsedData.length - 10).toLocaleString()} รายการ...
                                </div>
                            )}
                        </div>

                        {/* Action Buttons for Step 2 */}
                        {step === 2 && !uploading && (
                            <div className="flex flex-col sm:flex-row justify-end items-center gap-3 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                                <button 
                                    onClick={cancelPreview}
                                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    ยกเลิกไฟล์นี้
                                </button>
                                <button 
                                    onClick={handleConfirmUpload}
                                    className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-sm shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <CloudUpload className="w-5 h-5" /> ยืนยันนำเข้าข้อมูล
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* -------------------- Status & Progress Area -------------------- */}
                {uploading && (
                    <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in">
                        <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                {status.message || 'กำลังประมวลผล...'}
                            </span>
                            {step === 3 && <span className="text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-3 py-1 rounded-full">{progress}%</span>}
                        </div>
                        {step === 3 && (
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden shadow-inner">
                                <div 
                                    className="bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 h-full rounded-full transition-all duration-300 ease-out relative bg-[length:200%_100%] animate-[gradient_2s_linear_infinite]" 
                                    style={{ width: `${progress}%` }}
                                >
                                    <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {status.message && !uploading && status.type === 'error' && (
                    <div className="mt-6 p-4 rounded-2xl flex items-start gap-3 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/20 animate-in fade-in">
                        <AlertCircle className="shrink-0 mt-0.5 w-5 h-5" />
                        <span className="font-semibold text-sm leading-relaxed">{status.message}</span>
                    </div>
                )}

                {status.message && !uploading && status.type === 'success' && (
                    <div className="mt-6 p-4 rounded-2xl flex items-start gap-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 animate-in fade-in">
                        <CheckCircle2 className="shrink-0 mt-0.5 w-5 h-5" />
                        <span className="font-semibold text-sm leading-relaxed">{status.message}</span>
                    </div>
                )}
            </div>
        </div>
    );
}