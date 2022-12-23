// import localeInfo from "../../src/helpers/localeInfo";
import localeInfo from "web-ui-pack/helpers/localeInfo";
import * as h from "../../testHelper";

describe("helper.localeInfo", () => {
  test("defaults", () => {
    // WARN: it's important to check default before localeInfo.refresh happened in other tests
    expect(localeInfo).toMatchInlineSnapshot(`
      WUPlocaleInfo {
        "date": "YYYY-MM-DD",
        "dateTime": "YYYY-MM-DD hh:mm:ss a",
        "locale": "",
        "localeUser": "en-US",
        "sep1000": ",",
        "sepDecimal": ".",
        "time": "hh:mm:ss a",
      }
    `);
    expect(localeInfo.namesDayShort).toEqual(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
    expect(localeInfo.namesMonth).toEqual([
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]);
    expect(localeInfo.namesMonthShort).toEqual([
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]);

    // for coverage
    localeInfo.locale = "";
    localeInfo.namesDayShort = undefined;
    expect(localeInfo.namesDayShort).toBeDefined();
  });

  test("day short names", () => {
    localeInfo.namesDayShort = ["1", "2", "3", "4", "5", "6", "7"];
    expect(localeInfo.namesDayShort).toEqual(["1", "2", "3", "4", "5", "6", "7"]);

    localeInfo.refresh("en-US");
    expect(localeInfo.namesDayShort).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

    localeInfo.refresh("ru-RU");
    expect(localeInfo.namesDayShort).toEqual(["пн", "вт", "ср", "чт", "пт", "сб", "вс"]);

    localeInfo.refresh("pl-PL");
    expect(localeInfo.namesDayShort).toEqual(["pon.", "wt.", "śr.", "czw.", "pt.", "sob.", "niedz."]);
  });

  test("month names", () => {
    localeInfo.namesMonth = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
    expect(localeInfo.namesMonth).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);

    localeInfo.refresh("en-US");
    expect(localeInfo.namesMonth).toMatchInlineSnapshot(`
      [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ]
    `);

    localeInfo.refresh("ru-RU");
    expect(localeInfo.namesMonth).toMatchInlineSnapshot(`
      [
        "январь",
        "февраль",
        "март",
        "апрель",
        "май",
        "июнь",
        "июль",
        "август",
        "сентябрь",
        "октябрь",
        "ноябрь",
        "декабрь",
      ]
    `);

    localeInfo.refresh("pl-PL");
    expect(localeInfo.namesMonth).toMatchInlineSnapshot(`
      [
        "styczeń",
        "luty",
        "marzec",
        "kwiecień",
        "maj",
        "czerwiec",
        "lipiec",
        "sierpień",
        "wrzesień",
        "październik",
        "listopad",
        "grudzień",
      ]
    `);
  });

  test("month short names", () => {
    localeInfo.namesMonthShort = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
    expect(localeInfo.namesMonthShort).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);

    localeInfo.refresh("en-US");
    expect(localeInfo.namesMonthShort).toMatchInlineSnapshot(`
      [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ]
    `);

    localeInfo.refresh("ru-RU");
    expect(localeInfo.namesMonthShort).toMatchInlineSnapshot(`
      [
        "янв.",
        "февр.",
        "март",
        "апр.",
        "май",
        "июнь",
        "июль",
        "авг.",
        "сент.",
        "окт.",
        "нояб.",
        "дек.",
      ]
    `);

    localeInfo.refresh("pl-PL");
    expect(localeInfo.namesMonthShort).toMatchInlineSnapshot(`
      [
        "sty",
        "lut",
        "mar",
        "kwi",
        "maj",
        "cze",
        "lip",
        "sie",
        "wrz",
        "paź",
        "lis",
        "gru",
      ]
    `);
  });

  test("number format", () => {
    expect((1234.5).toLocaleString("en-US")).toBe("1,234.5");
    localeInfo.refresh("en-US");
    expect(localeInfo.locale).toBe("en-US");
    expect(localeInfo.sepDecimal).toBe(".");
    expect(localeInfo.sep1000).toBe(",");

    expect((1234.5).toLocaleString("ru-RU")).toBe("1\u00A0234,5");
    localeInfo.refresh("ru-RU");
    expect(localeInfo.locale).toBe("ru-RU");
    expect(localeInfo.sepDecimal).toBe(",");
    expect(localeInfo.sep1000).toBe("\u00A0"); // 160 code (Non-breaking space; &nbsp;)

    expect((1234.5).toLocaleString("pl-PL")).toBe("1234,5");
    localeInfo.refresh("pl-PL");
    expect(localeInfo.locale).toBe("pl-PL");
    expect(localeInfo.sepDecimal).toBe(",");
    expect(localeInfo.sep1000).toBe(""); // empty
  });

  test("date & time format", () => {
    expect(new Date(2222, 0, 3, 4, 5, 6).toLocaleString("en-US")).toBe("1/3/2222, 4:05:06 AM");
    localeInfo.refresh("en-US");
    expect(localeInfo.date).toBe("M/D/YYYY");
    expect(localeInfo.time).toBe("h:mm:ss a");
    expect(localeInfo.dateTime).toBe("M/D/YYYY, h:mm:ss a");

    expect(new Date(2222, 0, 3, 4, 5, 6).toLocaleString("ru-RU")).toBe("03.01.2222, 04:05:06");
    localeInfo.refresh("ru-RU");
    expect(localeInfo.date).toBe("DD.MM.YYYY");
    expect(localeInfo.time).toBe("hh:mm:ss");
    expect(localeInfo.dateTime).toBe("DD.MM.YYYY, hh:mm:ss");

    expect(new Date(2222, 0, 3, 4, 5, 6).toLocaleString("pl-PL")).toBe("3.01.2222, 04:05:06");
    localeInfo.refresh("pl-PL");
    expect(localeInfo.date).toBe("D.MM.YYYY");
    expect(localeInfo.time).toBe("hh:mm:ss");
    expect(localeInfo.dateTime).toBe("D.MM.YYYY, hh:mm:ss");
  });

  test("all locales", () => {
    // expect(new Intl.DateTimeFormat("ar-BH").resolvedOptions().numberingSystem).not.toBe("latn");
    h.mockConsoleWarn();
    const s =
      "af-ZA am-ET ar-AE ar-BH ar-DZ ar-EG ar-IQ ar-JO ar-KW ar-LB ar-LY ar-MA arn-CL ar-OM ar-QA ar-SA ar-SD ar-SY ar-TN ar-YE as-IN az-az az-Cyrl-AZ az-Latn-AZ ba-RU be-BY bg-BG bn-BD bn-IN bo-CN br-FR bs-Cyrl-BA bs-Latn-BA ca-ES co-FR cs-CZ cy-GB da-DK de-AT de-CH de-DE de-LI de-LU dsb-DE dv-MV el-CY el-GR en-029 en-AU en-BZ en-CA en-cb en-GB en-IE en-IN en-JM en-MT en-MY en-NZ en-PH en-SG en-TT en-US en-ZA en-ZW es-AR es-BO es-CL es-CO es-CR es-DO es-EC es-ES es-GT es-HN es-MX es-NI es-PA es-PE es-PR es-PY es-SV es-US es-UY es-VE et-EE eu-ES fa-IR fi-FI fil-PH fo-FO fr-BE fr-CA fr-CH fr-FR fr-LU fr-MC fy-NL ga-IE gd-GB gd-ie gl-ES gsw-FR gu-IN ha-Latn-NG he-IL hi-IN hr-BA hr-HR hsb-DE hu-HU hy-AM id-ID ig-NG ii-CN in-ID is-IS it-CH it-IT iu-Cans-CA iu-Latn-CA iw-IL ja-JP ka-GE kk-KZ kl-GL km-KH kn-IN kok-IN ko-KR ky-KG lb-LU lo-LA lt-LT lv-LV mi-NZ mk-MK ml-IN mn-MN mn-Mong-CN moh-CA mr-IN ms-BN ms-MY mt-MT nb-NO ne-NP nl-BE nl-NL nn-NO no-no nso-ZA oc-FR or-IN pa-IN pl-PL prs-AF ps-AF pt-BR pt-PT qut-GT quz-BO quz-EC quz-PE rm-CH ro-mo ro-RO ru-mo ru-RU rw-RW sah-RU sa-IN se-FI se-NO se-SE si-LK sk-SK sl-SI sma-NO sma-SE smj-NO smj-SE smn-FI sms-FI sq-AL sr-BA sr-CS sr-Cyrl-BA sr-Cyrl-CS sr-Cyrl-ME sr-Cyrl-RS sr-Latn-BA sr-Latn-CS sr-Latn-ME sr-Latn-RS sr-ME sr-RS sr-sp sv-FI sv-SE sw-KE syr-SY ta-IN te-IN tg-Cyrl-TJ th-TH tk-TM tlh-QS tn-ZA tr-TR tt-RU tzm-Latn-DZ ug-CN uk-UA ur-PK uz-Cyrl-UZ uz-Latn-UZ uz-uz vi-VN wo-SN xh-ZA yo-NG zh-CN zh-HK zh-MO zh-SG zh-TW zu-ZA";
    const alls = s.split(" ");
    for (let i = 0; i < alls.length; ++i) {
      // eslint-disable-next-line no-loop-func
      expect(() => localeInfo.refresh(alls[i])).not.toThrow();
    }
    h.unMockConsoleWarn();
  });
});

// const alls =
//   "af-ZA am-ET ar-AE ar-BH ar-DZ ar-EG ar-IQ ar-JO ar-KW ar-LB ar-LY ar-MA arn-CL ar-OM ar-QA ar-SA ar-SD ar-SY ar-TN ar-YE as-IN az-az az-Cyrl-AZ az-Latn-AZ ba-RU be-BY bg-BG bn-BD bn-IN bo-CN br-FR bs-Cyrl-BA bs-Latn-BA ca-ES co-FR cs-CZ cy-GB da-DK de-AT de-CH de-DE de-LI de-LU dsb-DE dv-MV el-CY el-GR en-029 en-AU en-BZ en-CA en-cb en-GB en-IE en-IN en-JM en-MT en-MY en-NZ en-PH en-SG en-TT en-US en-ZA en-ZW es-AR es-BO es-CL es-CO es-CR es-DO es-EC es-ES es-GT es-HN es-MX es-NI es-PA es-PE es-PR es-PY es-SV es-US es-UY es-VE et-EE eu-ES fa-IR fi-FI fil-PH fo-FO fr-BE fr-CA fr-CH fr-FR fr-LU fr-MC fy-NL ga-IE gd-GB gd-ie gl-ES gsw-FR gu-IN ha-Latn-NG he-IL hi-IN hr-BA hr-HR hsb-DE hu-HU hy-AM id-ID ig-NG ii-CN in-ID is-IS it-CH it-IT iu-Cans-CA iu-Latn-CA iw-IL ja-JP ka-GE kk-KZ kl-GL km-KH kn-IN kok-IN ko-KR ky-KG lb-LU lo-LA lt-LT lv-LV mi-NZ mk-MK ml-IN mn-MN mn-Mong-CN moh-CA mr-IN ms-BN ms-MY mt-MT nb-NO ne-NP nl-BE nl-NL nn-NO no-no nso-ZA oc-FR or-IN pa-IN pl-PL prs-AF ps-AF pt-BR pt-PT qut-GT quz-BO quz-EC quz-PE rm-CH ro-mo ro-RO ru-mo ru-RU rw-RW sah-RU sa-IN se-FI se-NO se-SE si-LK sk-SK sl-SI sma-NO sma-SE smj-NO smj-SE smn-FI sms-FI sq-AL sr-BA sr-CS sr-Cyrl-BA sr-Cyrl-CS sr-Cyrl-ME sr-Cyrl-RS sr-Latn-BA sr-Latn-CS sr-Latn-ME sr-Latn-RS sr-ME sr-RS sr-sp sv-FI sv-SE sw-KE syr-SY ta-IN te-IN tg-Cyrl-TJ th-TH tk-TM tlh-QS tn-ZA tr-TR tt-RU tzm-Latn-DZ ug-CN uk-UA ur-PK uz-Cyrl-UZ uz-Latn-UZ uz-uz vi-VN wo-SN xh-ZA yo-NG zh-CN zh-HK zh-MO zh-SG zh-TW zu-ZA";

// alls
//   .split(" ") //
//   .map((l) => new Intl.DateTimeFormat(l).resolvedOptions())
//   .find((l) => {
//     if (l.numberingSystem !== "latn") {
//       console.warn(l);
//       console.log(new Intl.DateTimeFormat(l.locale, {}).format(new Date()));
//     }
//     return false;
//   });

// Intl.NumberFormat("en-US", {
//   style: "currency",
//   currency: "USD",
//   maximumFractionDigits: 0,
//   minimumFractionDigits: 0,
// }).format(1234.5); '$1,234.50'
