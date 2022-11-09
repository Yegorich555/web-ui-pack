import WUPTextControl from "../../src/controls/text";

describe("control.text: mask", () => {
  test("0000-00-00 (dateMask yyyy-MM-dd)", () => {
    const proc = (v, opts) => WUPTextControl.prototype.maskProcess(v, "0000-00-00", opts);
    expect(proc("12")).toBe("12");
    expect(proc("12345")).toBe("1234-5");
    expect(proc("12345678")).toBe("1234-56-78");
    expect(proc("123456789")).toBe("1234-56-78");
    expect(proc("1234-")).toBe("1234-");
    expect(proc("1234-5")).toBe("1234-5");
    expect(proc("1234-56-7")).toBe("1234-56-7");
    expect(proc("1234-56-78")).toBe("1234-56-78");
    expect(proc("1234 56 78")).toBe("1234-56-78");
    expect(proc("1234-56-789")).toBe("1234-56-78");
    expect(proc("2000-01-01")).toBe("2000-01-01");
    expect(proc("0000-00-00")).toBe("0000-00-00");

    expect(proc("1234-W")).toBe("1234-");
    expect(proc("1absd234-56-78")).toBe("1");

    expect(proc("1234")).toBe("1234-");
    expect(proc("1234", { prediction: false })).toBe("1234");
    expect(proc("1234w")).toBe("1234");
    expect(proc("1234 ")).toBe("1234-");
    expect(proc("1234-")).toBe("1234-");
    expect(proc("1234--")).toBe("1234-");

    // lazy mode
    expect(proc("1-")).toBe("0001-");
    expect(proc("1 ")).toBe("0001-");
    expect(proc("1234-4-")).toBe("1234-04-");
    expect(proc("1234-4 ")).toBe("1234-04-");
    expect(proc("12-")).toBe("0012-");
    expect(proc("12 ")).toBe("0012-");
    expect(proc("1 2 3 ")).toBe("0001-02-03"); // lazy + any not char
  });

  test("0000--0", () => {
    const proc = (v) => WUPTextControl.prototype.maskProcess(v, "0000--0");
    expect(proc("1234--5")).toBe("1234--5");
    expect(proc("1234--5b")).toBe("1234--5");
    expect(proc("12345")).toBe("1234--5");
    expect(proc("1 5")).toBe("0001--5");
  });

  test("##0.##0.##0.##0 (IP addess)", () => {
    const proc = (v, opts) => WUPTextControl.prototype.maskProcess(v, "##0.##0.##0.##0", opts);
    expect(proc("192.168.255.254")).toBe("192.168.255.254");
    expect(proc("1.2.3.4")).toBe("1.2.3.4");
    expect(proc("1.")).toBe("1.");
    expect(proc("192.")).toBe("192.");
    expect(proc("192")).toBe("192.");
    expect(proc("192", { prediction: false })).toBe("192");
    expect(proc("192 ")).toBe("192.");

    // lazy mode
    expect(proc("192.16 ")).toBe("192.16.");
    expect(proc("192.16. ")).toBe("192.16.");
    expect(proc("192.16.0 ")).toBe("192.16.0.");
    expect(proc("192.16.0  ")).toBe("192.16.0.");
    expect(proc("192 168 255 254")).toBe("192.168.255.254");
    expect(proc("1 2 3 4")).toBe("1.2.3.4");
  });

  test("+1(000) 000-0000", () => {
    const proc = (v, opts) => WUPTextControl.prototype.maskProcess(v, "+1(000) 000-0000", opts);
    expect(proc("+1(234) 975-1234")).toBe("+1(234) 975-1234");
    expect(proc("2")).toBe("+1(2");
    expect(proc("23")).toBe("+1(23");
    expect(proc("234")).toBe("+1(234) ");
    expect(proc("234", { prediction: false })).toBe("+1(234");
    expect(proc("+1(234)9")).toBe("+1(234) 9");
    expect(proc("12349751234")).toBe("+1(234) 975-1234");
  });

  test("$ #####0 USD", () => {
    const proc = (v) => WUPTextControl.prototype.maskProcess(v, "$ #####0 USD");
    expect(proc("$ 123456 USD")).toBe("$ 123456 USD");
    expect(proc("$ 123450 USD")).toBe("$ 123450 USD");
    expect(proc("$ 50 USD")).toBe("$ 50 USD");
    expect(proc("$ 123456789")).toBe("$ 123456 USD");
    expect(proc("")).toBe("");

    // WARN: suffix works only with option prediction, but possible without it
    expect(proc("$ 5")).toBe("$ 5 USD");
    expect(proc("5")).toBe("$ 5 USD");
    expect(proc("$ 5 US")).toBe("$ 5 USD"); // WARN: in this case input must control caret position and don't allow to remove prefix/suffix
  });

  // todo test("### ### ### ### ##0.## - currency with delimiters", () => {
  // need to define maskForCurrency with local-decimal-delimiter
  // })
});
