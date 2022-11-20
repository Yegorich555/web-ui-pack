// eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-imports
import WUPTextControl from "../../src/controls/text";
import maskInput from "../../src/helpers/maskInput";
// todo change ref to web-ui-pack to coverage

import * as h from "../testHelper";

/** @type WUPTextControl */
let el;
beforeEach(async () => {
  jest.useFakeTimers();
  let lastUniqueNum = 0;
  jest.spyOn(WUPTextControl, "$uniqueId", "get").mockImplementation(() => `txt${++lastUniqueNum}`);

  Element.prototype.scrollIntoView = jest.fn();
  el = document.body.appendChild(document.createElement("wup-text"));
  await h.wait(1); // wait for ready
  el.$refInput.focus();
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
});

describe("control.text: mask", () => {
  test("0000-00-00 (dateMask yyyy-MM-dd)", async () => {
    const mask = "0000-00-00";
    const proc = (v, opts) => maskInput(v, mask, opts).text;
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
    expect(proc("1absd234-56-78")).toBe("1234-56-78");

    expect(proc("1234")).toBe("1234-");
    expect(proc("1234", { prediction: false })).toBe("1234");
    expect(proc("1234w")).toBe("1234-");
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
    el.$options.mask = mask;
    el.$options.maskholder = "yyyy-mm-dd";
    el.focus();
    await h.wait(1);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><span aria-hidden="true" maskholder=""><i></i>yyyy-mm-dd</span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong></strong></span><button clear="" aria-hidden="true" tabindex="-1"></button></label>"`
    );

    const typeText = [
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

    // test ability to remove chars
    expect(el.$refInput.value).toBe("1234-05-06");
    const removeResult = [
      "1234-05-0",
      "1234-05-",
      "1234-0", // removing separator and number
      "1234-",
      "123", // removing separator and number
      "12",
      "1",
      "",
    ];
    for (let i = 0; i < removeResult.length; ++i) {
      await h.userRemove(el.$refInput, 1);
      await h.wait(150);
      expect(el.$refInput.value).toBe(removeResult[i]);
    }

    expect(maskInput("1234-05-06", mask).isCompleted).toBe(true);
    expect(maskInput("1234-05-0", mask).isCompleted).toBe(false);
    expect(maskInput("1234-05-", mask).isCompleted).toBe(false);
    expect(maskInput("1234-05", mask).isCompleted).toBe(false);
    expect(maskInput("1234-0", mask).isCompleted).toBe(false);
    expect(maskInput("1234-", mask).isCompleted).toBe(false);
    expect(maskInput("1234", mask).isCompleted).toBe(false);
    expect(maskInput("1", mask).isCompleted).toBe(false);
    expect(maskInput("", mask).isCompleted).toBe(false);
  });

  test("0000/#0/#0 (dateMask yyyy-M-d)", async () => {
    const mask = "0000/#0/#0";
    const proc = (v, opts) => maskInput(v, mask, opts).text;
    expect(proc("12")).toBe("12");
    expect(proc("12345")).toBe("1234/5");
    expect(proc("12345678")).toBe("1234/56/78");
    expect(proc("123456789")).toBe("1234/56/78");
    expect(proc("1234/")).toBe("1234/");
    expect(proc("1234/5")).toBe("1234/5");
    expect(proc("1234/56/7")).toBe("1234/56/7");
    expect(proc("1234-56-78")).toBe("1234/56/78");
    expect(proc("1234 56 78")).toBe("1234/56/78");
    expect(proc("1234/56/789")).toBe("1234/56/78");
    expect(proc("2000/1/2")).toBe("2000/1/2");

    expect(proc("1234/W")).toBe("1234/");
    expect(proc("1absd234/56/78")).toBe("1234/56/78");

    expect(proc("1234")).toBe("1234/");
    expect(proc("1234", { prediction: false })).toBe("1234");
    expect(proc("1234w")).toBe("1234/");
    expect(proc("1234 ")).toBe("1234/");
    expect(proc("1234/")).toBe("1234/");
    expect(proc("1234//")).toBe("1234/");

    // lazy mode
    expect(proc("1/")).toBe("0001/");
    expect(proc("1 ")).toBe("0001/");
    expect(proc("1234/4/")).toBe("1234/4/");
    expect(proc("1234/04/ ")).toBe("1234/04/");
    expect(proc("12/")).toBe("0012/");
    expect(proc("12 ")).toBe("0012/");
    expect(proc("1 2 3 ")).toBe("0001/2/3"); // lazy + any not char

    // tests with input
    el.$options.mask = mask;
    el.$options.maskholder = "yyyy/mm/dd";
    el.focus();
    await h.wait(1);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><span aria-hidden="true" maskholder=""><i></i>yyyy/mm/dd</span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong></strong></span><button clear="" aria-hidden="true" tabindex="-1"></button></label>"`
    );

    const typeText = [
      { $in: "1", $out: "1", $outN: "1", h: "<i>1</i>yyy/mm/dd", hN: "<i>1</i>yyy/mm/dd" },
      { $in: "a", $out: "1a", $outN: "1", h: "<i>1a</i>yy/mm/dd", hN: "<i>1</i>yyy/mm/dd" },
      { $in: "2", $out: "12", $outN: "12", h: "<i>12</i>yy/mm/dd", hN: "<i>12</i>yy/mm/dd" },
      { $in: "3", $out: "123", $outN: "123", h: "<i>123</i>y/mm/dd", hN: "<i>123</i>y/mm/dd" },
      { $in: "b", $out: "123b", $outN: "123", h: "<i>123b</i>/mm/dd", hN: "<i>123</i>y/mm/dd" },
      { $in: "4", $out: "1234/", $outN: "1234/", h: "<i>1234/</i>mm/dd", hN: "<i>1234/</i>mm/dd" }, // prediction mode
      { $in: "5", $out: "1234/5", $outN: "1234/5", h: "<i>1234/5</i>m/dd", hN: "<i>1234/5</i>m/dd" },
      { $in: " ", $out: "1234/5/", $outN: "1234/5/", h: "<i>1234/5/</i>dd", hN: "<i>1234/5/</i>dd" }, // lazy mode + prediction
      { $in: "6", $out: "1234/5/6", $outN: "1234/5/6", h: "<i>1234/5/6</i>d", hN: "<i>1234/5/6</i>d" }, // lazy mode + prediction
      { $in: "abcd", $out: "1234/5/6abcd", $outN: "1234/5/6", h: "<i>1234/5/6abcd</i>", hN: "<i>1234/5/6</i>d" },
      { $in: " ", $out: "1234/5/6 ", $outN: "1234/5/6", h: "<i>1234/5/6 </i>", hN: "<i>1234/5/6</i>d" }, // lazy mode + prediction
    ];
    for (let i = 0; i < typeText.length; ++i) {
      const s = typeText[i];
      await h.userTypeText(el.$refInput, s.$in, { clearPrevious: false });
      expect(el.$refInput.value).toBe(s.$out);
      expect(`${s.$in}: ${el.$refMaskholder.innerHTML}`).toBe(`${s.$in}: ${s.h}`);
      await h.wait(150); // when user types invalid char it shows and hides after a time
      expect(el.$refInput.value).toBe(s.$outN);
      expect(`${s.$in}: ${el.$refMaskholder.innerHTML}`).toBe(`${s.$in}: ${s.hN}`);

      expect(el.$refInput.selectionStart).toBe(el.$refInput.value.length);
      expect(el.$refInput.selectionEnd).toBe(el.$refInput.selectionStart);
    }

    // append wrong chars when cursor in the middle
    el.$refInput.value = "1234/56/78";
    h.setInputCursor(el.$refInput, "1|234/56/78");
    await h.userTypeText(el.$refInput, "ab", { clearPrevious: false });
    expect(h.getInputCursor(el.$refInput)).toBe("1ab|234/56/78");
    await h.wait(150); // when user types invalid char it shows and hides after a time
    expect(h.getInputCursor(el.$refInput)).toBe("1|234/56/78");

    el.$refInput.value = "123";
    h.setInputCursor(el.$refInput, "|123");
    await h.userTypeText(el.$refInput, "ab", { clearPrevious: false });
    expect(h.getInputCursor(el.$refInput)).toBe("ab|123");
    await h.wait(150); // when user types invalid char it shows and hides after a time
    expect(h.getInputCursor(el.$refInput)).toBe("|123");

    expect(maskInput("1234/05/06", mask).isCompleted).toBe(true);
    expect(maskInput("1234/5/6", mask).isCompleted).toBe(true);
    expect(maskInput("1234/5/0", mask).isCompleted).toBe(true);
    expect(maskInput("1234/05/", mask).isCompleted).toBe(false);
    expect(maskInput("1234/5", mask).isCompleted).toBe(false);
    expect(maskInput("1234/0", mask).isCompleted).toBe(false);
    expect(maskInput("1234/", mask).isCompleted).toBe(false);
    expect(maskInput("1234", mask).isCompleted).toBe(false);
    expect(maskInput("1", mask).isCompleted).toBe(false);
    expect(maskInput("", mask).isCompleted).toBe(false);
  });

  test("0000--0", () => {
    const mask = "0000--0";
    const proc = (v) => maskInput(v, mask).text;
    expect(proc("1234--5")).toBe("1234--5");
    expect(proc("1234--5b")).toBe("1234--5");
    expect(proc("12345")).toBe("1234--5");
    expect(proc("1 5")).toBe("0001--5");
  });

  test("##0.##0.##0.##0 (IP addess)", async () => {
    const mask = "##0.##0.##0.##0";
    const proc = (v, opts) => maskInput(v, mask, opts).text;
    expect(proc("192.168.255.254")).toBe("192.168.255.254");
    expect(proc("1.2.3.4")).toBe("1.2.3.4");
    expect(proc("1.")).toBe("1.");
    expect(proc("192.")).toBe("192.");
    expect(proc("192")).toBe("192.");
    expect(proc("192", { prediction: false })).toBe("192");
    expect(proc("192 ")).toBe("192.");
    expect(proc(".")).toBe("");

    // lazy mode
    expect(proc("192.16 ")).toBe("192.16.");
    expect(proc("192.16. ")).toBe("192.16.");
    expect(proc("192.16.0 ")).toBe("192.16.0.");
    expect(proc("192.16.0  ")).toBe("192.16.0.");
    expect(proc("192 168 255 254")).toBe("192.168.255.254");
    expect(proc("1 2 3 4")).toBe("1.2.3.4");
    expect(proc("1")).toBe("1");
    expect(proc("123")).toBe("123.");
    expect(proc("1 ")).toBe("1.");

    expect(maskInput("255.255.123.233", mask).isCompleted).toBe(true);
    expect(maskInput("1.2.3.4", mask).isCompleted).toBe(true);
    expect(maskInput("255.255.123.2", mask).isCompleted).toBe(true);
    expect(maskInput("255.255.123.", mask).isCompleted).toBe(false);

    expect(maskInput("255.255.123.233", mask).leftLength).toBe(0);
    expect(maskInput("255.255.123.", mask).leftLength).toBe(3);
    expect(maskInput("255.255.1.", mask).leftLength).toBe(3);
    expect(maskInput("255.2.1.", mask).leftLength).toBe(3);
    expect(maskInput("3.2.1.", mask).leftLength).toBe(3);
    expect(maskInput("3.2.1.2", mask).leftLength).toBe(2);
    expect(maskInput("3.2.1.21", mask).leftLength).toBe(1);
    expect(maskInput("3.2.1.210", mask).leftLength).toBe(0);
    expect(maskInput("1", mask).leftLength).toBe(mask.length - 1);
    expect(maskInput("12", mask).leftLength).toBe(mask.length - 2);
    expect(maskInput("123", mask).leftLength).toBe(mask.length - 4); // because . appended

    // tests with input
    el.$options.mask = mask;
    el.$options.maskholder = "xxx.xxx.xxx.xxx";
    el.focus();
    await h.wait(1);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><span aria-hidden="true" maskholder=""><i></i>xxx.xxx.xxx.xxx</span><input placeholder=" " type="text" id="txt1" autocomplete="off"><strong></strong></span><button clear="" aria-hidden="true" tabindex="-1"></button></label>"`
    );

    const typeText = [
      { $in: "1", $out: "1", $outN: "1", h: "<i>1</i>xx.xxx.xxx.xxx", hN: "<i>1</i>xx.xxx.xxx.xxx" },
      { $in: "a", $out: "1a", $outN: "1", h: "<i>1a</i>x.xxx.xxx.xxx", hN: "<i>1</i>xx.xxx.xxx.xxx" },
      { $in: "2", $out: "12", $outN: "12", h: "<i>12</i>x.xxx.xxx.xxx", hN: "<i>12</i>x.xxx.xxx.xxx" },
      { $in: "3", $out: "123.", $outN: "123.", h: "<i>123.</i>xxx.xxx.xxx", hN: "<i>123.</i>xxx.xxx.xxx" }, // prediction mode
      { $in: "4", $out: "123.4", $outN: "123.4", h: "<i>123.4</i>xx.xxx.xxx", hN: "<i>123.4</i>xx.xxx.xxx" },
      { $in: " ", $out: "123.4.", $outN: "123.4.", h: "<i>123.4.</i>xxx.xxx", hN: "<i>123.4.</i>xxx.xxx" }, // lazy mode + prediction
      { $in: "5", $out: "123.4.5", $outN: "123.4.5", h: "<i>123.4.5</i>xx.xxx", hN: "<i>123.4.5</i>xx.xxx" },
      { $in: ".", $out: "123.4.5.", $outN: "123.4.5.", h: "<i>123.4.5.</i>xxx", hN: "<i>123.4.5.</i>xxx" },
      { $in: "abcd", $out: "123.4.5.abcd", $outN: "123.4.5.", h: "<i>123.4.5.abcd</i>", hN: "<i>123.4.5.</i>xxx" },
      { $in: "6 ", $out: "123.4.5.6 ", $outN: "123.4.5.6", h: "<i>123.4.5.6 </i>x", hN: "<i>123.4.5.6</i>xx" },
    ];
    for (let i = 0; i < typeText.length; ++i) {
      const s = typeText[i];
      await h.userTypeText(el.$refInput, s.$in, { clearPrevious: false });
      expect(el.$refInput.value).toBe(s.$out);
      expect(`${s.$in}: ${el.$refMaskholder.innerHTML}`).toBe(`${s.$in}: ${s.h}`);
      await h.wait(150); // when user types invalid char it shows and hides after a time
      expect(el.$refInput.value).toBe(s.$outN);
      expect(`${s.$in}: ${el.$refMaskholder.innerHTML}`).toBe(`${s.$in}: ${s.hN}`);

      expect(el.$refInput.selectionStart).toBe(el.$refInput.value.length);
      expect(el.$refInput.selectionEnd).toBe(el.$refInput.selectionStart);
    }

    // test ability to remove chars
    expect(el.$refInput.value).toBe("123.4.5.6");
    const removeResult = [
      "123.4.5.", //
      "123.4.",
      "123.",
      "12",
      "1",
      "",
    ];
    for (let i = 0; i < removeResult.length; ++i) {
      await h.userRemove(el.$refInput, 1);
      await h.wait(150);
      expect(el.$refInput.value).toBe(removeResult[i]);
    }
  });

  test("+1(000) 000-0000", async () => {
    const mask = "+1(000) 000-0000";
    const proc = (v, opts) => maskInput(v, mask, opts).text;
    expect(proc("+1(234) 975-1234")).toBe("+1(234) 975-1234");
    expect(proc("2")).toBe("+1(2");
    expect(proc("23")).toBe("+1(23");
    expect(proc("234")).toBe("+1(234) ");
    expect(proc("234", { prediction: false })).toBe("+1(234");
    expect(proc("+1(234)9")).toBe("+1(234) 9");
    expect(proc("12349751234")).toBe("+1(234) 975-1234");
    expect(proc("")).toBe("+1("); // autoprefix

    expect(maskInput("+1(234) 975-1234", mask).isCompleted).toBe(true);
    expect(maskInput("+1(234) 975-123", mask).isCompleted).toBe(false);
    expect(maskInput("+1(234) 975-", mask).isCompleted).toBe(false);
    expect(maskInput("+1(234) 975", mask).isCompleted).toBe(false);
    expect(maskInput("+1(234) ", mask).isCompleted).toBe(false);
    expect(maskInput("+1(234)", mask).isCompleted).toBe(false);
    expect(maskInput("+1(234", mask).isCompleted).toBe(false);
    expect(maskInput("+1(", mask).isCompleted).toBe(false);
    expect(maskInput("", mask).isCompleted).toBe(false);

    expect(maskInput("+1(", mask).leftLength).toBe(mask.length - 3);
    expect(maskInput("", mask).leftLength).toBe(mask.length - 3);
  });

  test("$ #####0 USD", () => {
    const mask = "$ #####0 USD";
    const proc = (v) => maskInput(v, "$ #####0 USD").text;
    expect(proc("$ 123456 USD")).toBe("$ 123456 USD");
    expect(proc("$ 123450 USD")).toBe("$ 123450 USD");
    expect(proc("$ 50 USD")).toBe("$ 50 USD");
    expect(proc("$ 123456789")).toBe("$ 123456 USD");
    expect(proc("")).toBe("$ ");

    // WARN: suffix works only with option prediction, but possible without it (extra implementation required)
    expect(proc("$ 5")).toBe("$ 5 USD");
    expect(proc("5")).toBe("$ 5 USD");
    expect(proc("$ 5 US")).toBe("$ 5 USD"); // WARN: in this case input must control caret position and don't allow to remove prefix/suffix

    expect(maskInput("$ 123456 USD", mask).isCompleted).toBe(true);
    expect(maskInput("$ 5 USD", mask).isCompleted).toBe(true);
    expect(maskInput("$ 5", mask).isCompleted).toBe(true); // because suffix appends in lazy mode

    expect(maskInput("$ 123456 USD", mask).leftLength).toBe(0);
    expect(maskInput("$ 5 USD", mask).leftLength).toBe(0);
  });

  // todo test with \1 \0

  // WARN. for currency need to use completely another behavior: see NumberControl
});
