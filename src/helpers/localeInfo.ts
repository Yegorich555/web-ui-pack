export class WUPlocaleInfo {
  /** Last pointed locale
   * @defaultValue "" (en-US with custom dateTime format) */
  locale = "";
  /** User's locale */
  localeUser = new Intl.DateTimeFormat().resolvedOptions().locale;
  /** Decimal separator for number 123.4 it's dot */
  sepDecimal = ".";
  /** Thouthands separator for number 1,234.5 it's comma */
  sep1000 = ",";
  /** Date format, example YYYY-MM-DD */
  date = "YYYY-MM-DD";
  /** Time format, example hh:mm:ss a */
  time = "hh:mm:ss a";
  /** Date+Time format, example YYYY-MM-DD hh:mm:ss a */
  dateTime = "YYYY-MM-DD hh:mm:ss a";
  /** First day of week where 1-Monday, 7-Sunday;
   * @tutorial Troubleshooting
   * * detection depeneds on `Intl.Locale.prototype.weekInfo` https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/weekInfo
   * and works from Chrome99 & Safari 15.4 https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/weekInfo#browser_compatibility
   */
  firstWeekDay = 1;

  /** Re-define all values (call it if localization changed or you want to set another locale) */
  refresh(locale?: string): void {
    const cur = new Intl.DateTimeFormat(locale).resolvedOptions();
    if (cur.numberingSystem !== "latn") {
      console.warn(`WUP.LocaleInfo (${cur.locale}). Not latin numbers are not supported. Setup it itself`);
      return;
    }
    localeInfo.locale = cur.locale;
    this.#namesMonth = undefined;
    this.#namesMonthShort = undefined;
    this.#namesDayShort = undefined;
    Object.assign(localeInfo, this.getNumberOptions(locale), this.getDateFormat(locale));

    try {
      /* istanbul ignore else */
      if (Intl.Locale) {
        // watchfix related issue: https://github.com/tc39/ecma402/issues/6
        const firstDay = (new Intl.Locale(cur.locale) as any).weekInfo?.firstDay;
        /* istanbul ignore else */
        if (firstDay) {
          this.firstWeekDay = firstDay;
        }
      }
    } catch (error) {
      /* istanbul ignore next */
      console.error(error);
    }
  }

  /** Returns number format according to pointed locale or (user-locale if pointed undefined) */
  getNumberOptions(locale?: string): { sepDecimal: string; sep1000: string } {
    const s = (1234.5).toLocaleString(locale); // '1,234.5'

    let sep1000: string;
    for (let i = 1; ; ++i) {
      const ascii = s.charCodeAt(i);
      if (ascii >= 48 && ascii <= 57) {
        sep1000 = s.substring(1, i);
        break;
      }
    }

    let sepDecimal: string;
    for (let i = s.length - 2; ; --i) {
      const ascii = s.charCodeAt(i);
      if (ascii >= 48 && ascii <= 57) {
        sepDecimal = s.substring(i + 1, s.length - 1);
        break;
      }
    }

    // WARN: this method slower
    // const arr = new Intl.NumberFormat().formatToParts(1234.5);
    // sep1000 = arr[1].value;
    // sepDecimal = arr[3].value;

    return { sep1000, sepDecimal };
  }

  /** Returns date-time formats according to pointed locale or (user-locale if pointed undefined) */
  getDateFormat(locale?: string): { date: string; time: string; dateTime: string } {
    // "1/3/2222, 4:05:06 AM";
    const s = new Date(2222, 0, 3, 4, 5, 6).toLocaleString(locale).replace(/AM|am/, "a");
    // const s = "4:05:06 AM, 1/3/2222".replace(/AM|am/, "a");
    let dateTime = "";
    let endDate = 0;
    let endTime = 0;
    for (let i = 0, inc = 0; i < s.length; ++i) {
      const c = s.charCodeAt(i) - 48;
      let canAdd = true;
      const isDate = c > 0 && c < 4;
      if (isDate) {
        endDate = i;
      } else if (c > 3 && c < 7) {
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

    const startDate = /[DMY]/.exec(dateTime)!.index;
    const startTime = /[hms]/.exec(dateTime)!.index;

    const r = {
      date: dateTime.substring(startDate, endDate + 1),
      time: dateTime.substring(startTime, endTime + 1),
      dateTime,
    };
    return r;
  }

  private getDateNames(opts: Intl.DateTimeFormatOptions): string[] {
    const arr: string[] = [];
    const f = new Intl.DateTimeFormat(this.locale || "en-US", opts);
    const dt = new Date(2022, 0, 1);
    for (let i = 0; i < 12; ++i) {
      dt.setMonth(i);
      arr.push(f.format(dt));
    }
    return arr;
  }

  #namesMonth?: string[];
  /** Names of months: [ "January", "February", "March", ...] */
  get namesMonth(): string[] {
    if (this.#namesMonth) {
      return this.#namesMonth;
    }
    return this.getDateNames({ month: "long" });
  }

  set namesMonth(v: string[] | undefined) {
    this.#namesMonth = v;
  }

  #namesMonthShort?: string[];
  /** Short names of months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] */
  get namesMonthShort(): string[] {
    if (this.#namesMonthShort) {
      return this.#namesMonthShort;
    }
    return this.getDateNames({ month: "short" });
  }

  set namesMonthShort(v: string[] | undefined) {
    this.#namesMonthShort = v;
  }

  #namesDayShort?: string[] = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  /** Short names of days (starts with Monday): ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] */
  get namesDayShort(): string[] {
    if (this.#namesDayShort) {
      return this.#namesDayShort;
    }
    const arr: string[] = [];
    const f = new Intl.DateTimeFormat(this.locale || "en-US", { weekday: "short" });
    const dt = new Date(2022, 7, 1);
    for (let i = 1; i < 8; ++i) {
      dt.setDate(i);
      arr.push(f.format(dt));
    }
    return arr;
  }

  set namesDayShort(v: string[] | undefined) {
    this.#namesDayShort = v;
  }
}

/** Locale-object with definitions related to user-locale; call localeInfo.refresh() to update according to userLocale
 *  @defaultValue 'en-US' with custom dateTime format;
 * @tutorial Troubleshooting
 * * in JS impossible to define whether user-settings is different from user-locale
 * * there is no way to define firstWeekDay for calendar
 * * you can redefine/set any property if somehow it locale-definitions don't fit your expectations */
const localeInfo = new WUPlocaleInfo();

// localeInfo.refresh("en-US");
export default localeInfo;

// localeInfo.refresh("ru-RU");
// localeInfo.refresh("ar-AE");
// const s =
//   "af-ZA am-ET ar-AE ar-BH ar-DZ ar-EG ar-IQ ar-JO ar-KW ar-LB ar-LY ar-MA arn-CL ar-OM ar-QA ar-SA ar-SD ar-SY ar-TN ar-YE as-IN az-az az-Cyrl-AZ az-Latn-AZ ba-RU be-BY bg-BG bn-BD bn-IN bo-CN br-FR bs-Cyrl-BA bs-Latn-BA ca-ES co-FR cs-CZ cy-GB da-DK de-AT de-CH de-DE de-LI de-LU dsb-DE dv-MV el-CY el-GR en-029 en-AU en-BZ en-CA en-cb en-GB en-IE en-IN en-JM en-MT en-MY en-NZ en-PH en-SG en-TT en-US en-ZA en-ZW es-AR es-BO es-CL es-CO es-CR es-DO es-EC es-ES es-GT es-HN es-MX es-NI es-PA es-PE es-PR es-PY es-SV es-US es-UY es-VE et-EE eu-ES fa-IR fi-FI fil-PH fo-FO fr-BE fr-CA fr-CH fr-FR fr-LU fr-MC fy-NL ga-IE gd-GB gd-ie gl-ES gsw-FR gu-IN ha-Latn-NG he-IL hi-IN hr-BA hr-HR hsb-DE hu-HU hy-AM id-ID ig-NG ii-CN in-ID is-IS it-CH it-IT iu-Cans-CA iu-Latn-CA iw-IL ja-JP ka-GE kk-KZ kl-GL km-KH kn-IN kok-IN ko-KR ky-KG lb-LU lo-LA lt-LT lv-LV mi-NZ mk-MK ml-IN mn-MN mn-Mong-CN moh-CA mr-IN ms-BN ms-MY mt-MT nb-NO ne-NP nl-BE nl-NL nn-NO no-no nso-ZA oc-FR or-IN pa-IN pl-PL prs-AF ps-AF pt-BR pt-PT qut-GT quz-BO quz-EC quz-PE rm-CH ro-mo ro-RO ru-mo ru-RU rw-RW sah-RU sa-IN se-FI se-NO se-SE si-LK sk-SK sl-SI sma-NO sma-SE smj-NO smj-SE smn-FI sms-FI sq-AL sr-BA sr-CS sr-Cyrl-BA sr-Cyrl-CS sr-Cyrl-ME sr-Cyrl-RS sr-Latn-BA sr-Latn-CS sr-Latn-ME sr-Latn-RS sr-ME sr-RS sr-sp sv-FI sv-SE sw-KE syr-SY ta-IN te-IN tg-Cyrl-TJ th-TH tk-TM tlh-QS tn-ZA tr-TR tt-RU tzm-Latn-DZ ug-CN uk-UA ur-PK uz-Cyrl-UZ uz-Latn-UZ uz-uz vi-VN wo-SN xh-ZA yo-NG zh-CN zh-HK zh-MO zh-SG zh-TW zu-ZA";
// s.split(" ").forEach((l) => {
//   localeInfo.refresh(l);
//   console.warn(localeInfo.namesDayShort);
//   // console.warn(localeInfo.namesMonth);
//   // console.warn(localeInfo.namesMonthShort);
// });
