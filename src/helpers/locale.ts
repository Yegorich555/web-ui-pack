export function getNumberFormat(): { sepDecimal: string; sep1000: string } {
  const s = (1234.5).toLocaleString();

  let sep1000: string;
  for (let i = 1; ; ++i) {
    const ascii = s.charCodeAt(i);
    if (ascii >= 48 && ascii <= 57) {
      sep1000 = s.substring(1, i);
      break;
    }
  }

  let sepDecimal: string;
  const end = s.length - 2;
  for (let i = s.length - 2; ; --i) {
    const ascii = s.charCodeAt(i);
    if (ascii >= 48 && ascii <= 57) {
      sepDecimal = s.substring(i, end);
      break;
    }
  }

  return { sep1000, sepDecimal };
}

function refresh(): void {
  const r = getNumberFormat();
  Object.assign(locale, r);
}

/** Locale-object with definitions related to user-locale;
 * @tutorial Troubleshooting
 * * in JS impossible to define whether user-settings is different from user-locale
 */
const locale = {
  /** Decimal separator for number 123.4 it's dot */
  sepDecimal: ".",
  /** Thouthands separator for number 1,234.5 it's comma */
  sep1000: ",",
  /** Date format, example yyyy-MM-dd */
  // dateFormat: "yyyy-MM-dd", // todo implement
  /** Re-define all values (call it if localization changed) */
  refresh,
};
export default locale;

// Intl.NumberFormat("en-US", {
//   style: "currency",
//   currency: "USD",
//   maximumFractionDigits: 0,
//   minimumFractionDigits: 0,
// }).format(1234.5); '$1,234.50'

// new Date(2222, 0, 3).toLocaleDateString(); // '1/3/2222'
// (1234.5).toLocaleString(); // '1,234.5'
