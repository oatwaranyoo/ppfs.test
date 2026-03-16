import * as XLSX from 'xlsx';

self.onmessage = async (e) => {
    try {
        const { file } = e.data;
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array', raw: false });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // [SRS MUST] 1. Max Row Limit Shield
                const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:A1");
                const totalRows = (range.e.r - range.s.r) + 1;
                
                if (totalRows > 100000) {
                    throw new Error(`ไฟล์มีขนาดใหญ่เกินไป (${totalRows.toLocaleString()} แถว) ระบบอนุญาตสูงสุดไม่เกิน 100,000 แถว เพื่อป้องกันหน่วยความจำเต็ม`);
                }

                const rawJsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                // [SRS MUST] 2. Data Sanitization & Math Precision Safety
                const sanitizedData = [];
                
                for (let i = 0; i < rawJsonData.length; i++) {
                    const row = rawJsonData[i];
                    let isEmptyRow = true;
                    const cleanRow = {};
                    
                    for (const key in row) {
                        let val = row[key];
                        
                        if (val !== undefined && val !== null && val !== "") {
                            isEmptyRow = false;
                        }
                        
                        if (typeof val === 'string') {
                            val = val.trim();
                            // ป้องกันปัญหาทศนิยมเพี้ยนหากเป็นตัวเลขจำนวนเงิน
                            // โดยไม่แปลงเป็น Float ค้างไว้ใน Memory แต่ส่งกลับเป็น String ตัวเลขแทน
                            const isNumeric = /^-?\d+(?:,\d{3})*(?:\.\d+)?$/.test(val);
                            if (isNumeric) {
                                val = val.replace(/,/g, ''); 
                            }
                        }
                        
                        const cleanKey = key.trim();
                        cleanRow[cleanKey] = val;
                    }
                    
                    if (!isEmptyRow) {
                        sanitizedData.push(cleanRow);
                    }
                }

                if (sanitizedData.length === 0) {
                    throw new Error('ไม่พบข้อมูลในไฟล์ หรือไฟล์มีแต่แถวว่าง');
                }

                self.postMessage({ success: true, data: sanitizedData });

            } catch (processError) {
                self.postMessage({ success: false, error: processError.message });
            }
        };
        
        reader.onerror = () => {
            self.postMessage({ success: false, error: 'เกิดข้อผิดพลาดในการอ่านไฟล์จากเบราว์เซอร์' });
        };

        reader.readAsArrayBuffer(file);
    } catch (error) {
        self.postMessage({ success: false, error: error.message });
    }
};