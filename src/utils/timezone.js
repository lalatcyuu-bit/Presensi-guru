/**
 * Timezone Utility untuk WIB (UTC+7)
 * Menggunakan moment-timezone untuk akurasi maksimal
 */

const moment = require('moment-timezone');

// Set default timezone ke WIB
const WIB_TIMEZONE = 'Asia/Jakarta';

/**
 * Get current datetime in WIB timezone
 * @returns {Date} Date object in WIB timezone
 */
const getWIBTime = () => {
    return moment.tz(WIB_TIMEZONE).toDate();
};

/**
 * Get current date in WIB (YYYY-MM-DD format)
 * @returns {string} Date string in format YYYY-MM-DD
 */
const getWIBDate = () => {
    return moment.tz(WIB_TIMEZONE).format('YYYY-MM-DD');
};

/**
 * Get current time in WIB (HH:MM:SS format)
 * @returns {string} Time string in format HH:MM:SS
 */
const getWIBTimeString = () => {
    return moment.tz(WIB_TIMEZONE).format('HH:mm:ss');
};

/**
 * Get current day name in Indonesian
 * @returns {string} Day name in Indonesian
 */
const getWIBDayName = () => {
    const hariMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayIndex = moment.tz(WIB_TIMEZONE).day();
    return hariMap[dayIndex];
};

/**
 * Get formatted datetime string in WIB
 * @returns {string} ISO string in WIB timezone
 */
const getWIBISOString = () => {
    return moment.tz(WIB_TIMEZONE).toISOString();
};

/**
 * Get complete WIB info object
 * @returns {Object} Object containing all WIB time info
 */
const getWIBInfo = () => {
    const now = moment.tz(WIB_TIMEZONE);
    const hariMap = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    return {
        date: now.format('YYYY-MM-DD'),
        time: now.format('HH:mm:ss'),
        day: hariMap[now.day()],
        datetime: now.toISOString(),
        dateObject: now.toDate()
    };
};

/**
 * Format date to Indonesian format
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date
 */
const formatIndonesianDate = (date = null) => {
    const targetDate = date ? moment.tz(date, WIB_TIMEZONE) : moment.tz(WIB_TIMEZONE);

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const dayName = dayNames[targetDate.day()];
    const day = targetDate.date();
    const monthName = monthNames[targetDate.month()];
    const year = targetDate.year();

    return `${dayName}, ${day} ${monthName} ${year}`;
};

/**
 * Check if current time is between two times
 * @param {string} startTime - Start time in HH:MM:SS format
 * @param {string} endTime - End time in HH:MM:SS format
 * @returns {boolean} True if current time is between start and end
 */
const isTimeBetween = (startTime, endTime) => {
    const currentTime = getWIBTimeString();
    return currentTime >= startTime && currentTime <= endTime;
};

/**
 * Get time status for schedule
 * @param {string} jamMulai - Start time (HH:MM:SS)
 * @param {string} jamSelesai - End time (HH:MM:SS)
 * @returns {string} Status: 'belum_dimulai', 'sedang_berlangsung', or 'sudah_selesai'
 */
const getTimeStatus = (jamMulai, jamSelesai) => {
    const currentTime = getWIBTimeString();

    if (currentTime < jamMulai) {
        return 'belum_dimulai';
    } else if (currentTime >= jamMulai && currentTime <= jamSelesai) {
        return 'sedang_berlangsung';
    } else {
        return 'sudah_selesai';
    }
};

module.exports = {
    getWIBTime,
    getWIBDate,
    getWIBTimeString,
    getWIBDayName,
    getWIBISOString,
    getWIBInfo,
    formatIndonesianDate,
    isTimeBetween,
    getTimeStatus
};