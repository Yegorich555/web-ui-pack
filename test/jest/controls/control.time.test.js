/**
 * @jest-environment ./test/jest.timeZoneEnv.js
 * @jest-environment-options {"timezone": "UTC"}
 */
import { WUPTimeControl, WUPTimeObject } from "web-ui-pack";
// import { localeInfo } from "web-ui-pack/indexHelpers";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";
import * as h from "../../testHelper";

beforeAll(() => {
  // localeInfo.refresh("en-US"); // setup "en-US" locale
  // localeInfo.time = "hh:mm:ss.fff a";
  // localeInfo.dateTime = `${localeInfo.date} ${localeInfo.time}`;
  if (new Date().getTimezoneOffset() !== 0) {
    throw new Error(
      `\nMissed timezone 'UTC'.
      new Date().getTimezoneOffset() is ${new Date().getTimezoneOffset()}.
      Expected NodeJS >= v16.2.0 or 17.2.0 & process.env.TZ='UTC'`
      // related issue: https://github.com/nodejs/node/issues/4230#issuecomment-163688700
    );
  }
});

beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2022-10-18T12:23:00.000Z")); // 18 Oct 2022 12:00 UTC
});

/** @type WUPTimeControl */
let el;
initTestBaseControl({
  type: WUPTimeControl,
  htmlTag: "wup-time",
  onInit: (e) => {
    jest.setSystemTime(new Date("2022-10-18T12:23:00.000Z")); // 18 Oct 2022 12:00 UTC
    el = e;

    const height = 50;
    const width = 100;
    const x = 140;
    const y = 100;
    jest.spyOn(el, "getBoundingClientRect").mockReturnValue({
      x,
      left: x,
      y,
      top: y,
      bottom: y + height,
      right: x + width,
      height,
      width,
      toJSON: () => "",
    });
  },
});

describe("control.date", () => {
  testBaseControl({
    noInputSelection: true,
    initValues: [
      { attrValue: "02:28", value: new WUPTimeObject("02:28") },
      { attrValue: "23:16", value: new WUPTimeObject("23:16") },
      { attrValue: "12:20", value: new WUPTimeObject("12:20") },
    ],
    validations: {
      min: {
        set: new WUPTimeObject("02:28"),
        failValue: new WUPTimeObject("02:27"),
        trueValue: new WUPTimeObject("02:29"),
      },
      max: {
        set: new WUPTimeObject("23:15"),
        failValue: new WUPTimeObject("23:16"),
        trueValue: new WUPTimeObject("23:14"),
      },
      exclude: {
        set: { test: (v) => v.valueOf() === new WUPTimeObject("15:40").valueOf() },
        failValue: new WUPTimeObject("15:40"),
        trueValue: new WUPTimeObject("19:00"),
      },
    },
    attrs: {
      min: { value: "02:28" },
      max: { value: "23:15" },
      step: { onRemove: true },
      exclude: { refGlobal: { test: (v) => v.valueOf() === new WUPTimeObject("15:40").valueOf() } },
      mask: { skip: true },
      maskholder: { skip: true },
      format: { skip: true },
    },
    $options: {
      mask: { skip: true },
      maskholder: { skip: true },
    },
    validationsSkip: ["_parse", "_mask"],
  });

  describe("extra options", () => {
    test("format", async () => {
      await h.wait(1);
      expect(el.$options.format).toBe("hh:mm A");
      expect(el.$options.mask).toBe("00:00 //[AP]//M");
      expect(el.$options.maskholder).toBe("hh:mm *M");
      el.focus();
      await h.wait();
      expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
        [
          "<li>10</li><li>11</li><li aria-selected="true">12</li><li>01</li><li>02</li>",
          "<li>21</li><li>22</li><li aria-selected="true">23</li><li>24</li><li>25</li>",
          "<li aria-hidden="true"></li><li aria-selected="true">AM</li><li>PM</li>",
        ]
      `);
      await h.wait();

      el.blur();
      await h.wait();
      el.$options.format = "hh:mm a";
      el.$options.mask = undefined;
      el.$options.maskholder = undefined;
      await h.wait(1);
      expect(el.$options.mask).toBe("00:00 //[ap]//m");
      expect(el.$options.maskholder).toBe("hh:mm *m");
      el.focus();
      await h.wait();
      expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
        [
          "<li>10</li><li>11</li><li aria-selected="true">12</li><li>01</li><li>02</li>",
          "<li>21</li><li>22</li><li aria-selected="true">23</li><li>24</li><li>25</li>",
          "<li aria-hidden="true"></li><li aria-selected="true">am</li><li>pm</li>",
        ]
      `);
      await h.wait();

      el.blur();
      await h.wait();
      el.$value = new WUPTimeObject(23, 0);
      el.$options.format = "h-m";
      el.$options.mask = undefined;
      el.$options.maskholder = undefined;
      await h.wait(1);
      expect(el.$options.mask).toBe("#0-#0");
      expect(el.$options.maskholder).toBe("hh-mm");
      el.focus();
      await h.wait();

      expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
        [
          "<li>21</li><li>22</li><li aria-selected="true">23</li><li>0</li><li>1</li>",
          "<li>58</li><li>59</li><li aria-selected="true">0</li><li>1</li><li>2</li>",
        ]
      `);

      // user can override defaults
      el.$options.mask = "00:00";
      await h.wait(1);
      expect(el.$options.mask).toBe("00:00");
      expect(el.$options.maskholder).toBe("hh-mm");
      el.$options.maskholder = "HH MM";
      await h.wait(1);
      expect(el.$options.maskholder).toBe("HH MM");
    });

    test("min/max/exclude affects on validations", async () => {
      expect(el.validations).toBeTruthy(); // for coverage when el.$options.validations = undefined;
      el.$options.min = new WUPTimeObject("02:49");
      expect(el.validations.min).toEqual(new WUPTimeObject("02:49"));
      el.$options.max = new WUPTimeObject("15:00");
      expect(el.validations.max).toEqual(new WUPTimeObject("15:00"));

      el.$options.exclude = { test: (v) => v.valueOf() === new WUPTimeObject("13:10").valueOf() };
      expect(el.validations.exclude).toBe(el.$options.exclude);
    });

    test("step", async () => {
      expect(el.$options.step).toBe(1);
      el.focus();
      await h.wait();
      expect(el.$refMenuLists[1].innerHTML).toMatchInlineSnapshot(
        `"<li>21</li><li>22</li><li aria-selected="true">23</li><li>24</li><li>25</li>"`
      );

      // hide & remove popup
      el.$hideMenu();
      await h.wait();
      document.activeElement.blur();
      await h.wait();
      expect(el.$refMenuLists).not.toBeDefined();

      el.$options.step = 5;
      el.focus();
      await h.wait();
      expect(el.$options.step).toBe(5);
      // WARN: if step == 5 & user can type 15:23 -  25 minutes will be selected in this case
      expect(el.$refMenuLists[1].innerHTML).toMatchInlineSnapshot(
        `"<li>15</li><li>20</li><li aria-selected="true">25</li><li>30</li><li>35</li>"`
      );
    });
  });

  test("user inputs value", async () => {
    const form = document.body.appendChild(document.createElement("wup-form"));
    form.appendChild(el);
    const onSubmit = jest.fn();
    form.$onSubmit = onSubmit;
    el.$options.name = "test";
    await h.wait(1);
    el.focus();
    const onParse = jest.spyOn(el, "parseInput");
    const onChange = jest.fn();
    el.addEventListener("$change", onChange);

    expect(el.$options.format).toBe("hh:mm A");
    await h.userTypeText(el.$refInput, "0123a");
    await h.wait(150);
    expect(el.$isOpen).toBe(true);
    expect(el.$refInput.value).toBe("01:23 AM"); // because mask is applied
    expect(el.$isValid).toBe(true);
    expect(el.$refError).toBe(undefined);
    // el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(onChange).toBeCalledTimes(1);
    expect(onParse).toBeCalled();
    expect(el.$value).toEqual(new WUPTimeObject(1, 23)); // value changed without key "Enter" because user completed input
    expect(el.$isOpen).toBe(true);
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(onSubmit).toBeCalledTimes(0); // 1st Enter only hides popup
    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait(1);
    expect(onSubmit).toBeCalledTimes(1); // 2st Enter sumbits
    onSubmit.mockClear();
    expect(await h.userRemove(el.$refInput)).toBe("01:23 |");
    expect(await h.userRemove(el.$refInput)).toBe("01:2|");
    expect(await h.userRemove(el.$refInput)).toBe("01:|");
    await h.wait(); // wait for validation.debounce
    expect(el.$refError.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden">Error for Test:</span><span>Incomplete value</span>"`
    );
    expect(el.$isOpen).toBe(false); // menu must stay closed

    h.mockConsoleWarn();
    await h.userTypeText(el.$refInput, "92A", { clearPrevious: false });
    h.unMockConsoleWarn();
    expect(el.$refInput.value).toBe("01:92 AM");
    await h.wait(1);
    expect(el.$refError.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden">Error for Test:</span><span>Invalid value</span>"`
    );
    expect(el.$value).toEqual(new WUPTimeObject(1, 23)); // value the same
    expect(el.$isOpen).toBe(false);
    expect(onSubmit).toBeCalledTimes(0);

    el.$refInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    await h.wait();
    expect(el.$value).toEqual(new WUPTimeObject(1, 23)); // value the same
    expect(el.$isOpen).toBe(false);
    expect(el.$refError.innerHTML).toMatchInlineSnapshot(
      `"<span class="wup-hidden">Error for Test:</span><span>Invalid value</span>"`
    ); // value lefts the same
    expect(el.$isValid).toBe(false);
    expect(onSubmit).toBeCalledTimes(0);

    // removing all
    while (el.$refInput.value) {
      await h.userRemove(el.$refInput);
    }
    expect(el.$refError).toBe(undefined);
    expect(el.$value).toBe(undefined);

    // h:m - try to input 01:23 => expected 1:23
    el.blur();
    el.$options.format = "h:mm";
    el.$options.mask = undefined;
    el.$options.maskholder = undefined;
    await h.wait(1);
    expect(await h.userTypeText(el.$refInput, "0136", { clearPrevious: false })).toBe("01:36|");
    expect(el.$value).toEqual(new WUPTimeObject(1, 36));
    el.blur();
    expect(el.$refInput.value).toBe("1:36");
  });

  test("menu", async () => {
    const form = document.body.appendChild(document.createElement("wup-form"));
    form.appendChild(el);
    const onSubmit = jest.fn();
    form.$onSubmit = onSubmit;
    el.$options.name = "test";
    el.$initValue = new WUPTimeObject(12, 59);
    await h.wait(1);
    const onChanged = jest.fn();
    el.addEventListener("$change", onChanged);
    el.focus();
    await h.wait();
    expect(h.getInputCursor(el.$refInput)).toBe("|12:59 PM|");
    expect(el.$refPopup.innerHTML).toMatchInlineSnapshot(
      `"<div id="txt2" role="application"><ul aria-label="Hours" style="overflow: hidden;"><li>10</li><li>11</li><li aria-selected="true">12</li><li>01</li><li>02</li></ul><ul aria-label="Minutes" style="overflow: hidden;"><li>57</li><li>58</li><li aria-selected="true">59</li><li>00</li><li>01</li></ul><ul aria-label="AM PM" style="overflow: hidden;"><li>AM</li><li aria-selected="true">PM</li><li aria-hidden="true"></li></ul><mark aria-hidden="true">:</mark></div><div group=""><button type="button" aria-label="Ok" tabindex="-1"></button><button type="button" aria-label="Cancel" tabindex="-1"></button></div>"`
    );

    const isPressKeyPrevented = (key = "Arrow", opts = { shiftKey: false, ctrlKey: false }) => {
      const isPrevented = !el.$refInput.dispatchEvent(
        new KeyboardEvent("keydown", { key, cancelable: true, bubbles: true, ...opts })
      );
      return isPrevented;
    };

    // hours
    expect(isPressKeyPrevented("ArrowRight")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("12");

    expect(isPressKeyPrevented("ArrowDown")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("01");
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>10</li><li>11</li><li aria-selected="false" id="txt3">12</li><li aria-selected="true" aria-label="01:59 PM" id="txt4" focused="">01</li><li>02</li><li>03</li>",
        "<li>57</li><li>58</li><li aria-selected="true">59</li><li>00</li><li>01</li>",
        "<li>AM</li><li aria-selected="true">PM</li><li aria-hidden="true"></li>",
      ]
    `);
    expect(isPressKeyPrevented("ArrowUp")).toBe(true);
    expect(isPressKeyPrevented("ArrowUp")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("11");
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>09</li><li>10</li><li aria-selected="true" aria-label="11:59 PM" id="txt17" focused="">11</li><li aria-selected="false" id="txt16">12</li><li aria-selected="false" id="txt15">01</li><li aria-selected="false" id="txt14">02</li><li aria-selected="false" id="txt13">03</li><li aria-selected="false" id="txt12">04</li><li aria-selected="false" id="txt11">05</li><li aria-selected="false" id="txt10">06</li><li aria-selected="false" id="txt9">07</li><li aria-selected="false" id="txt8">08</li><li aria-selected="false" id="txt7">09</li><li aria-selected="false" id="txt6">10</li><li>10</li><li aria-selected="false" id="txt5">11</li><li aria-selected="false" id="txt3">12</li><li aria-selected="false" id="txt4">01</li><li>02</li><li>03</li>",
        "<li>57</li><li>58</li><li aria-selected="true">59</li><li>00</li><li>01</li>",
        "<li>AM</li><li aria-selected="true">PM</li><li aria-hidden="true"></li>",
      ]
    `);

    // minutes
    expect(isPressKeyPrevented("ArrowRight")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("59");

    expect(isPressKeyPrevented("ArrowRight", { ctrlKey: true })).toBe(false);
    expect(isPressKeyPrevented("ArrowRight", { altKey: true })).toBe(false);
    expect(isPressKeyPrevented("ArrowRight", { shiftKey: true })).toBe(false);

    expect(isPressKeyPrevented("ArrowDown")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("00");
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>09</li><li>10</li><li aria-selected="true" id="txt17">11</li><li aria-selected="false" id="txt16">12</li><li aria-selected="false" id="txt15">01</li><li aria-selected="false" id="txt14">02</li><li aria-selected="false" id="txt13">03</li><li aria-selected="false" id="txt12">04</li><li aria-selected="false" id="txt11">05</li><li aria-selected="false" id="txt10">06</li><li aria-selected="false" id="txt9">07</li><li aria-selected="false" id="txt8">08</li><li aria-selected="false" id="txt7">09</li><li aria-selected="false" id="txt6">10</li><li>10</li><li aria-selected="false" id="txt5">11</li><li aria-selected="false" id="txt3">12</li><li aria-selected="false" id="txt4">01</li><li>02</li><li>03</li>",
        "<li>57</li><li>58</li><li aria-selected="false" id="txt18">59</li><li aria-selected="true" aria-label="11:00 PM" id="txt19" focused="">00</li><li>01</li><li>02</li>",
        "<li>AM</li><li aria-selected="true">PM</li><li aria-hidden="true"></li>",
      ]
    `);
    expect(isPressKeyPrevented("ArrowUp")).toBe(true);
    expect(isPressKeyPrevented("ArrowUp")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("58");
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>09</li><li>10</li><li aria-selected="true" id="txt17">11</li><li aria-selected="false" id="txt16">12</li><li aria-selected="false" id="txt15">01</li><li aria-selected="false" id="txt14">02</li><li aria-selected="false" id="txt13">03</li><li aria-selected="false" id="txt12">04</li><li aria-selected="false" id="txt11">05</li><li aria-selected="false" id="txt10">06</li><li aria-selected="false" id="txt9">07</li><li aria-selected="false" id="txt8">08</li><li aria-selected="false" id="txt7">09</li><li aria-selected="false" id="txt6">10</li><li>10</li><li aria-selected="false" id="txt5">11</li><li aria-selected="false" id="txt3">12</li><li aria-selected="false" id="txt4">01</li><li>02</li><li>03</li>",
        "<li>56</li><li>57</li><li aria-selected="true" aria-label="11:58 PM" id="txt80" focused="">58</li><li aria-selected="false" id="txt79">59</li><li aria-selected="false" id="txt78">00</li><li aria-selected="false" id="txt77">01</li><li aria-selected="false" id="txt76">02</li><li aria-selected="false" id="txt75">03</li><li aria-selected="false" id="txt74">04</li><li aria-selected="false" id="txt73">05</li><li aria-selected="false" id="txt72">06</li><li aria-selected="false" id="txt71">07</li><li aria-selected="false" id="txt70">08</li><li aria-selected="false" id="txt69">09</li><li aria-selected="false" id="txt68">10</li><li aria-selected="false" id="txt67">11</li><li aria-selected="false" id="txt66">12</li><li aria-selected="false" id="txt65">13</li><li aria-selected="false" id="txt64">14</li><li aria-selected="false" id="txt63">15</li><li aria-selected="false" id="txt62">16</li><li aria-selected="false" id="txt61">17</li><li aria-selected="false" id="txt60">18</li><li aria-selected="false" id="txt59">19</li><li aria-selected="false" id="txt58">20</li><li aria-selected="false" id="txt57">21</li><li aria-selected="false" id="txt56">22</li><li aria-selected="false" id="txt55">23</li><li aria-selected="false" id="txt54">24</li><li aria-selected="false" id="txt53">25</li><li aria-selected="false" id="txt52">26</li><li aria-selected="false" id="txt51">27</li><li aria-selected="false" id="txt50">28</li><li aria-selected="false" id="txt49">29</li><li aria-selected="false" id="txt48">30</li><li aria-selected="false" id="txt47">31</li><li aria-selected="false" id="txt46">32</li><li aria-selected="false" id="txt45">33</li><li aria-selected="false" id="txt44">34</li><li aria-selected="false" id="txt43">35</li><li aria-selected="false" id="txt42">36</li><li aria-selected="false" id="txt41">37</li><li aria-selected="false" id="txt40">38</li><li aria-selected="false" id="txt39">39</li><li aria-selected="false" id="txt38">40</li><li aria-selected="false" id="txt37">41</li><li aria-selected="false" id="txt36">42</li><li aria-selected="false" id="txt35">43</li><li aria-selected="false" id="txt34">44</li><li aria-selected="false" id="txt33">45</li><li aria-selected="false" id="txt32">46</li><li aria-selected="false" id="txt31">47</li><li aria-selected="false" id="txt30">48</li><li aria-selected="false" id="txt29">49</li><li aria-selected="false" id="txt28">50</li><li aria-selected="false" id="txt27">51</li><li aria-selected="false" id="txt26">52</li><li aria-selected="false" id="txt25">53</li><li aria-selected="false" id="txt24">54</li><li aria-selected="false" id="txt23">55</li><li aria-selected="false" id="txt22">56</li><li aria-selected="false" id="txt21">57</li><li>57</li><li aria-selected="false" id="txt20">58</li><li aria-selected="false" id="txt18">59</li><li aria-selected="false" id="txt19">00</li><li>01</li><li>02</li>",
        "<li>AM</li><li aria-selected="true">PM</li><li aria-hidden="true"></li>",
      ]
    `);

    // AM/PM
    expect(isPressKeyPrevented("ArrowRight")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("PM");
    expect(isPressKeyPrevented("ArrowRight")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("PM"); // no horizontal cycling

    expect(isPressKeyPrevented("ArrowDown")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("AM");
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>09</li><li>10</li><li aria-selected="true" id="txt17">11</li><li aria-selected="false" id="txt16">12</li><li aria-selected="false" id="txt15">01</li><li aria-selected="false" id="txt14">02</li><li aria-selected="false" id="txt13">03</li><li aria-selected="false" id="txt12">04</li><li aria-selected="false" id="txt11">05</li><li aria-selected="false" id="txt10">06</li><li aria-selected="false" id="txt9">07</li><li aria-selected="false" id="txt8">08</li><li aria-selected="false" id="txt7">09</li><li aria-selected="false" id="txt6">10</li><li>10</li><li aria-selected="false" id="txt5">11</li><li aria-selected="false" id="txt3">12</li><li aria-selected="false" id="txt4">01</li><li>02</li><li>03</li>",
        "<li>56</li><li>57</li><li aria-selected="true" id="txt80">58</li><li aria-selected="false" id="txt79">59</li><li aria-selected="false" id="txt78">00</li><li aria-selected="false" id="txt77">01</li><li aria-selected="false" id="txt76">02</li><li aria-selected="false" id="txt75">03</li><li aria-selected="false" id="txt74">04</li><li aria-selected="false" id="txt73">05</li><li aria-selected="false" id="txt72">06</li><li aria-selected="false" id="txt71">07</li><li aria-selected="false" id="txt70">08</li><li aria-selected="false" id="txt69">09</li><li aria-selected="false" id="txt68">10</li><li aria-selected="false" id="txt67">11</li><li aria-selected="false" id="txt66">12</li><li aria-selected="false" id="txt65">13</li><li aria-selected="false" id="txt64">14</li><li aria-selected="false" id="txt63">15</li><li aria-selected="false" id="txt62">16</li><li aria-selected="false" id="txt61">17</li><li aria-selected="false" id="txt60">18</li><li aria-selected="false" id="txt59">19</li><li aria-selected="false" id="txt58">20</li><li aria-selected="false" id="txt57">21</li><li aria-selected="false" id="txt56">22</li><li aria-selected="false" id="txt55">23</li><li aria-selected="false" id="txt54">24</li><li aria-selected="false" id="txt53">25</li><li aria-selected="false" id="txt52">26</li><li aria-selected="false" id="txt51">27</li><li aria-selected="false" id="txt50">28</li><li aria-selected="false" id="txt49">29</li><li aria-selected="false" id="txt48">30</li><li aria-selected="false" id="txt47">31</li><li aria-selected="false" id="txt46">32</li><li aria-selected="false" id="txt45">33</li><li aria-selected="false" id="txt44">34</li><li aria-selected="false" id="txt43">35</li><li aria-selected="false" id="txt42">36</li><li aria-selected="false" id="txt41">37</li><li aria-selected="false" id="txt40">38</li><li aria-selected="false" id="txt39">39</li><li aria-selected="false" id="txt38">40</li><li aria-selected="false" id="txt37">41</li><li aria-selected="false" id="txt36">42</li><li aria-selected="false" id="txt35">43</li><li aria-selected="false" id="txt34">44</li><li aria-selected="false" id="txt33">45</li><li aria-selected="false" id="txt32">46</li><li aria-selected="false" id="txt31">47</li><li aria-selected="false" id="txt30">48</li><li aria-selected="false" id="txt29">49</li><li aria-selected="false" id="txt28">50</li><li aria-selected="false" id="txt27">51</li><li aria-selected="false" id="txt26">52</li><li aria-selected="false" id="txt25">53</li><li aria-selected="false" id="txt24">54</li><li aria-selected="false" id="txt23">55</li><li aria-selected="false" id="txt22">56</li><li aria-selected="false" id="txt21">57</li><li>57</li><li aria-selected="false" id="txt20">58</li><li aria-selected="false" id="txt18">59</li><li aria-selected="false" id="txt19">00</li><li>01</li><li>02</li>",
        "<li aria-hidden="true"></li><li aria-selected="true" aria-label="11:58 AM" id="txt82" focused="">AM</li><li aria-selected="false" id="txt81">PM</li><li aria-hidden="true"></li>",
      ]
    `);
    expect(isPressKeyPrevented("ArrowUp")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("PM");
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>09</li><li>10</li><li aria-selected="true" id="txt17">11</li><li aria-selected="false" id="txt16">12</li><li aria-selected="false" id="txt15">01</li><li aria-selected="false" id="txt14">02</li><li aria-selected="false" id="txt13">03</li><li aria-selected="false" id="txt12">04</li><li aria-selected="false" id="txt11">05</li><li aria-selected="false" id="txt10">06</li><li aria-selected="false" id="txt9">07</li><li aria-selected="false" id="txt8">08</li><li aria-selected="false" id="txt7">09</li><li aria-selected="false" id="txt6">10</li><li>10</li><li aria-selected="false" id="txt5">11</li><li aria-selected="false" id="txt3">12</li><li aria-selected="false" id="txt4">01</li><li>02</li><li>03</li>",
        "<li>56</li><li>57</li><li aria-selected="true" id="txt80">58</li><li aria-selected="false" id="txt79">59</li><li aria-selected="false" id="txt78">00</li><li aria-selected="false" id="txt77">01</li><li aria-selected="false" id="txt76">02</li><li aria-selected="false" id="txt75">03</li><li aria-selected="false" id="txt74">04</li><li aria-selected="false" id="txt73">05</li><li aria-selected="false" id="txt72">06</li><li aria-selected="false" id="txt71">07</li><li aria-selected="false" id="txt70">08</li><li aria-selected="false" id="txt69">09</li><li aria-selected="false" id="txt68">10</li><li aria-selected="false" id="txt67">11</li><li aria-selected="false" id="txt66">12</li><li aria-selected="false" id="txt65">13</li><li aria-selected="false" id="txt64">14</li><li aria-selected="false" id="txt63">15</li><li aria-selected="false" id="txt62">16</li><li aria-selected="false" id="txt61">17</li><li aria-selected="false" id="txt60">18</li><li aria-selected="false" id="txt59">19</li><li aria-selected="false" id="txt58">20</li><li aria-selected="false" id="txt57">21</li><li aria-selected="false" id="txt56">22</li><li aria-selected="false" id="txt55">23</li><li aria-selected="false" id="txt54">24</li><li aria-selected="false" id="txt53">25</li><li aria-selected="false" id="txt52">26</li><li aria-selected="false" id="txt51">27</li><li aria-selected="false" id="txt50">28</li><li aria-selected="false" id="txt49">29</li><li aria-selected="false" id="txt48">30</li><li aria-selected="false" id="txt47">31</li><li aria-selected="false" id="txt46">32</li><li aria-selected="false" id="txt45">33</li><li aria-selected="false" id="txt44">34</li><li aria-selected="false" id="txt43">35</li><li aria-selected="false" id="txt42">36</li><li aria-selected="false" id="txt41">37</li><li aria-selected="false" id="txt40">38</li><li aria-selected="false" id="txt39">39</li><li aria-selected="false" id="txt38">40</li><li aria-selected="false" id="txt37">41</li><li aria-selected="false" id="txt36">42</li><li aria-selected="false" id="txt35">43</li><li aria-selected="false" id="txt34">44</li><li aria-selected="false" id="txt33">45</li><li aria-selected="false" id="txt32">46</li><li aria-selected="false" id="txt31">47</li><li aria-selected="false" id="txt30">48</li><li aria-selected="false" id="txt29">49</li><li aria-selected="false" id="txt28">50</li><li aria-selected="false" id="txt27">51</li><li aria-selected="false" id="txt26">52</li><li aria-selected="false" id="txt25">53</li><li aria-selected="false" id="txt24">54</li><li aria-selected="false" id="txt23">55</li><li aria-selected="false" id="txt22">56</li><li aria-selected="false" id="txt21">57</li><li>57</li><li aria-selected="false" id="txt20">58</li><li aria-selected="false" id="txt18">59</li><li aria-selected="false" id="txt19">00</li><li>01</li><li>02</li>",
        "<li aria-hidden="true"></li><li aria-selected="false" id="txt82">AM</li><li aria-selected="true" id="txt81" aria-label="11:58 PM" focused="">PM</li><li aria-hidden="true"></li><li aria-hidden="true"></li>",
      ]
    `);
    expect(isPressKeyPrevented("ArrowDown")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("AM");

    // go to Hours
    expect(isPressKeyPrevented("ArrowLeft")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("58");
    expect(isPressKeyPrevented("ArrowLeft")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("11");
    expect(isPressKeyPrevented("ArrowLeft")).toBe(true);
    expect(el.querySelector("[focused]")?.textContent).toBe("11"); // no horizontal cycling

    // submit by Enter
    expect(isPressKeyPrevented("Enter")).toBe(true);
    await h.wait();
    expect(el.$value).toEqual(new WUPTimeObject(11, 58));
    expect(el.$refInput.value).toBe("11:58 AM");
    expect(onChanged).toBeCalledTimes(1);
    expect(onSubmit).toBeCalledTimes(0);
    expect(el.$isValid).toBe(true);
    expect(isPressKeyPrevented("Enter")).toBe(true);
    await h.wait(1);
    expect(onSubmit).toBeCalledTimes(1);
    expect(el.$isOpen).toBe(false);

    // changing value to check if menu is refreshed according to ones
    el.$value = undefined;
    await h.wait(1);
    await h.userTypeText(el.$refInput, "05:37 PM");
    expect(el.$value).toEqual(new WUPTimeObject(17, 37));

    // checking if user can use mouse properly
    onChanged.mockClear();
    expect(el.$isOpen).toBe(false);
    expect(isPressKeyPrevented("ArrowDown")).toBe(true); // open menu by arrow key
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>03</li><li>04</li><li aria-selected="true" aria-label="05:37 PM" id="txt83" focused="">05</li><li>06</li><li>07</li>",
        "<li>35</li><li>36</li><li aria-selected="true">37</li><li>38</li><li>39</li>",
        "<li aria-selected="false" id="txt82">AM</li><li aria-selected="true" id="txt81">PM</li><li aria-hidden="true"></li>",
      ]
    `);

    await h.userClick(el.$refMenuLists[0].firstElementChild);
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>01</li><li>02</li><li aria-selected="true" aria-label="03:37 PM" id="txt85" focused="">03</li><li aria-selected="false" id="txt84">04</li><li aria-selected="false" id="txt83">05</li>",
        "<li>35</li><li>36</li><li aria-selected="true">37</li><li>38</li><li>39</li>",
        "<li aria-selected="false" id="txt82">AM</li><li aria-selected="true" id="txt81">PM</li><li aria-hidden="true"></li>",
      ]
    `);

    await h.userClick(el.$refMenuLists[1].lastElementChild);
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>01</li><li>02</li><li aria-selected="true" id="txt85">03</li><li aria-selected="false" id="txt84">04</li><li aria-selected="false" id="txt83">05</li>",
        "<li aria-selected="false">37</li><li aria-selected="false" id="txt86">38</li><li aria-selected="true" aria-label="03:39 PM" id="txt87" focused="">39</li><li>40</li><li>41</li>",
        "<li aria-selected="false" id="txt82">AM</li><li aria-selected="true" id="txt81">PM</li><li aria-hidden="true"></li>",
      ]
    `);

    await h.userClick(el.$refMenuLists[2].lastElementChild);
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>01</li><li>02</li><li aria-selected="true" id="txt85">03</li><li aria-selected="false" id="txt84">04</li><li aria-selected="false" id="txt83">05</li>",
        "<li aria-selected="false">37</li><li aria-selected="false" id="txt86">38</li><li aria-selected="true" aria-label="03:39 PM" id="txt87" focused="">39</li><li>40</li><li>41</li>",
        "<li aria-selected="false" id="txt82">AM</li><li aria-selected="true" id="txt81">PM</li><li aria-hidden="true"></li>",
      ]
    `);

    // click on btnOk
    await h.userClick(el.$refButtonOk.parentElement); // outside click - just for coverage
    await h.userClick(el.$refButtonOk);
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$value).toEqual(new WUPTimeObject(15, 39));
    expect(onChanged).toBeCalledTimes(1);

    // click on btnCancel
    onChanged.mockClear();
    expect(isPressKeyPrevented("ArrowDown")).toBe(true); // open menu by arrow key
    expect(el.$isOpen).toBe(true);
    await h.wait();
    await h.userClick(el.$refMenuLists[0].firstElementChild);
    await h.wait();
    await h.userClick(el.$refButtonCancel);
    await h.wait();
    expect(el.$isOpen).toBe(false);
    expect(el.$value).toEqual(new WUPTimeObject(15, 39)); // no changes because popup is closed by cancelling
    expect(onChanged).toBeCalledTimes(0);

    el.$value = new WUPTimeObject(0, 0);
    expect(isPressKeyPrevented("ArrowDown")).toBe(true); // open menu by arrow key
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>10</li><li>11</li><li aria-selected="true" aria-label="12:00 AM" id="txt90" focused="">12</li><li>01</li><li>02</li>",
        "<li>58</li><li>59</li><li aria-selected="true">00</li><li>01</li><li>02</li>",
        "<li aria-hidden="true"></li><li aria-selected="true" id="txt82">AM</li><li aria-selected="false" id="txt81">PM</li>",
      ]
    `);
    el.$refMenuLists[0].dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 })); // scrollUp
    el.$refMenuLists[1].dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 })); // scrollUp
    el.$refMenuLists[2].dispatchEvent(new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -100 })); // scrollUp
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>09</li><li>10</li><li aria-selected="true" id="txt103">11</li><li aria-selected="false" id="txt102">12</li><li aria-selected="false" id="txt101">01</li>",
        "<li>57</li><li>58</li><li aria-selected="true" aria-label="11:59 AM" id="txt164" focused="">59</li><li aria-selected="false" id="txt163">00</li><li aria-selected="false" id="txt162">01</li>",
        "<li aria-hidden="true"></li><li aria-selected="true" id="txt82">AM</li><li aria-selected="false" id="txt81">PM</li>",
      ]
    `);
  });

  test("menu in 1 row", async () => {
    const orig = el.renderMenu;
    el.renderMenu = function renderMenu(popup, menuId, rows) {
      rows = 1;
      orig.call(el, popup, menuId, rows);
    };

    el.focus();
    await h.wait();
    const isPressKeyPrevented = (key = "Arrow", opts = { shiftKey: false, ctrlKey: false }) => {
      const isPrevented = !el.$refInput.dispatchEvent(
        new KeyboardEvent("keydown", { key, cancelable: true, bubbles: true, ...opts })
      );
      return isPrevented;
    };

    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li aria-selected="true">12</li>",
        "<li aria-selected="true">23</li>",
        "<li aria-selected="true">AM</li>",
      ]
    `);
    expect(isPressKeyPrevented("ArrowDown")).toBe(true);
    expect(isPressKeyPrevented("ArrowDown")).toBe(true);

    expect(isPressKeyPrevented("ArrowRight")).toBe(true);
    expect(isPressKeyPrevented("ArrowDown")).toBe(true);

    expect(isPressKeyPrevented("ArrowRight")).toBe(true);
    expect(isPressKeyPrevented("ArrowDown")).toBe(true);
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li aria-selected="true" id="txt14">02</li>",
        "<li aria-selected="true" id="txt16">24</li>",
        "<li aria-selected="true" aria-label="02:24 PM" id="txt18" focused="">PM</li>",
      ]
    `);
    expect(isPressKeyPrevented("ArrowUp")).toBe(true);
    expect(el.$refMenuLists[2].innerHTML).toMatchInlineSnapshot(
      `"<li aria-selected="true" aria-label="02:24 AM" id="txt19" focused="">AM</li><li aria-selected="false" id="txt18">PM</li>"`
    );
  });

  test("value change not affects on menu", async () => {
    el.focus();
    await h.wait();
    expect(el.$isOpen).toBe(true);

    el.$value = new WUPTimeObject(12, 56);
    await h.wait();
    expect(el.$isOpen).toBe(true);
  });

  test("menu with options min/max/exclude", async () => {
    const onChange = jest.fn();
    el.addEventListener("$change", onChange);
    el.$options.min = new WUPTimeObject(3, 50);
    el.$options.max = new WUPTimeObject(23, 50);
    el.$options.exclude = { test: (v) => v === new WUPTimeObject(14, 0).valueOf() };
    await h.wait(1);

    el.focus();
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>10</li><li>11</li><li aria-selected="true" disabled="">12</li><li disabled="">01</li><li disabled="">02</li>",
        "<li disabled="">21</li><li disabled="">22</li><li aria-selected="true" disabled="">23</li><li disabled="">24</li><li disabled="">25</li>",
        "<li aria-hidden="true"></li><li aria-selected="true">AM</li><li>PM</li>",
      ]
    `);
    expect(el.$refButtonOk.parentElement.outerHTML).toMatchInlineSnapshot(
      `"<div group=""><button type="button" aria-label="Ok" tabindex="-1" disabled=""></button><button type="button" aria-label="Cancel" tabindex="-1"></button></div>"`
    );
    expect(el.$refButtonOk.disabled).toBe(true);
    const isPrevented = !el.$refInput.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );
    await h.wait();
    expect(el.$isOpen).toBe(true);
    expect(isPrevented).toBe(true);
    expect(onChange).toBeCalledTimes(0); // because selected value is not allowed

    await h.userClick(el.$refMenuLists[0].firstElementChild);
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>08</li><li>09</li><li aria-selected="true">10</li><li aria-selected="false">11</li><li aria-selected="false" disabled="">12</li>",
        "<li>21</li><li>22</li><li aria-selected="true">23</li><li>24</li><li>25</li>",
        "<li aria-hidden="true"></li><li aria-selected="true">AM</li><li>PM</li>",
      ]
    `);
    expect(el.$refButtonOk.disabled).toBe(false);

    // PM must be disabled
    el.blur();
    await h.wait();
    el.$options.max = new WUPTimeObject(11, 50);
    el.focus();
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>10</li><li>11</li><li aria-selected="true" disabled="">12</li><li disabled="">01</li><li disabled="">02</li>",
        "<li disabled="">21</li><li disabled="">22</li><li aria-selected="true" disabled="">23</li><li disabled="">24</li><li disabled="">25</li>",
        "<li aria-hidden="true"></li><li aria-selected="true">AM</li><li disabled="">PM</li>",
      ]
    `);

    // again with 24h format
    await h.wait();
    el.blur();
    await h.wait();
    el.$options.format = "hh:mm";
    await h.wait(1);
    el.focus();
    await h.wait();
    expect(el.$refMenuLists.map((l) => l.innerHTML)).toMatchInlineSnapshot(`
      [
        "<li>10</li><li>11</li><li aria-selected="true" disabled="">12</li><li disabled="">13</li><li disabled="">14</li>",
        "<li disabled="">21</li><li disabled="">22</li><li aria-selected="true" disabled="">23</li><li disabled="">24</li><li disabled="">25</li>",
      ]
    `);

    // just for coverage
    await h.wait();
    el.blur();
    await h.wait();
    jest.spyOn(el, "canShowMenu").mockReturnValueOnce(false);
    expect(() => el.focus()).not.toThrow();
    await h.wait();
    expect(el.$isOpen).toBe(false);
  });
});