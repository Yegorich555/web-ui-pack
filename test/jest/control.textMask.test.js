import WUPTextControl from "../../src/controls/text";
import * as h from "../testHelper";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("control.text: mask", () => {
  test("0000-00-00 (dateMask yyyy-MM-dd)", async () => {
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

    // tests with input
    const el = document.createElement("wup-text");
    el.$options.mask = "0000-00-00";
    el.$options.maskholder = "yyyy-mm-dd";
    document.body.appendChild(el);
    await h.wait();
    el.focus();
    await h.wait(1);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="wup1"><span><span aria-hidden="true" maskholder=""><i></i>yyyy-mm-dd</span><input placeholder=" " type="text" id="wup1" autocomplete="off"><strong></strong></span><button clear="" aria-hidden="true" tabindex="-1"></button></label>"`
    );

    el.testMe = true;
    const typeText = [
      // todo check also carret position
      { $in: "1", $out: "1", $outN: "1", h: "<i>1</i>yyy-mm-dd", hN: "<i>1</i>yyy-mm-dd" },
      { $in: "a", $out: "1a", $outN: "1", h: "<i>1a</i>yy-mm-dd", hN: "<i>1</i>yyy-mm-dd" },
      { $in: "2", $out: "12", $outN: "12", h: "<i>12</i>yy-mm-dd", hN: "<i>12</i>yy-mm-dd" },
      { $in: "3", $out: "123", $outN: "123", h: "<i>123</i>y-mm-dd", hN: "<i>123</i>y-mm-dd" },
      { $in: "b", $out: "123b", $outN: "123", h: "<i>123b</i>-mm-dd", hN: "<i>123</i>y-mm-dd" },
      { $in: "4", $out: "1234-", $outN: "1234-", h: "<i>1234-</i>mm-dd", hN: "<i>1234-</i>mm-dd" }, // prediction mode
      { $in: "5", $out: "1234-5", $outN: "1234-5", h: "<i>1234-5</i>m-dd", hN: "<i>1234-5</i>m-dd" },
      { $in: " ", $out: "1234-05-", $outN: "1234-05-", h: "<i>1234-05-</i>dd", hN: "<i>1234-05-</i>dd" }, // lazy mode + prediction
      { $in: "6", $out: "1234-05-6", $outN: "1234-05-6", h: "<i>1234-05-6</i>d", hN: "<i>1234-05-6</i>d" }, // lazy mode + prediction
      { $in: "abcd", $out: "1234-05-6abcd", $outN: "1234-05-6", h: "<i>1234-05-6abcd</i>", hN: "<i>1234-05-6</i>d" },
      { $in: " ", $out: "1234-05-06", $outN: "1234-05-06", h: "<i>1234-05-06</i>", hN: "<i>1234-05-06</i>" }, // lazy mode + prediction
    ];
    for (let i = 0; i < typeText.length; ++i) {
      const s = typeText[i];
      await h.userTypeText(el.$refInput, s.$in, { clearPrevious: false });
      expect(el.$refInput.value).toBe(s.$out);
      expect(`${s.$in}: ${el.$refMaskholder.innerHTML}`).toBe(`${s.$in}: ${s.h}`);
      await h.wait(150); // when user types invalid char it shows and hides after a time
      expect(el.$refInput.value).toBe(s.$outN);
      expect(`${s.$in}: ${el.$refMaskholder.innerHTML}`).toBe(`${s.$in}: ${s.hN}`);
    }

    // todo test ability to remove previous
    // todo check with optional number
    // todo check when user tries to remove or type in the middle of text
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
