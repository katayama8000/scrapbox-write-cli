export const formatDate = (date: Date, format: string): string => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return format
        .replace("yyyy", date.getFullYear().toString())
        .replace("M", (date.getMonth() + 1).toString().padStart(2, '0'))
        .replace("d", date.getDate().toString().padStart(2, '0'))
        .replace("ddd", days[date.getDay()]);
};