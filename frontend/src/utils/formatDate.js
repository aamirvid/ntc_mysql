export function formatDateIndian(date) {
  if (!date) return "";
  if (typeof date === "string") {
    // Handles "YYYY-MM-DD" exactly
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split("-");
      return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
    }
    // Handles "YYYY-MM-DDTHH:mm:ss"
    if (/^\d{4}-\d{2}-\d{2}T/.test(date)) {
      date = new Date(date);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
      // DD/MM/YYYY
      const [d, m, y] = date.split("/").map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(date);
    }
  }
  if (!(date instanceof Date) || isNaN(date)) return "";
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
}
