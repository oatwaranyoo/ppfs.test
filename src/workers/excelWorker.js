import * as XLSX from 'xlsx';

// เมื่อ Worker ได้รับข้อความจาก Main Thread
self.onmessage = async (e) => {
    try {
        const { file } = e.data;

        // อ่านไฟล์ด้วย FileReader แบบ ArrayBuffer
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                
                // อ่าน Excel (raw: false บังคับอ่านค่าแบบ Text ป้องกันบั๊กวันที่)
                const workbook = XLSX.read(data, { type: 'array', raw: false });

                // บังคับอ่านเฉพาะ Sheet แรกสุดเท่านั้น (ป้องกันอ่านชีตสรุป/คู่มือ)
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // ----------------------------------------------------------------
                // [SRS MUST] 1. Max Row Limit Shield
                // ตรวจสอบจำนวนแถวทั้งหมดใน Sheet ป้องกันการกิน Memory จนเบราว์เซอร์ค้าง
                // ----------------------------------------------------------------
                const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:A1");
                const totalRows = (range.e.r - range.s.r) + 1;
                
                if (totalRows > 100000) {
                    throw new Error(`ไฟล์มีขนาดใหญ่เกินไป (${totalRows.toLocaleString()} แถว) ระบบอนุญาตสูงสุดไม่เกิน 100,000 แถว เพื่อป้องกันหน่วยความจำเต็ม`);
                }

                // แปลงเป็น JSON อัตโนมัติ (แถวแรกเป็น Header)
                const rawJsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                // ----------------------------------------------------------------
                // [SRS MUST] 2. Data Sanitization & Validation
                // กรองแถวที่ว่างเปล่าทิ้ง และ Trim ตัดช่องว่างหน้า-หลังอักขระ
                // ----------------------------------------------------------------
                const sanitizedData = [];
                
                for (let i = 0; i < rawJsonData.length; i++) {
                    const row = rawJsonData[i];
                    let isEmptyRow = true;
                    const cleanRow = {};
                    
                    for (const key in row) {
                        let val = row[key];
                        
                        // ตรวจสอบว่าเซลล์มีค่าหรือไม่
                        if (val !== undefined && val !== null && val !== "") {
                            isEmptyRow = false;
                        }
                        
                        // Clean Data: ถ้าเป็น String ให้ทำการ Trim ช่องว่าง
                        // (หมายเหตุ: ใช้ .trim() แทนการตัด .substring(0,20) ทั้งหมดเพื่อป้องกันชื่อ รพ. หรือข้อมูลยาวๆ ขาดหาย)
                        if (typeof val === 'string') {
                            val = val.trim();
                        }
                        
                        // Clean Key: ตัดช่องว่างในชื่อคอลัมน์ด้วย
                        const cleanKey = key.trim();
                        cleanRow[cleanKey] = val;
                    }
                    
                    // เก็บเฉพาะแถวที่มีข้อมูลจริง
                    if (!isEmptyRow) {
                        sanitizedData.push(cleanRow);
                    }
                }

                if (sanitizedData.length === 0) {
                    throw new Error('ไม่พบข้อมูลในไฟล์ หรือไฟล์มีแต่แถวว่าง');
                }

                // ส่งข้อมูลที่ประมวลผลและทำความสะอาดแล้วกลับไปให้ Main Thread
                self.postMessage({ success: true, data: sanitizedData });

            } catch (processError) {
                // จับ Error ที่เกิดในขั้นตอนการประมวลผลไฟล์ (เช่น ไฟล์พัง หรือเกิน Limit)
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