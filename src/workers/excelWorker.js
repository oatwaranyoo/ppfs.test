import * as XLSX from 'xlsx';

// เมื่อ Worker ได้รับข้อความจาก Main Thread
self.onmessage = async (e) => {
    try {
        const { file } = e.data;

        // อ่านไฟล์ด้วย FileReader แบบ ArrayBuffer
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            
            // อ่าน Excel (raw: false บังคับอ่านค่าแบบ Text ป้องกันบั๊กวันที่)
            const workbook = XLSX.read(data, { type: 'array', raw: false });

            // บังคับอ่านเฉพาะ Sheet แรกสุดเท่านั้น (ป้องกันอ่านชีตสรุป/คู่มือ)
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // แปลงเป็น JSON อัตโนมัติ (แถวแรกเป็น Header)
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            // ส่งข้อมูลที่ประมวลผลเสร็จกลับไปให้ Main Thread
            self.postMessage({ success: true, data: jsonData });
        };
        
        reader.onerror = (error) => {
            self.postMessage({ success: false, error: 'เกิดข้อผิดพลาดในการอ่านไฟล์' });
        };

        reader.readAsArrayBuffer(file);
    } catch (error) {
        self.postMessage({ success: false, error: error.message });
    }
};