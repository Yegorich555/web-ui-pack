// import WUPTextControl from "../../../src/controls/text";
// import MaskTextInput from "../../../src/controls/text.mask";
import WUPTextControl from "web-ui-pack/controls/text";
import MaskTextInput from "web-ui-pack/controls/text.mask";
import * as h from "../../testHelper";

/** @type WUPTextControl */
let el;

/** Remove char on the control and remove cursorSnapshot */
const remove = async (opts = { key: "Backspace" }) => {
  await h.userRemove(el.$refInput, opts);
  await h.wait(150);
  return h.getInputCursor(el.$refInput);
};

beforeEach(async () => {
  jest.useFakeTimers();

  let lastUniqueNum = 0;
  jest.spyOn(WUPTextControl, "$uniqueId", "get").mockImplementation(() => `txt${++lastUniqueNum}`);

  Element.prototype.scrollIntoView = jest.fn();
  el = document.body.appendChild(document.createElement("wup-text"));
  await h.wait(1); // wait for ready
  // el.$refInput.focus();
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
});

describe("control.text: mask", () => {
  test("0000-00-00 (dateMask yyyy-MM-dd)", async () => {
    const mask = "0000-00-00";
    const mi = new MaskTextInput(mask, "");
    const proc = (v) => {
      mi.parse(v);
      return mi.value;
    };

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
    expect(new MaskTextInput(mask, "1234", { prediction: false }).value).toBe("1234");
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
      `"<label for="txt1"><span><span aria-hidden="true" maskholder=""><i></i>yyyy-mm-dd</span><input placeholder=" " type="text" id="txt1" autocomplete="off" inputmode="numeric"><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label>"`
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
      { $in: "abcd", $out: "1234-05-6d", $outN: "1234-05-6", h: "<i>1234-05-6d</i>", hN: "<i>1234-05-6</i>d" },
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

    // case when selectionEnd !== selectionStart
    el.$refInput.select();
    expect(
      el.$refInput.dispatchEvent(
        new InputEvent("beforeinput", { data: "1", inputType: "instertText", cancelable: true, bubbles: true })
      )
    ).toBe(true); // event must be not-prevented
    el.$refInput.value = "6";
    el.$refInput.selectionStart = 1;
    el.$refInput.selectionEnd = 1;
    el.$refInput.dispatchEvent(new InputEvent("input", { inputType: "instertText", bubbles: true }));
    await h.wait(150);
    expect(el.$refInput.value).toBe("6");

    // case when user swipes 2 values
    h.setInputCursor(el.$refInput, "6|7|");
    expect(
      el.$refInput.dispatchEvent(
        new InputEvent("beforeinput", { inputType: "insertFromDrop", cancelable: true, bubbles: true })
      )
    ).toBe(true); // event must be not-prevented
    el.$refInput.value = "76";
    el.$refInput.selectionStart = 1;
    el.$refInput.selectionEnd = 1;
    el.$refInput.dispatchEvent(new InputEvent("input", { inputType: "instertText", bubbles: true }));
    await h.wait(150);
    expect(el.$refInput.value).toBe("76");

    // test ability to remove chars
    h.setInputCursor(el.$refInput, "1234-05-06|");
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
      await h.userRemove(el.$refInput);
      await h.wait(150);
      expect(el.$refInput.value).toBe(removeResult[i]);
    }

    const parse = (s) => {
      mi.parse(s);
      return mi;
    };

    expect(parse("1234-05-06").isCompleted).toBe(true);
    expect(parse("1234-05-0").isCompleted).toBe(false);
    expect(parse("1234-05-").isCompleted).toBe(false);
    expect(parse("1234-05").isCompleted).toBe(false);
    expect(parse("1234-0").isCompleted).toBe(false);
    expect(parse("1234-").isCompleted).toBe(false);
    expect(parse("1234").isCompleted).toBe(false);
    expect(parse("1").isCompleted).toBe(false);
    expect(parse("").isCompleted).toBe(false);
  });

  test("0000/#0/#0 (dateMask yyyy-M-d)", async () => {
    const mask = "0000/#0/#0";
    const mi = new MaskTextInput(mask, "");
    const proc = (v) => {
      mi.parse(v);
      return mi.value;
    };

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
    expect(new MaskTextInput(mask, "1234", { prediction: false }).value).toBe("1234");
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
      `"<label for="txt1"><span><span aria-hidden="true" maskholder=""><i></i>yyyy/mm/dd</span><input placeholder=" " type="text" id="txt1" autocomplete="off" inputmode="numeric"><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label>"`
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
      { $in: "abcd", $out: "1234/5/6d", $outN: "1234/5/6", h: "<i>1234/5/6d</i>", hN: "<i>1234/5/6</i>d" },
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
    h.setInputCursor(el.$refInput, "1|234/56/78");
    expect(await h.userTypeText(el.$refInput, "ab", { clearPrevious: false })).toBe("1b|234/56/78");
    await h.wait(150); // when user types invalid char it shows and hides after a time
    expect(h.getInputCursor(el.$refInput)).toBe("1|234/56/78");

    h.setInputCursor(el.$refInput, "|123");
    expect(await h.userTypeText(el.$refInput, "ab", { clearPrevious: false })).toBe("b|123");
    await h.wait(150); // when user types invalid char it shows and hides after a time
    expect(h.getInputCursor(el.$refInput)).toBe("|123");

    const parse = (s) => {
      mi.parse(s);
      return mi;
    };
    expect(parse("1234/05/06").isCompleted).toBe(true);
    expect(parse("1234/5/6").isCompleted).toBe(true);
    expect(parse("1234/5/0").isCompleted).toBe(true);
    expect(parse("1234/05/").isCompleted).toBe(false);
    expect(parse("1234/5").isCompleted).toBe(false);
    expect(parse("1234/0").isCompleted).toBe(false);
    expect(parse("1234/").isCompleted).toBe(false);
    expect(parse("1234").isCompleted).toBe(false);
    expect(parse("1").isCompleted).toBe(false);
    expect(parse("").isCompleted).toBe(false);
  });

  test("0000--0", () => {
    const mask = "0000--0";
    const mi = new MaskTextInput(mask, "");
    const proc = (v) => {
      mi.parse(v);
      return mi.value;
    };

    expect(proc("1234--5")).toBe("1234--5");
    expect(proc("1234--5b")).toBe("1234--5");
    expect(proc("12345")).toBe("1234--5");
    expect(proc("1 5")).toBe("0001--5");
  });

  test("##0.##0.##0.##0 (IP addess)", async () => {
    const mask = "##0.##0.##0.##0";
    const mi = new MaskTextInput(mask, "");
    const proc = (v) => {
      mi.parse(v);
      return mi.value;
    };

    expect(proc("192.168.255.254")).toBe("192.168.255.254");
    expect(proc("1.2.3.4")).toBe("1.2.3.4");
    expect(proc("1.")).toBe("1.");
    expect(proc("192.")).toBe("192.");
    expect(proc("192")).toBe("192.");
    expect(new MaskTextInput(mask, "192", { prediction: false }).value).toBe("192");
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

    const parse = (s) => {
      mi.parse(s);
      return mi;
    };
    expect(parse("255.255.123.233").isCompleted).toBe(true);
    expect(parse("1.2.3.4").isCompleted).toBe(true);
    expect(parse("255.255.123.2").isCompleted).toBe(true);
    expect(parse("255.255.123.").isCompleted).toBe(false);

    expect(parse("255.255.123.233", mask).leftLength).toBe(0);
    expect(parse("255.255.123.", mask).leftLength).toBe(3);
    expect(parse("255.255.1.", mask).leftLength).toBe(3);
    expect(parse("255.2.1.", mask).leftLength).toBe(3);
    expect(parse("3.2.1.", mask).leftLength).toBe(3);
    expect(parse("3.2.1.2", mask).leftLength).toBe(2);
    expect(parse("3.2.1.21", mask).leftLength).toBe(1);
    expect(parse("3.2.1.210", mask).leftLength).toBe(0);
    expect(parse("1", mask).leftLength).toBe(mask.length - 1);
    expect(parse("12", mask).leftLength).toBe(mask.length - 2);
    expect(parse("123", mask).leftLength).toBe(mask.length - 4); // because . appended

    // tests with input
    el.$options.mask = mask;
    el.$options.maskholder = "xxx.xxx.xxx.xxx";
    el.focus();
    await h.wait(1);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<label for="txt1"><span><span aria-hidden="true" maskholder=""><i></i>xxx.xxx.xxx.xxx</span><input placeholder=" " type="text" id="txt1" autocomplete="off" inputmode="numeric"><strong></strong></span><button clear="" tabindex="-1" aria-hidden="true" type="button"></button></label>"`
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
      { $in: "abcd", $out: "123.4.5.d", $outN: "123.4.5.", h: "<i>123.4.5.d</i>xx", hN: "<i>123.4.5.</i>xxx" },
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

    h.setInputCursor(el.$refInput, "1|45.789.387.");
    await h.userTypeText(el.$refInput, ".", { clearPrevious: false });
    await h.wait(150);
    expect(h.getInputCursor(el.$refInput)).toBe("1.|45.789.387");

    // test ability to remove chars
    h.setInputCursor(el.$refInput, "123.4.5.6|");
    const removeResult = [
      "123.4.5.|", //
      "123.4.5|",
      "123.4.|",
      "123.4|",
      "123.|",
      "12|",
      "1|",
      "|",
    ];

    for (let i = 0; i < removeResult.length; ++i) {
      expect(await remove()).toBe(removeResult[i]);
    }

    // removing digits in the middle
    h.setInputCursor(el.$refInput, "123.|45.789.387");
    expect(await remove()).toBe("12|.45.789.387");
    expect(await remove()).toBe("1|.45.789.387");
    expect(await remove()).toBe("|45.789.387.");

    h.setInputCursor(el.$refInput, "123.45|.789.387");
    expect(await remove()).toBe("123.4|.789.387");
    expect(await remove()).toBe("123.|789.387.");
    expect(await remove()).toBe("12|.789.387.");
    expect(await remove()).toBe("1|.789.387.");
    expect(await remove()).toBe("|789.387.");

    h.setInputCursor(el.$refInput, "1.|");
    expect(await remove()).toBe("1|");

    h.setInputCursor(el.$refInput, "123.4|5.789.387");
    expect(await remove({ key: "Delete" })).toBe("123.4|.789.387");
    expect(await remove({ key: "Delete" })).toBe("123.4.|89.387");
    expect(await remove({ key: "Delete" })).toBe("123.4.|9.387");
    expect(await remove({ key: "Delete" })).toBe("123.4.|387.");
    expect(await remove({ key: "Delete" })).toBe("123.4.|87.");
    expect(await remove({ key: "Delete" })).toBe("123.4.|7.");
    expect(await remove({ key: "Delete" })).toBe("123.4.|");
    // 123.387
    h.setInputCursor(el.$refInput, "123|.456.789.387");
    expect(await remove({ key: "Delete" })).toBe("123.|56.789.387");

    h.setInputCursor(el.$refInput, "1|.");
    expect(await remove({ key: "Delete" })).toBe("1|");

    h.setInputCursor(el.$refInput, "123|.");
    expect(await remove({ key: "Delete" })).toBe("123.|");
  });

  test("+1(000) 000-0000", async () => {
    const mask = "+1(000) 000-0000";
    const mi = new MaskTextInput(mask, "");
    const proc = (v) => {
      mi.parse(v);
      return mi.value;
    };

    expect(proc("+1(234) 975-1234")).toBe("+1(234) 975-1234");
    expect(proc("2")).toBe("+1(2");
    expect(proc("23")).toBe("+1(23");
    expect(proc("234")).toBe("+1(234) ");
    expect(new MaskTextInput(mask, "234", { prediction: false }).value).toBe("+1(234");
    expect(proc("+1(234)9")).toBe("+1(234) 9");
    expect(proc("12349751234")).toBe("+1(234) 975-1234");
    expect(proc("")).toBe("+1("); // autoprefix
    expect(proc("+1(234) 9675-123")).toBe("+1(234) 967-5123"); // shift behavior

    const parse = (s) => {
      mi.parse(s);
      return mi;
    };
    expect(parse("+1(234) 975-1234").isCompleted).toBe(true);
    expect(parse("+1(234) 975-123").isCompleted).toBe(false);
    expect(parse("+1(234) 975-").isCompleted).toBe(false);
    expect(parse("+1(234) 975").isCompleted).toBe(false);
    expect(parse("+1(234) ").isCompleted).toBe(false);
    expect(parse("+1(234)").isCompleted).toBe(false);
    expect(parse("+1(234").isCompleted).toBe(false);
    expect(parse("+1(").isCompleted).toBe(false);
    expect(parse("").isCompleted).toBe(false);

    expect(parse("+1(", mask).leftLength).toBe(mask.length - 3);
    expect(parse("", mask).leftLength).toBe(mask.length - 3);

    // removing prefix: show user remove and after 100ms rollback
    el.$options.mask = mask;
    el.$options.maskholder = mask;
    el.$refInput.value = "+1(";
    el.focus();
    await h.wait(1);

    // type in the middle
    h.setInputCursor(el.$refInput, "+1(234) 9|75-123");
    // type 'ab'
    expect(await h.userTypeText(el.$refInput, "ab", { clearPrevious: false })).toBe("+1(234) 9b|75-123");
    expect(el.$refMaskholder.innerHTML).toBe("<i>+1(234) 9b75-123</i>");
    await h.wait(150);
    expect(h.getInputCursor(el.$refInput)).toBe("+1(234) 9|75-123");
    expect(el.$refMaskholder.innerHTML).toBe("<i>+1(234) 975-123</i>0");
    // type digits
    h.setInputCursor(el.$refInput, "+1(234) 9|75-123");
    expect(await h.userTypeText(el.$refInput, "4", { clearPrevious: false })).toBe("+1(234) 94|7-5123"); // digits must be shifted

    // todo need fix commented
    // const arr = [
    //   { from: "|+1(", add: "2", to: "+1(2|" },
    //   { from: "|+1(2", add: "3", to: "+1(3|2" },
    //   { from: "|+1(32", add: "4", to: "+1(4|32) " },
    //   { from: "|+1(432) ", add: "5", to: "+1(5|43) 2" },
    //   { from: "|+1(543) 2", add: "6", to: "+1(6|54) 32" },
    //   { from: "+|1(2", add: "3", to: "+1(3|2" },
    // ];
    // for (let i = 0; i < arr.length; ++i) {
    //   const a = arr[i];
    //   h.setInputCursor(el.$refInput, a.from);
    //   expect(await h.userTypeText(el.$refInput, a.add, { clearPrevious: false })).toBe(a.to);
    // }

    // removing
    h.setInputCursor(el.$refInput, "+1(|");
    await h.userRemove(el.$refInput);
    expect(el.$refInput.value).toBe("+1");
    expect(el.$refMaskholder.innerHTML).toBe("<i>+1</i>(000) 000-0000");
    await h.wait(150); // when user types invalid char it shows and hides after a time
    expect(el.$refInput.value).toBe("+1(");
    expect(el.$refMaskholder.innerHTML).toBe("<i>+1(</i>000) 000-0000");

    // removing in the middle
    h.setInputCursor(el.$refInput, "+1(234) 975|-1234");
    expect(await remove()).toBe("+1(234) 97|1-234");
    expect(el.$refMaskholder.innerHTML).toBe("<i>+1(234) 971-234</i>0");

    h.setInputCursor(el.$refInput, "+1(234) |975-1234");
    expect(await remove()).toBe("+1(23|9) 751-234");
    expect(el.$refMaskholder.innerHTML).toBe("<i>+1(239) 751-234</i>0");
    expect(await remove()).toBe("+1(2|97) 512-34");
    expect(el.$refMaskholder.innerHTML).toBe("<i>+1(297) 512-34</i>00");

    // removing by Delete key
    h.setInputCursor(el.$refInput, "|+1(");
    expect(await remove({ key: "Delete" })).toBe("+1(|");
    h.setInputCursor(el.$refInput, "|+1(23");
    expect(await remove({ key: "Delete" })).toBe("+1(|3");
    h.setInputCursor(el.$refInput, "+|1(23");
    expect(await remove({ key: "Delete" })).toBe("+1(|3");

    h.setInputCursor(el.$refInput, "|+1(");
    expect(await h.userTypeText(el.$refInput, "2", { clearPrevious: false })).toBe("+1(2|");
  });

  test("+0 (000) 000-0000", async () => {
    const mask = "+0 (000) 000-0000";
    el.$options.mask = mask;
    el.$options.maskholder = mask;
    el.focus();
    await h.wait(1);
    h.setInputCursor(el.$refInput, "|");
    expect(await h.userTypeText(el.$refInput, "1", { clearPrevious: false })).toBe("+1 (|");
    expect(await h.userTypeText(el.$refInput, "234", { clearPrevious: false })).toBe("+1 (234) |");

    expect(await h.userTypeText(el.$refInput, "567", { clearPrevious: false })).toBe("+1 (234) 567-|");
    h.setInputCursor(el.$refInput, "+1 (|234) 567-");
    expect(await h.userRemove(el.$refInput)).toBe("+|2 (345) 67");

    h.setInputCursor(el.$refInput, "+|");
    expect(await h.userTypeText(el.$refInput, "11111111111", { clearPrevious: false })).toBe("+1 (111) 111-1111|");
    h.setInputCursor(el.$refInput, "+1 (1|11) 111-1111");
    await h.userInsertText(el.$refInput, "23456");
    await h.wait();
    expect(h.getInputCursor(el.$refInput)).toBe("+1 (123) 456-|1111");

    h.setInputCursor(el.$refInput, "|+2 (345) 67|", { skipEvent: true });
    expect(await h.userTypeText(el.$refInput, "8", { clearPrevious: false })).toBe("+8 (|");
  });

  test("#.#", async () => {
    expect(new MaskTextInput("#.#", "2").isCompleted).toBe(true); // because others are optional
    expect(new MaskTextInput("#0.#", "2").isCompleted).toBe(true); // because others are optional
  });

  test("$ #####0 USD", async () => {
    const mask = "$ #####0 USD";
    const mi = new MaskTextInput(mask, "");
    const proc = (v) => {
      mi.parse(v);
      return mi.value;
    };

    expect(proc("$ 123456 USD")).toBe("$ 123456 USD");
    expect(proc("$ 123450 USD")).toBe("$ 123450 USD");
    expect(proc("$ 50 USD")).toBe("$ 50 USD");
    expect(proc("$ 123456789")).toBe("$ 123456 USD");
    expect(proc("")).toBe("$ ");

    // WARN: postfix works only with option prediction, but possible without it (extra implementation required)
    expect(proc("$ 5")).toBe("$ 5 USD");
    expect(proc("5")).toBe("$ 5 USD");
    expect(proc("$ 5 US")).toBe("$ 5 USD"); // WARN: in this case input must control caret position and don't allow to remove prefix/postfix

    const parse = (s) => {
      mi.parse(s);
      return mi;
    };

    expect(parse("$ 123456 USD").isCompleted).toBe(true);
    expect(parse("$ 5 USD").isCompleted).toBe(true);
    expect(parse("$ 5").isCompleted).toBe(true); // because postfix appends in lazy mode

    expect(parse("$ 123456 USD", mask).leftLength).toBe(0);
    expect(parse("$ 5 USD", mask).leftLength).toBe(0);

    expect(h.getInputCursor(el.$refInput)).toBe("|");
    el.$options.mask = mask;
    el.focus();
    expect(h.getInputCursor(el.$refInput)).toBe("$ |");
    await h.wait(1);
    expect(h.getInputCursor(el.$refInput)).toBe("$ |");

    await h.userTypeText(el.$refInput, "5", { clearPrevious: false });
    await h.wait(150);
    expect(h.getInputCursor(el.$refInput)).toBe("$ 5| USD");
    await h.userTypeText(el.$refInput, "2", { clearPrevious: false });
    await h.wait(150);
    expect(h.getInputCursor(el.$refInput)).toBe("$ 52| USD");

    h.setInputCursor(el.$refInput, "$ 5 USD|");
    await h.userTypeText(el.$refInput, "2", { clearPrevious: false });
    expect(h.getInputCursor(el.$refInput)).toBe("$ 5 USD2|");
    await h.wait(150);
    expect(h.getInputCursor(el.$refInput)).toBe("$ 5| USD");

    h.setInputCursor(el.$refInput, "$ 123456 USD|");
    expect(await h.userTypeText(el.$refInput, "2", { clearPrevious: false })).toBe("$ 123456 USD2|");
    await h.wait(150);
    expect(h.getInputCursor(el.$refInput)).toBe("$ 123456| USD");

    h.setInputCursor(el.$refInput, "$ 5| USD");
    expect(await remove()).toBe("$ |");

    h.setInputCursor(el.$refInput, "$ 5| USD");
    await h.userRemove(el.$refInput, { key: "Delete" });
    expect(el.$refInput.value).toBe("$ 5USD");
    expect(el.$refMaskholder.innerHTML).toBe("<i>$ 5USD</i>D");
    await h.wait(150); // when user types invalid char it shows and hides after a time
    expect(el.$refInput.value).toBe("$ 5 USD");
    expect(el.$refMaskholder.innerHTML).toBe("<i>$ 5 USD</i>");

    h.setInputCursor(el.$refInput, "$ 5 USD|");
    expect(await remove()).toBe("$ |"); // because of in prediction need to remove this
  });

  test("*{1,2}", async () => {
    expect(new MaskTextInput("*", "").chunks.map((v) => v.pattern)).toEqual(["*"]);
    expect(new MaskTextInput("0 **", "").chunks.map((v) => v.pattern)).toEqual(["0", " ", "**"]);
    expect(new MaskTextInput("0 *{1,2}", "").chunks.map((v) => v.pattern)).toEqual(["0", " ", "**"]);
    expect(new MaskTextInput("0 *{1,2}", "").chunks.map((v) => v.pattern)).toEqual(["0", " ", "**"]);
    expect(new MaskTextInput("0 {1,2}", "").chunks.map((v) => v.pattern)).toEqual(["0", " {1,2}"]);
    expect(new MaskTextInput("*{2}", "").chunks.map((v) => v.pattern)).toEqual(["**"]);
    expect(new MaskTextInput("0 *{2", "").chunks.map((v) => v.pattern)).toEqual(["0", " ", "*", "{2"]);

    h.mockConsoleWarn();
    expect(() => new MaskTextInput("#*", "")).toThrow(); // because 2 var-chunks at once
    h.unMockConsoleWarn();

    const mask = "0 *{1,2} suf";
    const mi = new MaskTextInput(mask, "");
    const proc = (v = "") => {
      mi.parse(v);
      return mi.value;
    };

    expect(proc("2 ab suf")).toBe("2 ab suf");
    expect(proc("2 ab")).toBe("2 ab suf");
    expect(proc("2 ")).toBe("2 ");
    expect(proc("2 a")).toBe("2 a suf");
    expect(proc("2 a suf")).toBe("2 a suf");

    el.$options.mask = "0 *{1,2}?";
    el.$options.maskholder = null;
    await h.wait(1);
    expect(el.$options.maskholder).toBe("0 **?");
    expect(await h.userTypeText(el.$refInput, "5Bf", { clearPrevious: false })).toBe("5 Bf|?");
    expect(el.$refMaskholder.innerHTML).toBe("<i>5 Bf?</i>");

    expect(await remove()).toBe("5 B|?");
    expect(el.$refMaskholder.innerHTML).toBe("<i>5 B?</i>");

    expect(await remove()).toBe("5 |");
    expect(el.$refMaskholder.innerHTML).toBe("<i>5 </i>**?");

    expect(await h.userTypeText(el.$refInput, "r", { clearPrevious: false })).toBe("5 r|?");
    expect(el.$refMaskholder.innerHTML).toBe("<i>5 r?</i>");
    h.setInputCursor(el.$refInput, "5 |r?");
    expect(await remove({ key: "Delete" })).toBe("5 |");

    el.blur();
    await h.wait();
    // cover case when resetChunk(): nonDigit
    el.$options.mask = "*{2,3} *";
    el.$options.maskholder = null;
    el.$value = "";
    await h.wait(1);
    expect(el.$options.maskholder).toBe("*** *");
    expect(await h.userTypeText(el.$refInput, "123a", { clearPrevious: false })).toBe("123 a|");
    expect(await remove()).toBe("123 |");
    expect(await remove()).toBe("12|");
    expect(el.$refMaskholder.innerHTML).toBe("<i>12</i>* *");
    expect(await remove()).toBe("1|");
    expect(await remove()).toBe("|");
    expect(el.$refMaskholder.innerHTML).toBe("<i></i>*** *");
  });

  test("regex in mask", async () => {
    expect(new MaskTextInput("//[a-c]//", "").chunks.map((v) => v.pattern)).toEqual(["*"]);
    expect(new MaskTextInput("0 //[a-c]//{2}", "").chunks.map((v) => v.pattern)).toEqual(["0", " ", "**"]);
    expect(new MaskTextInput("0 //[a-c]//{1,2}", "").chunks.map((v) => v.pattern)).toEqual(["0", " ", "**"]);
    expect(new MaskTextInput("//[a-c] 0", "").chunks.map((v) => v.pattern)).toEqual(["//[a-c] ", "0"]);

    const mask = "0 //[a-c]//";
    const mi = new MaskTextInput(mask, "");
    const proc = (v = "") => {
      mi.parse(v);
      return mi.value;
    };

    expect(proc("2 a")).toBe("2 a");
    expect(proc("2 c")).toBe("2 c");
    expect(proc("2 d")).toBe("2 "); // 'd' is rejected by mask

    el.$options.mask = "0 //[a-c]//{1,2}";
    el.$options.maskholder = "0 **";
    expect(await h.userTypeText(el.$refInput, "5ab", { clearPrevious: false })).toBe("5 ab|");
    expect(el.$refMaskholder.innerHTML).toBe("<i>5 ab</i>");

    expect(await remove()).toBe("5 a|");
    expect(el.$refMaskholder.innerHTML).toBe("<i>5 a</i>*");

    expect(await remove()).toBe("5 |");
    expect(el.$refMaskholder.innerHTML).toBe("<i>5 </i>**");

    expect(await h.userTypeText(el.$refInput, "d", { clearPrevious: false })).toBe("5 d|");
    await h.wait(150);
    expect(h.getInputCursor(el.$refInput)).toBe("5 |");
    expect(el.$refMaskholder.innerHTML).toBe("<i>5 </i>**");

    // lowercase/uppercase changing
    el.blur();
    await h.wait();
    el.$options.mask = "00:00 //[AP]//M";
    el.$options.maskholder = null;
    el.$value = "";
    await h.wait(1);
    expect(await h.userTypeText(el.$refInput, "1234a", { clearPrevious: false })).toBe("12:34 A|M");
    el.$value = "";
    await h.wait(1);
    expect(await h.userTypeText(el.$refInput, "5678P", { clearPrevious: false })).toBe("56:78 P|M");

    el.blur();
    await h.wait();
    el.$options.mask = "00:00 //[ap]//m";
    el.$options.maskholder = null;
    el.$value = "";
    await h.wait(1);
    expect(await h.userTypeText(el.$refInput, "1234P", { clearPrevious: false })).toBe("12:34 p|m");
    el.$value = "";
    await h.wait(1);
    expect(await h.userTypeText(el.$refInput, "5678a", { clearPrevious: false })).toBe("56:78 a|m");

    // cover case when 1 char is appended and next is removed
    h.setInputCursor(el.$refInput, "|56:78 am");
    await h.userTypeText(el.$refInput, "1", { clearPrevious: false });
    await h.wait(150);
    expect(h.getInputCursor(el.$refInput)).toBe("1|5:67 am");
    expect(el.$value).toBe("15:67 am");

    jest.spyOn(el, "canParseInput").mockReturnValueOnce(false);
    expect(await h.userTypeText(el.$refInput, "2", { clearPrevious: false })).toBe("12|5:67 am");
    await h.wait(150);
    expect(h.getInputCursor(el.$refInput)).toBe("12:|56 am");
    expect(el.$value).toBe("15:67 am"); // because canParse false and char is declined

    h.setInputCursor(el.$refInput, "|15:67 am");
    expect(await remove({ key: "Delete" })).toBe("|56:7");
  });

  test("input: numeric if mask applied", async () => {
    el.$options.mask = "0000";
    el.focus();
    await h.wait(1);
    expect(el.$refInput.inputMode).toBe("numeric");

    el.blur();
    el.$options.mask = undefined;
    await h.wait(1);
    el.focus();
    expect(el.$refInput.inputMode).toBe("");

    el.blur();
    el.$options.mask = "0 *";
    await h.wait(1);
    el.focus();
    expect(el.$refInput.inputMode).toBe("");

    el.blur();
    el.$options.mask = "0000";
    await h.wait(1);
    el.focus();
    expect(el.$refInput.inputMode).toBe("numeric");
  });

  test("escaped chars: 0, # etc.", () => {
    expect(new MaskTextInput("a|0 ##0 b|#c|* |//h|//", "").chunks.map((v) => v.pattern)).toEqual([
      "a0 ",
      "##0",
      " b#c* //h//",
    ]);
    expect(new MaskTextInput("|0 #", "").chunks.map((v) => v.pattern)).toEqual(["0 ", "#"]);
    expect(new MaskTextInput("a||0 ##0 b||#c||*", "").chunks.map((v) => v.pattern)).toEqual([
      "a|",
      "0",
      " ",
      "##0",
      " b|",
      "#",
      "c|",
      "*",
    ]);
  });

  test("Ctrl+Z,Ctrl+Shift+Z (history redo/undo)", async () => {
    el.$options.mask = "##0.##0.##0.##0";
    el.focus();
    await h.wait(1);

    // make different actions before undo
    expect(await h.userTypeText(el.$refInput, "1234.5.67", { clearPrevious: false })).toBe("123.4.5.67|"); // #1 type long text
    expect(await h.userRemove(el.$refInput)).toBe("123.4.5.6|"); // #2 remove last char
    h.setInputCursor(el.$refInput, "1|23.4.5.6");
    expect(await h.userRemove(el.$refInput, { key: "Delete" })).toBe("1|3.4.5.6"); // #3 remove middle char
    await h.userTypeText(el.$refInput, "a", { clearPrevious: false });
    await h.wait(150);

    // cover Ctrl+Z
    expect(h.getInputCursor(el.$refInput)).toBe("1|3.4.5.6");
    expect(await h.userUndo(el.$refInput)).toBe("1|23.4.5.6"); // rollback before #3
    expect(await h.userUndo(el.$refInput)).toBe("123.4.5.67|"); // rollback before #2
    expect(await h.userUndo(el.$refInput)).toBe("123.4.5.6|"); // rollback before #1
    expect(await h.userUndo(el.$refInput)).toBe("123.4.5.|");
    expect(await h.userUndo(el.$refInput)).toBe("123.4.5|");

    // cover Ctrl+Shift+Z
    expect(await h.userRedo(el.$refInput, { useCtrlY: true })).toBe("123.4.5.|");
    expect(await h.userRedo(el.$refInput)).toBe("123.4.5.6|");
    expect(await h.userRedo(el.$refInput)).toBe("123.4.5.67|");
    expect(await h.userRedo(el.$refInput)).toBe("123.4.5.6|");

    h.setInputCursor(el.$refInput, "1|23.4.5.6");
    expect(await h.userRemove(el.$refInput, { key: "Delete" })).toBe("1|3.4.5.6"); // #3 remove middle char
    expect(await h.userUndo(el.$refInput)).toBe("1|23.4.5.6"); // rollback before #3
    expect(await h.userRedo(el.$refInput)).toBe("1|3.4.5.6");
    expect(await h.userUndo(el.$refInput)).toBe("1|23.4.5.6");

    h.setInputCursor(el.$refInput, "12|3.4.5.6");
    expect(await h.userRemove(el.$refInput)).toBe("1|3.4.5.6"); // #3 remove middle char
    expect(await h.userUndo(el.$refInput)).toBe("12|3.4.5.6"); // rollback before #3
    expect(await h.userRedo(el.$refInput)).toBe("1|3.4.5.6"); // rollback before #3
    expect(await h.userUndo(el.$refInput)).toBe("12|3.4.5.6"); // rollback before #3

    // todo fix this case
    // el._refHistory.testMe = true;
    // console.warn({ ...el._refHistory }, el._refHistory._hist[el._refHistory._histPos + 1]);
    expect(await h.userTypeText(el.$refInput, "123")).toBe("123.|");
    expect(await h.userUndo(el.$refInput)).toBe("12|"); // expected that history removes also extra '.' that added by mask

    // test again on simple case
    el = document.body.appendChild(document.createElement("wup-text"));
    el.$options.mask = "+1(000) 000";
    await h.wait(1);
    h.setInputCursor(el.$refInput, "+1(|");
    await h.userTypeText(el.$refInput, "2", { clearPrevious: false });
    expect(await h.userUndo(el.$refInput)).toBe("+1(|");

    expect(await h.userRedo(el.$refInput)).toBe("+1(2|");
    expect(await h.userRedo(el.$refInput)).toBe("+1(2|"); // try again - no actions

    expect(await h.userUndo(el.$refInput)).toBe("+1(|");
    expect(await h.userUndo(el.$refInput)).toBe("+1(|"); // try again - no actions

    // cover ctrl+z+alt
    const isHandled = !el.dispatchEvent(
      new KeyboardEvent("keydown", {
        code: "KeyZ",
        key: "z",
        ctrlKey: true,
        altKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(isHandled).toBe(false); // because altKey

    // case when char declined and need to rollback to empty string because only prefix lefts
    await h.userTypeText(el.$refInput, "a", { clearPrevious: false });
    expect(el.$refInput.value).toBe("+1(a");
    el.blur();
    await h.wait();
    expect(el.$refInput.value).toBe(""); // input must be cleared by blur if was only prefix

    // cover case when !selectionStart
    el.$options.mask = "##0";
    el.$value = "";
    await h.wait(1);
    await h.userTypeText(el.$refInput, "2", { clearPrevious: false });
    h.setInputCursor(el.$refInput, "|2");
    expect(await h.userUndo(el.$refInput)).toBe("|");
    expect(await h.userRedo(el.$refInput)).toBe("2|");

    // cover case when not canHandleUndo
    const saved = el._refHistory;
    el.$value = "";
    el.$options.mask = undefined;
    el.canHandleUndo = () => false;
    el._refHistory = undefined;
    await h.wait(1);
    expect(el.canHandleUndo()).toBe(false);
    expect(() => el.declineInput()).not.toThrow(); // because it doesn't depend on history

    el.$value = "";
    await h.wait(1);
    el.canHandleUndo = () => true;
    el._refHistory = saved;
    await h.userTypeText(el.$refInput, "2", { clearPrevious: false });
    expect(el.$refInput.value).toBe("2");
    el.declineInput(); // despite on manuall decline
    expect(el.$refInput.value).toBe("2");
    await h.wait(150);
    expect(el.$refInput.value).toBe("");

    // more tests
    el = document.body.appendChild(document.createElement("wup-text"));
    el.$options.mask = "+0 (000) 000-0000";
    const onGotInput = jest.spyOn(WUPTextControl.prototype, "gotInput");
    el.focus();
    await h.wait(1);
    // undo when hist is empty
    const isPrevented = !el.$refInput.dispatchEvent(
      new InputEvent("beforeinput", { bubbles: true, inputType: "historyUndo", cancelable: true })
    );
    expect(isPrevented).toBe(true);
    await h.wait(1);
    // test ordinary replace behavior
    h.setInputCursor(el.$refInput, "+|");
    expect(await h.userInsertText(el.$refInput, "12345678901")).toBe("+1 (234) 567-8901|");
    h.setInputCursor(el.$refInput, "|+1 (234) 567-8901|"); // select all
    expect(await h.userRemove(el.$refInput)).toBe("+|");
    expect(await h.userUndo(el.$refInput)).toBe("|+1 (234) 567-8901|");
    expect(await h.userUndo(el.$refInput)).toBe("+|");
    expect(onGotInput).toBeCalled();
    onGotInput.mockClear();
    expect(await h.userUndo(el.$refInput)).toBe("+|");
    expect(onGotInput).not.toBeCalled(); // because history is cleared

    el.$value = "+1 (234) 567-8921";
    await h.wait(1);
    h.setInputCursor(el.$refInput, "+1 (2|34) 567-8921");
    expect(await h.userTypeText(el.$refInput, "1", { clearPrevious: false })).toBe("+1 (21|34) 567-8921");
    await h.wait();
    expect(h.getInputCursor(el.$refInput)).toBe("+1 (21|3) 456-7892");
    expect(await h.userUndo(el.$refInput)).toBe("+1 (2|34) 567-8921"); // +1 (21|3) 456-7892
  });

  test("$opions.mask works properly", async () => {
    el.$options.mask = "##0";
    await h.wait(1);
    expect(el.$options.maskholder).toBe("##0");
    el.$options.maskholder = "xxx";
    await h.wait(1);
    expect(el.$options.maskholder).toBe("xxx");

    el.focus();
    expect(el.$refMaskholder).toBeDefined();

    el.$options.maskholder = "";
    await h.wait(1);
    expect(el.$options.maskholder).toBe("");
    expect(el.$refMaskholder).toBeUndefined();

    // mask works without maskholder
    await h.userTypeText(el.$refInput, "2", { clearPrevious: false });
    expect(el.$refInput.value).toBe("2");
    expect(el.$refMaskholder).toBeUndefined();

    // possible to remove mask
    expect(el.refMask).toBeDefined();
    el.$options.mask = undefined;
    await h.wait(1);
    el.$refInput.dispatchEvent(new InputEvent("beforeinput", { bubbles: true }));
    el.$refInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
    expect(el.refMask).toBeUndefined();

    // possible to add mask after a time
    expect(h.getInputCursor(el.$refInput)).toBe("2|");
    el.$options.mask = "#0";
    el.$options.selectOnFocus = true;
    await h.wait(1);
    await h.userTypeText(el.$refInput, "3", { clearPrevious: false });
    expect(h.getInputCursor(el.$refInput)).toBe("23|");
    expect(el.refMask?.pattern).toBe("#0"); // checking if new pattern is applied

    el.blur();
    el.focus();
    await h.wait(1);
    expect(h.getInputCursor(el.$refInput)).toBe("|23|"); // all selected if refMask.isCompleted

    // maskholder is reset if mask is removed
    el.blur();
    el.$value = "";
    el.$options.mask = "##0 *{1,2}";
    el.$options.maskholder = null;
    await h.wait(1);
    expect(el.$options.maskholder).toBe("##0 **");
    el.focus();
    await h.wait();
    expect(el.$refMaskholder).toBeDefined();

    el.$options.mask = undefined;
    await h.wait(1);
    expect(el.$refMaskholder).toBeUndefined();
  });
  // WARN. for currency need to use completely another behavior: exctract digits and mask again >>> see NumberControl
});
