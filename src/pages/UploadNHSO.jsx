import { useState, useRef } from 'react';
import { FileUp, Upload, Loader2, AlertTriangle, CheckCircle, XCircle, Database } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../services/api';

const UploadNHSO = () => {
    const [file, setFile] = useState(null);
    const [detectedYears, setDetectedYears] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [previewData, setPreviewData] = useState([]);
    
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
                // หาคอลัมน์ปีงบ
                const yearKey = Object.keys(data[0]).find(k => k.toLowerCase() === 'fiscal_year' || k === 'ปีงบ' || k === 'ปีงบประมาณ');
                
                if (!yearKey) {
                    Swal.fire('รูปแบบไฟล์ไม่ถูกต้อง', 'ไม่พบคอลัมน์ "ปีงบ" หรือ "fiscal_year" ในไฟล์', 'error');
                    resetFile();
                    setIsProcessing(false); worker.terminate();
                    return;
                }

                const yearsSet = new Set();
                data.forEach(row => { if (row[yearKey]) yearsSet.add(parseInt(row[yearKey])); });

                setDetectedYears(Array.from(yearsSet).sort((a, b) => b - a));
                fullDataRef.current = data;
                setPreviewData(data.slice(0, 5));
            } else { 
                Swal.fire('ข้อผิดพลาด', error || 'ไม่พบข้อมูลในไฟล์', 'error'); 
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
                const res = await api.post('/upload/nhso', { data: chunk, batch_id: batchId, fiscal_year: detectedYears[0] });

                totalSuccess += res.data.successCount;
                if (res.data.errors.length > 0) {
                    const mappedErrors = res.data.errors.map(err => ({
                        ...err, original_row: err.row_index + (i * chunkSize)
                    }));
                    accumulatedErrors = [...accumulatedErrors, ...mappedErrors];
                }
                setProgress(Math.round(((i + 1) / totalChunks) * 100));
            }

            if (totalSuccess > 0) {
                await api.post('/upload/nhso-finalize', { batch_id: batchId });
            }

            setImportResult({ success: totalSuccess, failed: accumulatedErrors.length });
            setErrorList(accumulatedErrors);
            
            Swal.fire({
                title: 'นำเข้าข้อมูล สปสช. สำเร็จ',
                text: `บันทึกลงตารางงบประมาณสำเร็จ ${totalSuccess.toLocaleString()} แถว, ข้าม ${accumulatedErrors.length.toLocaleString()} แถว`,
                icon: accumulatedErrors.length > 0 ? 'warning' : 'success'
            });
            
        } catch (err) { 
            Swal.fire('เกิดข้อผิดพลาด', err.response?.data?.error || 'ไม่สามารถเชื่อมต่อระบบได้', 'error'); 
        } finally { 
            setIsUploading(false); 
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center">
                <Database className="mr-2 text-teal-600"/> นำเข้าข้อมูล สปสช. (จัดสรรงบประมาณ)
            </h1>
            
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                {!importResult && (
                    <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if(e.dataTransfer.files[0]) validateAndProcessFile(e.dataTransfer.files[0]); }}
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
                            ${isDragging ? 'border-teal-500 bg-teal-50 scale-[1.01]' : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'}
                            ${file ? 'border-emerald-500 bg-emerald-50/10' : ''}
                            ${isUploading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                        `}
                    >
                        <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { if(e.target.files[0]) validateAndProcessFile(e.target.files[0]); }} accept=".xlsx,.xls,.csv" />
                        
                        <div className="flex flex-col items-center">
                            {file ? (
                                <div className="bg-emerald-100 p-4 rounded-full mb-4 animate-bounce"><FileUp className="h-10 w-10 text-emerald-600" /></div>
                            ) : (
                                <div className={`p-4 rounded-full mb-4 ${isDragging ? 'bg-teal-100' : 'bg-slate-100'}`}><Upload className={`h-10 w-10 ${isDragging ? 'text-teal-600' : 'text-slate-400'}`} /></div>
                            )}
                            <h3 className="text-lg font-semibold text-slate-700">{file ? file.name : 'ลากไฟล์ สปสช. (Excel/CSV) มาวางที่นี่'}</h3>
                            <p className="text-sm text-slate-400 mt-2">
                                ระบบจะค้นหารหัสกิจกรรมให้อัตโนมัติ หากไฟล์มีคอลัมน์ <span className="text-teal-600 font-bold">"กิจกรรมย่อย"</span>
                            </p>
                            
                            {detectedYears.length > 0 && (
                                <div className="mt-4 flex gap-2 justify-center">
                                    {detectedYears.map(y => <span key={y} className="px-3 py-1 bg-teal-600 text-white text-xs font-bold rounded-full shadow-sm">ปีงบ {y}</span>)}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {isProcessing && <div className="mt-6 flex items-center justify-center text-teal-600 font-medium animate-pulse"><Loader2 className="animate-spin mr-2" /> กำลังตรวจสอบข้อมูล...</div>}

                {previewData.length > 0 && !importResult && (
                    <div className="mt-8 space-y-6 animate-in fade-in">
                        <div className="overflow-hidden border border-slate-200 rounded-xl mb-6 shadow-sm">
                            <table className="min-w-full divide-y divide-slate-200 text-xs">
                                <thead className="bg-slate-50">
                                    <tr>{Object.keys(previewData[0]).map((k) => <th key={k} className="px-4 py-3 text-left text-slate-500 font-bold uppercase">{k}</th>)}</tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {previewData.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-50"><td colSpan={Object.keys(row).length} className="p-0"><div className="flex w-full">{Object.values(row).map((v, j) => <div key={j} className="px-4 py-3 flex-1 text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">{String(v)}</div>)}</div></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {isUploading && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-bold"><span className="text-teal-600">กำลังนำเข้าและจับคู่กิจกรรม...</span><span>{progress}%</span></div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden border"><div className="h-full bg-teal-500 transition-all duration-300" style={{width: `${progress}%`}}></div></div>
                            </div>
                        )}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button onClick={resetFile} disabled={isUploading} className="px-6 py-2.5 text-slate-500 font-medium hover:bg-slate-100 rounded-xl">ยกเลิก</button>
                            <button onClick={handleUpload} disabled={isUploading} className={`px-8 py-2.5 bg-teal-600 text-white rounded-xl font-bold shadow-lg shadow-teal-200 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-teal-700 active:scale-95'}`}>
                                {isUploading ? 'กำลังประมวลผล...' : 'ยืนยันนำเข้าข้อมูล'}
                            </button>
                        </div>
                    </div>
                )}

                {importResult && (
                    <div className="mt-6 space-y-6 animate-in fade-in duration-500">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center shadow-sm">
                                <CheckCircle className="text-emerald-500 mr-4 h-10 w-10" />
                                <div><p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">นำเข้าสำเร็จ</p><p className="text-3xl font-black text-emerald-700">{importResult.success.toLocaleString()} <span className="text-sm font-normal">แถว</span></p></div>
                            </div>
                            <div className={`p-4 rounded-xl flex items-center shadow-sm border ${importResult.failed > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                                <XCircle className={`${importResult.failed > 0 ? 'text-rose-500' : 'text-slate-400'} mr-4 h-10 w-10`} />
                                <div><p className={`text-xs font-bold uppercase ${importResult.failed > 0 ? 'text-rose-600' : 'text-slate-500'}`}>ข้ามรายการ (มีข้อผิดพลาด)</p><p className={`text-3xl font-black ${importResult.failed > 0 ? 'text-rose-700' : 'text-slate-600'}`}>{importResult.failed.toLocaleString()} <span className="text-sm font-normal">แถว</span></p></div>
                            </div>
                        </div>

                        {errorList.length > 0 && (
                            <div className="space-y-3 pt-4">
                                <h3 className="font-bold text-rose-600 flex items-center text-lg"><AlertTriangle size={20} className="mr-2"/> รายการที่ไม่ถูกนำเข้า (Error List)</h3>
                                <div className="border border-rose-200 rounded-xl overflow-hidden shadow-sm max-h-[400px] overflow-y-auto">
                                    <table className="min-w-full divide-y divide-rose-200 text-sm">
                                        <thead className="bg-rose-100 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-bold text-rose-800 w-24">แถวที่</th>
                                                <th className="px-4 py-3 text-left font-bold text-rose-800 w-32">รหัส รพ.</th>
                                                <th className="px-4 py-3 text-left font-bold text-rose-800">กิจกรรม / รหัสที่อ้างอิง</th>
                                                <th className="px-4 py-3 text-left font-bold text-rose-800">สาเหตุที่ข้าม</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-rose-50">
                                            {errorList.map((err, i) => (
                                                <tr key={i} className="hover:bg-rose-50/50">
                                                    <td className="px-4 py-3 font-mono font-bold text-rose-600">{err.original_row}</td>
                                                    <td className="px-4 py-3 text-slate-700">{err.data.hoscode || err.data['รหัสหน่วยบริการ']}</td>
                                                    <td className="px-4 py-3 text-slate-700 font-bold">{err.data.sub_activity_id || err.data['กิจกรรมย่อย'] || err.data['รหัสกิจกรรมย่อย']}</td>
                                                    <td className="px-4 py-3 text-rose-600 text-xs">{err.reason}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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

export default UploadNHSO;