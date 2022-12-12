/** Returns number format according to user-locale */
export function getNumberLocale(): { sepDecimal: string; sep1000: string } {
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

/** Returns date-time formats according to user-locale */
export function getDateLocale(): { date: string; time: string; dateTime: string } {
  // "1/3/2222, 4:05:06 AM";
  const s = new Date(2222, 0, 3, 4, 5, 6).toLocaleString().replace(/AM|am/, "a");
  // const s = "4:05:06 AM, 1/3/2222".replace(/AM|am/, "a");
  let dateTime = "";
  let startDate: number | null = null;
  let endDate = 0;
  let startTime: number | null = null;
  let endTime = 0;
  for (let i = 0, inc = 0; i < s.length; ++i) {
    const c = s.charCodeAt(i) - 48;
    let canAdd = true;
    const isDate = c > 0 && c < 4;
    if (isDate) {
      if (startDate === null) {
        startDate = i;
      }
      endDate = i;
    } else if (c > 3 && c < 7) {
      if (startTime === null) {
        startTime = i;
      }
      endTime = i;
    }
    switch (c) {
      case 2:
        dateTime += "Y";
        break;
      case 1:
        dateTime += "M";
        break;
      case 3:
        dateTime += "D";
        break;
      case 4:
        dateTime += "h";
        break;
      case 5:
        dateTime += "m";
        break;
      case 6:
        dateTime += "s";
        break;
      case 49: // char a
        dateTime += s[i];
        endTime = i;
        break;
      case 0:
        ++inc;
        canAdd = false;
        break;
      default:
        dateTime += s[i];
        canAdd = false;
        break;
    }
    if (canAdd && inc) {
      dateTime += dateTime[dateTime.length - 1].repeat(inc);
      inc = 0;
    }
  }

  const r = {
    date: dateTime.substring(startDate!, endDate + 1),
    time: dateTime.substring(startTime!, endTime + 1),
    dateTime,
  };
  return r;
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
  date: "yyyy-MM-dd",
  /** Time format, example hh:mm:ss.fff a */
  time: "hh:mm:ss.fff a",
  /** Date time format, example yyyy-MM-dd hh:mm:ss.fff a */
  dateTime: "yyyy-MM-dd",
  /** Re-define all values (call it if localization changed) */
  refresh: () => {
    Object.assign(locale, getNumberLocale(), getDateLocale());
  },
};
locale.refresh();

export default locale;

// Intl.NumberFormat("en-US", {
//   style: "currency",
//   currency: "USD",
//   maximumFractionDigits: 0,
//   minimumFractionDigits: 0,
// }).format(1234.5); '$1,234.50'

// new Date(2222, 0, 3).toLocaleDateString(); // '1/3/2222'
// (1234.5).toLocaleString(); // '1,234.5'

// todo cover with tests
