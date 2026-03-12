import { useState, useRef } from 'react';
import { FileUp, Upload, Loader2, Tags, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../services/api';

const UploadHDC = () => {
    const [file, setFile] = useState(null);
    const [uploadType, setUploadType] = useState('target');
    const [detectedYears, setDetectedYears] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [previewData, setPreviewData] = useState([]);
    
    // เก็บผลลัพธ์และรายการ Error
    const [importResult, setImportResult] = useState(null); 
    const [errorList, setErrorList] = useState([]);

    const fullDataRef = useRef([]);
    const fileInputRef = useRef(null);

    const validateAndProcessFile = (selectedFile) => {
        if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
            Swal.fire('ข้อผิดพลาด', 'กรุณาอัปโหลดไฟล์ Excel หรือ CSV เท่านั้น', 'error');
            return;
        }
        setFile(selectedFile);
        processFile(selectedFile);
    };

    const resetFile = () => {
        setFile(null); setPreviewData([]); setDetectedYears([]);
        setImportResult(null); setErrorList([]);
        fullDataRef.current = []; setProgress(0);
        if(fileInputRef.current) fileInputRef.current.value = '';
    };

    const processFile = (selectedFile) => {
        setIsProcessing(true);
        setErrorList([]);
        setImportResult(null);

        const worker = new Worker(new URL('../workers/excelWorker.js', import.meta.url), { type: 'module' });
        worker.postMessage({ file: selectedFile });
        
        worker.onmessage = (e) => {
            const { success, data, error } = e.data;
            if (success && data.length > 0) {
                const yearsSet = new Set();
                data.forEach(row => {
                    if (uploadType === 'target') {
                        if (row.fiscal_year) yearsSet.add(parseInt(row.fiscal_year));
                    } else {
                        if (row.actual_year && row.actual_month) {
                            const aYear = parseInt(row.actual_year);
                            const aMonth = parseInt(row.actual_month);
                            const fYear = aMonth >= 10 ? aYear + 1 : aYear;
                            yearsSet.add(fYear);
                        }
                    }
                });

                const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
                if (sortedYears.length === 0) {
                    Swal.fire('โครงสร้างไฟล์ไม่ถูกต้อง', `ไม่พบคอลัมน์ระบุปีสำหรับข้อมูล ${uploadType}`, 'error');
                    resetFile();
                } else {
                    setDetectedYears(sortedYears);
                    fullDataRef.current = data;
                    setPreviewData(data.slice(0, 5));
                }
            } else { 
                Swal.fire('ข้อผิดพลาด', error || 'ไฟล์ว่างเปล่า', 'error'); 
                resetFile(); 
            }
            setIsProcessing(false); worker.terminate();
        };
    };

    const handleUpload = async () => {
        if (detectedYears.length === 0) return;
        setIsUploading(true); setProgress(0);
        
        const batchId = crypto.randomUUID();
        const data = fullDataRef.current;
        const chunkSize = 2000;
        const totalChunks = Math.ceil(data.length / chunkSize);
        
        let totalSuccess = 0; 
        let accumulatedErrors = [];

        try {
            for (let i = 0; i < totalChunks; i++) {
                const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
                const res = await api.post(uploadType === 'target' ? '/upload/hdc-target' : '/upload/hdc-result', {
                    data: chunk, batch_id: batchId, fiscal_year: detectedYears[0]
                });

                totalSuccess += res.data.successCount;
                if (res.data.errors.length > 0) {
                    // ปรับเลขบรรทัดให้ตรงกับไฟล์จริง
                    const mappedErrors = res.data.errors.map(err => ({
                        ...err,
                        original_row: err.row_index + (i * chunkSize)
                    }));
                    accumulatedErrors = [...accumulatedErrors, ...mappedErrors];
                }
                setProgress(Math.round(((i + 1) / totalChunks) * 100));
            }

            if (totalSuccess > 0) {
                await api.post('/upload/hdc-finalize', { batch_id: batchId, type: uploadType });
            }

            // แสดงผลลัพธ์
            setImportResult({ success: totalSuccess, failed: accumulatedErrors.length });
            setErrorList(accumulatedErrors);
            
            Swal.fire({
                title: 'ประมวลผลเสร็จสิ้น',
                text: `นำเข้าสำเร็จ ${totalSuccess.toLocaleString()} แถว และพบข้อผิดพลาด ${accumulatedErrors.length.toLocaleString()} แถว`,
                icon: accumulatedErrors.length > 0 ? 'warning' : 'success'
            });
            
        } catch (err) { 
            Swal.fire('Error', err.response?.data?.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error'); 
        } finally { 
            setIsUploading(false); 
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <h1 className="text-2xl font-bold text-slate-800">นำเข้าข้อมูล HDC</h1>
            
            <div className="bg-white p-8 rounded-2xl border shadow-sm">
                <div className="flex p-1 bg-slate-100 rounded-xl w-fit mb-8">
                    <button onClick={() => {setUploadType('target'); resetFile();}} className={`px-6 py-2 rounded-lg font-medium transition-all ${uploadType === 'target' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>เป้าหมาย (Target)</button>
                    <button onClick={() => {setUploadType('result'); resetFile();}} className={`px-6 py-2 rounded-lg font-medium transition-all ${uploadType === 'result' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>ผลงาน (Result)</button>
                </div>

                {!importResult && (
                    <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files[0]) validateAndProcessFile(e.dataTransfer.files[0]); }}
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
                            ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
                            ${file ? 'border-emerald-500 bg-emerald-50/10' : ''}
                            ${isUploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                        `}
                    >
                        <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { if(e.target.files[0]) validateAndProcessFile(e.target.files[0]); }} accept=".xlsx,.xls,.csv" />
                        
                        <div className="flex flex-col items-center">
                            {file ? (
                                <div className="bg-emerald-100 p-4 rounded-full mb-4 animate-bounce"><FileUp className="h-10 w-10 text-emerald-600" /></div>
                            ) : (
                                <div className={`p-4 rounded-full mb-4 ${isDragging ? 'bg-blue-100' : 'bg-slate-100'}`}><Upload className={`h-10 w-10 ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} /></div>
                            )}
                            <h3 className="text-lg font-semibold text-slate-700">{file ? file.name : 'ลากไฟล์มาวางหรือคลิกเพื่อเลือกไฟล์'}</h3>
                            {detectedYears.length > 0 && (
                                <div className="mt-4 flex gap-2 justify-center">
                                    {detectedYears.map(y => <span key={y} className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">ปีงบ {y}</span>)}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {isProcessing && <div className="mt-6 flex items-center justify-center text-blue-600 font-medium animate-pulse"><Loader2 className="animate-spin mr-2" /> กำลังตรวจสอบข้อมูล...</div>}

                {previewData.length > 0 && !importResult && (
                    <div className="mt-8 space-y-6">
                        <div className="overflow-hidden border border-slate-200 rounded-xl mb-6 shadow-sm">
                            <table className="min-w-full divide-y divide-slate-200 text-xs">
                                <thead className="bg-slate-50">
                                    <tr>{Object.keys(previewData[0]).map((k) => <th key={k} className="px-4 py-3 text-left text-slate-500 font-bold uppercase">{k}</th>)}</tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {previewData.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50"><td colSpan={Object.keys(row).length} className="p-0"><div className="flex w-full">{Object.values(row).map((v, j) => <div key={j} className="px-4 py-3 flex-1 text-slate-600 whitespace-nowrap">{String(v)}</div>)}</div></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {isUploading && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-bold"><span className="text-blue-600">กำลังนำเข้าข้อมูล...</span><span>{progress}%</span></div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border"><div className="h-full bg-blue-500 transition-all duration-300" style={{width: `${progress}%`}}></div></div>
                            </div>
                        )}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button onClick={resetFile} disabled={isUploading} className="px-6 py-2.5 text-slate-500 font-medium hover:bg-slate-100 rounded-xl">ยกเลิก</button>
                            <button onClick={handleUpload} disabled={isUploading} className={`px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}>
                                {isUploading ? 'กำลังประมวลผล...' : 'ยืนยันนำเข้าข้อมูล'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ส่วนแสดงสรุปผลและตาราง Error */}
                {importResult && (
                    <div className="mt-6 space-y-6 animate-in fade-in duration-500">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center shadow-sm">
                                <CheckCircle className="text-emerald-500 mr-4 h-10 w-10" />
                                <div><p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">นำเข้าสำเร็จ</p><p className="text-3xl font-black text-emerald-700">{importResult.success.toLocaleString()} <span className="text-sm font-normal">แถว</span></p></div>
                            </div>
                            <div className={`p-4 rounded-xl flex items-center shadow-sm border ${importResult.failed > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                                <XCircle className={`${importResult.failed > 0 ? 'text-rose-500' : 'text-slate-400'} mr-4 h-10 w-10`} />
                                <div><p className={`text-xs font-bold uppercase tracking-wider ${importResult.failed > 0 ? 'text-rose-600' : 'text-slate-500'}`}>ข้ามรายการ (ผิดเงื่อนไข)</p><p className={`text-3xl font-black ${importResult.failed > 0 ? 'text-rose-700' : 'text-slate-600'}`}>{importResult.failed.toLocaleString()} <span className="text-sm font-normal">แถว</span></p></div>
                            </div>
                        </div>

                        {errorList.length > 0 && (
                            <div className="space-y-3 pt-4">
                                <h3 className="font-bold text-rose-600 flex items-center text-lg"><AlertTriangle size={20} className="mr-2"/> รายการข้อมูลที่ไม่ถูกนำเข้า (Error List)</h3>
                                <div className="border border-rose-200 rounded-xl overflow-hidden shadow-sm max-h-[400px] overflow-y-auto">
                                    <table className="min-w-full divide-y divide-rose-200 text-sm">
                                        <thead className="bg-rose-100 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-bold text-rose-800 w-24">แถวที่</th>
                                                <th className="px-4 py-3 text-left font-bold text-rose-800 w-32">หน่วยงาน</th>
                                                <th className="px-4 py-3 text-left font-bold text-rose-800 w-40">รหัสกิจกรรม</th>
                                                <th className="px-4 py-3 text-left font-bold text-rose-800">สาเหตุที่ข้าม</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-rose-50">
                                            {errorList.map((err, i) => (
                                                <tr key={i} className="hover:bg-rose-50/50 transition-colors">
                                                    <td className="px-4 py-3 font-mono font-bold text-rose-600">{err.original_row}</td>
                                                    <td className="px-4 py-3 text-slate-700">{err.data.hoscode}</td>
                                                    <td className="px-4 py-3 text-slate-700 font-bold">{err.data.sub_activity_id}</td>
                                                    <td className="px-4 py-3 text-rose-600 text-xs">{err.reason}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-slate-500 italic">* กรุณาแก้ไขข้อมูลในไฟล์ต้นฉบับแล้วนำเข้าใหม่อีกครั้งเฉพาะรายการที่ผิดพลาด</p>
                            </div>
                        )}
                        
                        <div className="flex justify-center pt-6">
                            <button onClick={resetFile} className="px-10 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg active:scale-95">เสร็จสิ้นและล้างหน้าจอ</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadHDC;