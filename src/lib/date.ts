/**
 * Mengalkulasi rentang tanggal (startDate dan endDate) untuk suatu siklus anggaran
 * bulanan berdasarkan tanggal gajian pengguna (salaryDay).
 * 
 * Contoh:
 * Jika monthYear = "2026-06" dan salaryDay = 25:
 * - startDate: "2026-06-25"
 * - endDate:   "2026-07-24"
 * 
 * Jika salaryDay = 1:
 * - startDate: "2026-06-01"
 * - endDate:   "2026-06-30"
 * 
 * @param monthYear Format "YYYY-MM"
 * @param salaryDay Angka dari 1 - 31
 */
export function getCycleDateRange(monthYear: string, salaryDay: number): { startDate: string; endDate: string } {
    const [yearStr, monthStr] = monthYear.split("-");
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1; // 0-indexed month (0 = Jan, 5 = Jun)

    if (salaryDay === 1) {
        const startDateObj = new Date(Date.UTC(year, monthIndex, 1));
        const endDateObj = new Date(Date.UTC(year, monthIndex + 1, 0));
        return {
            startDate: startDateObj.toISOString().substring(0, 10),
            endDate: endDateObj.toISOString().substring(0, 10)
        };
    }

    // 1. Tentukan tanggal mulai (startDate) pada bulan sebelumnya (monthIndex - 1)
    let prevMonthIndex = monthIndex - 1;
    let prevYear = year;
    if (prevMonthIndex < 0) {
        prevMonthIndex = 11;
        prevYear -= 1;
    }

    let startDateObj = new Date(Date.UTC(prevYear, prevMonthIndex, salaryDay));
    // Jika melebihi hari maksimal di bulan sebelumnya (misal tanggal 31 Februari), clamp ke hari terakhir
    const actualStartMonth = startDateObj.getUTCMonth();
    if (actualStartMonth !== prevMonthIndex) {
        startDateObj = new Date(Date.UTC(prevYear, prevMonthIndex + 1, 0));
    }

    // 2. Tentukan tanggal mulai untuk siklus berikutnya pada bulan berjalan (monthIndex)
    let currentSalaryDayObj = new Date(Date.UTC(year, monthIndex, salaryDay));
    const actualCurrentMonth = currentSalaryDayObj.getUTCMonth();
    if (actualCurrentMonth !== monthIndex) {
        currentSalaryDayObj = new Date(Date.UTC(year, monthIndex + 1, 0));
    }

    // 3. Tanggal selesai (endDate) adalah 1 hari sebelum tanggal gajian bulan berjalan
    const endDateObj = new Date(currentSalaryDayObj.getTime() - 24 * 60 * 60 * 1000);

    const startDate = startDateObj.toISOString().substring(0, 10); // YYYY-MM-DD
    const endDate = endDateObj.toISOString().substring(0, 10); // YYYY-MM-DD

    return { startDate, endDate };
}
