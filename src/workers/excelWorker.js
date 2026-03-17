import * as XLSX from 'xlsx';

self.onmessage = async (e) => {
    try {
        const { file, expectedFiscalYear, defaultMonthCount } = e.data;
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                // 1. อ่านข้อมูลแบบไบนารี
                const data = new Uint8Array(event.target.result);
                // [Critical] อ่านด้วยออปชัน raw: false เพื่อป้องกันปัญหา Date Serial และให้ได้ Text ตามที่ตาเห็นใน Excel
                const workbook = XLSX.read(data, { type: 'array', raw: false });
                
                // [Critical] บังคับอ่านเฉพาะ Sheet แรกสุดเท่านั้น (ป้องกันปัญหาดึงชีตสรุปมาคำนวณ)
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // 2. ตรวจสอบจำนวนแถวป้องกัน Memory เต็ม (Limit 100,000 แถว ตาม SRS)
                const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:A1");
                const totalRows = (range.e.r - range.s.r) + 1;
                
                if (totalRows > 100000) {
                    throw new Error(`ไฟล์มีขนาดใหญ่เกินไป (${totalRows.toLocaleString()} แถว) ระบบอนุญาตสูงสุดไม่เกิน 100,000 แถว เพื่อป้องกันหน่วยความจำเต็ม`);
                }

                // 3. แปลงเป็น JSON แบบเติมค่าว่างให้ครบทุกคอลัมน์
                const rawJsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                
                if (rawJsonData.length === 0) {
                    throw new Error("ไม่พบข้อมูลในไฟล์ Excel (ไฟล์ว่างเปล่า)");
                }

                // -------------------------------------------------------------
                // [ตรวจสอบโครงสร้างไฟล์] ดักจับ Error ถ้าไม่มีคอลัมน์ชื่อกิจกรรม
                // -------------------------------------------------------------
                // ดึงชื่อหัวคอลัมน์ (Headers) จากแถวแรกมาตัดช่องว่างหัวท้ายออก
                const headers = Object.keys(rawJsonData[0]).map(key => key.trim());
                
                // กำหนดชื่อคอลัมน์ที่ยอมรับได้ว่าเป็นคอลัมน์กิจกรรม
                const validActivityColumns = ['กิจกรรมย่อย', 'ชื่อกิจกรรม', 'sub_activity_name'];
                
                // ตรวจสอบว่ามีคอลัมน์ใดคอลัมน์หนึ่งตรงกับที่กำหนดไว้หรือไม่
                const hasActivityColumn = headers.some(header => validActivityColumns.includes(header));

                if (!hasActivityColumn) {
                    throw new Error(`โครงสร้างไฟล์ไม่ถูกต้อง: ไม่พบคอลัมน์สำหรับชื่อกิจกรรม (เช่น 'กิจกรรมย่อย', 'ชื่อกิจกรรม' หรือ 'sub_activity_name') โปรดตรวจสอบไฟล์ Excel ของคุณอีกครั้ง`);
                }
                // -------------------------------------------------------------

                const sanitizedData = [];
                let mismatchedCount = 0;
                let firstMismatchRow = -1;
                
                // 4. วนลูปจัดการข้อมูล
                for (let i = 0; i < rawJsonData.length; i++) {
                    const row = rawJsonData[i];
                    let isEmptyRow = true;
                    const cleanRow = {};
                    
                    // ทำความสะอาดและตรวจจับแถวว่าง
                    for (const key in row) {
                        let val = row[key];
                        
                        if (val !== undefined && val !== null && val !== "") {
                            isEmptyRow = false;
                        }
                        
                        // ถอดคอมม่า (Comma) ออกจากตัวเลข
                        if (typeof val === 'string') {
                            val = val.trim();
                            const isNumeric = /^-?\d+(?:,\d{3})*(?:\.\d+)?$/.test(val);
                            if (isNumeric) {
                                val = val.replace(/,/g, ''); 
                            }
                        }
                        
                        // ทำความสะอาดชื่อคอลัมน์ไม่ให้มีช่องว่างหัวท้าย
                        const cleanKey = key.trim();
                        cleanRow[cleanKey] = val;
                    }
                    
                    // 5. ถ้าไม่ใช่แถวว่าง ให้ตรวจสอบปีงบประมาณ
                    if (!isEmptyRow) {
                        const rowYear = cleanRow['ปีงบ'] || cleanRow['ปีงบประมาณ'] || cleanRow['fiscal_year'];
                        
                        // ถ้าปีงบไม่ตรง ให้ข้ามการเก็บข้อมูลบรรทัดนี้ และนับจำนวนไว้
                        if (expectedFiscalYear && rowYear && String(rowYear) !== String(expectedFiscalYear)) {
                            mismatchedCount++;
                            if (firstMismatchRow === -1) firstMismatchRow = i + 2; // +2 เพราะ Excel เริ่มบรรทัดที่ 1 และแถวแรกเป็น Header
                            continue; // ข้ามการเอาเข้า array sanitizedData
                        }

                        // ถ้าไม่มีคอลัมน์เดือน/ปี ให้เติมค่า Default ที่เลือกจากหน้าเว็บ
                        cleanRow['month_count'] = cleanRow['จำนวนเดือน'] || cleanRow['month_count'] || defaultMonthCount;
                        cleanRow['fiscal_year'] = rowYear || expectedFiscalYear;

                        sanitizedData.push(cleanRow);
                    }
                }

                // ส่งข้อมูลที่คัดกรองแล้ว พร้อมสถิติแถวที่ไม่ตรง กลับไปยัง Main Thread
                self.postMessage({ 
                    success: true, 
                    data: sanitizedData,
                    mismatchedCount: mismatchedCount,
                    firstMismatchRow: firstMismatchRow
                });

            } catch (processError) {
                // ส่ง Error กลับไปแสดงผลที่ Component
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