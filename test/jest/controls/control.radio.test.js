/* eslint-disable prefer-destructuring */
import { WUPRadioControl } from "web-ui-pack";
import WUPBaseControl from "web-ui-pack/controls/baseControl";
import observer from "web-ui-pack/helpers/observer";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";
import * as h from "../../testHelper";

const getItems = () => [
  { value: 10, text: "Donny" },
  { value: 20, text: "Mikky" },
  { value: 30, text: "Leo" },
  { value: 40, text: "Splinter" },
];

/** @type WUPRadioControl */
let testEl;
initTestBaseControl({
  type: WUPRadioControl,
  htmlTag: "wup-radio",
  onInit: (e) => {
    testEl = e;
    testEl.$options.items = getItems();
    jest.spyOn(Date, "now").mockImplementation(() => 1661259326473); // required to have same snapshots otherwise items-names are new
  },
});

describe("control.radio", () => {
  testBaseControl({
    noInputSelection: true,
    initValues: [
      { attrValue: "10", value: 10 },
      { attrValue: "20", value: 20 },
      { attrValue: "30", value: 30 },
    ],
    validations: {},
    attrs: {
      items: { value: getItems() },
      reverse: { value: true, equalValue: "" },
    },
    onCreateNew: (e) => (e.$options.items = getItems()),
    testReadonly: { true: (el) => expect(el).toMatchSnapshot(), false: (el) => expect(el).toMatchSnapshot() },
  });

  test("$options.items vs [items]", () => {
    const el = testEl;

    el.$options.items = [{ value: "sss", text: "Ms" }];
    jest.advanceTimersByTime(1);
    expect(el.$options.items).toEqual([{ value: "sss", text: "Ms" }]);
    expect(el.getAttribute("items")).toBeFalsy();

    window.testItems = [{ value: 1, text: "Number 1" }];
    el.setAttribute("items", "testItems");
    jest.advanceTimersByTime(1);
    expect(el.$options.items).toEqual([{ value: 1, text: "Number 1" }]);
    expect(el.getAttribute("items")).toBe("testItems");

    el.$options.items = [{ value: 33, text: "#33" }];
    jest.advanceTimersByTime(1);
    expect(el.$options.items).toEqual([{ value: 33, text: "#33" }]);
    expect(el.getAttribute("items")).toBeFalsy();

    el.$options.items = () => [{ value: 234, text: "Don" }]; // checking function
    jest.advanceTimersByTime(1);
    expect(el.$refItems.length).toBe(1);
    expect(el.querySelectorAll("input").length).toBe(1);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<fieldset><legend><strong></strong></legend><label for="txt13"><input id="txt13" type="radio" name="txt12473" tabindex="0" autocomplete="off"><span>Don</span></label></fieldset>"`
    );

    el.$options.items = [
      {
        value: 123,
        text: (val, li, i) => {
          li.textContent = `testVal${val}_${i}`;
        },
      },
    ];
    jest.advanceTimersByTime(1);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<fieldset><legend><strong></strong></legend><label for="txt15"><input id="txt15" type="radio" name="txt14473" tabindex="0" autocomplete="off"><span>testVal123_0</span></label></fieldset>"`
    );

    const prev = el.$options.items;
    const onErr = jest.spyOn(el, "throwError").mockImplementationOnce(() => {});
    el.setAttribute("items", "missedGlobalKey");
    jest.advanceTimersByTime(1);
    expect(el.$options.items).toStrictEqual(prev);
    expect(onErr.mock.lastCall[0]).toMatchInlineSnapshot(
      `"Value not found according to attribute [items] in 'window.missedGlobalKey'"`
    );
  });

  test("$options.items & $value", () => {
    testEl = document.body.appendChild(document.createElement(testEl.tagName));
    let el = testEl;
    const onErr = h.mockConsoleError();
    // before ready
    el.$options.items = [{ text: "Helica", value: 10 }];
    el.$value = 10;
    jest.advanceTimersByTime(2);
    expect(onErr).not.toBeCalled();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<fieldset><legend><strong></strong></legend><label for="txt7"><input id="txt7" type="radio" name="txt6473" tabindex="0" autocomplete="off"><span>Helica</span></label></fieldset>"`
    );
    // after ready
    el.$options.items = [{ text: "Harry", value: 11 }];
    el.$value = 11;
    jest.advanceTimersByTime(2);
    expect(onErr).not.toBeCalled();
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<fieldset><legend><strong></strong></legend><label for="txt9"><input id="txt9" type="radio" name="txt8473" tabindex="0" autocomplete="off"><span>Harry</span></label></fieldset>"`
    );

    const item = { text: "Helica", value: 5 };
    el.$options.items = [item];
    jest.advanceTimersByTime(2);
    expect(onErr).toBeCalledTimes(1); // because it doesn't fit value 11
    expect(el.$options.items[0]).toBe(item); // nested items must be not observed
    expect(observer.isObserved(el.$options.items)).toBe(true); // but Array items itself must be observed

    // complex values with id's
    el = document.body.appendChild(document.createElement(el.tagName));
    el.$options.items = [
      { text: "Helica", value: { id: 1, name: "He" } },
      { text: "Diana", value: { id: 2, name: "Di" } },
    ];
    el.$value = { id: 2 };
    jest.advanceTimersByTime(2);
    expect(el.innerHTML).toMatchInlineSnapshot(
      `"<fieldset><legend><strong></strong></legend><label for="txt13"><input id="txt13" type="radio" name="txt12473" tabindex="0"><span>Helica</span></label><label for="txt14"><input id="txt14" type="radio" name="txt12473"><span>Diana</span></label></fieldset>"`
    );
  });

  test("$options.items is complex object", async () => {
    const onErr = h.mockConsoleError();
    const el = testEl;
    const items = [
      { text: "a1", value: { name: "Dik" } },
      { text: "a2", value: { name: "Yomma" } },
    ];
    el.$options.items = items;
    jest.advanceTimersByTime(1); // to apply changes
    el.$value = "hi";
    await h.wait();
    expect(onErr).toBeCalledTimes(1); // value not found in itmes
    expect(el.$options.items).not.toBe(items); // because $options.items is Proxy

    onErr.mockClear();
    el.$value = items[1].value;
    await h.wait();
    expect(onErr).not.toBeCalled();

    onErr.mockClear();
    el.$value = el.$options.items[0].value;
    await h.wait();
    expect(onErr).not.toBeCalled();
  });

  test("parsing $initValue", () => {
    const el = testEl;
    el.$initValue = 20;
    el.setAttribute("initvalue", "");
    jest.advanceTimersByTime(1);
    expect(el.$initValue).toBe(undefined);

    el.setAttribute("initvalue", "10");
    jest.advanceTimersByTime(1);
    expect(el.$initValue).toBe(10);

    el.setAttribute("initvalue", "333");
    jest.advanceTimersByTime(1);
    expect(el.$initValue).toBe(undefined);

    el.setAttribute("initvalue", "20");
    jest.advanceTimersByTime(1);
    expect(el.$initValue).toBe(20);

    h.mockConsoleError(); // because of items changed but initValue doesn't matches
    el.$options.items = [{ value: null, text: "Empty" }];
    jest.advanceTimersByTime(1);

    el.$options.name = "TestMe"; // again with name - for coverage
    el.$options.items = [{ value: null, text: "Empty" }];
    jest.advanceTimersByTime(1);
    h.unMockConsoleError();

    el.setAttribute("initvalue", "");
    jest.advanceTimersByTime(1);
    expect(el.getAttribute("initvalue")).toBe("");
    expect(el.$initValue).toBe(null);

    // just for coverage
    el.$options.items = [];
    jest.advanceTimersByTime(1);
    el.$initValue = undefined;
    expect(el.innerHTML).toMatchInlineSnapshot(`"<fieldset><legend><strong>Test Me</strong></legend></fieldset>"`);
    el.setAttribute("initvalue", "10");
    jest.advanceTimersByTime(1);

    const f = h.mockConsoleError();
    el.$initValue = 13;
    jest.advanceTimersByTime(1);
    expect(el.hasAttribute("initvalue")).toBe(false);
    expect(f).toBeCalled();
    h.unMockConsoleError();

    // checking if initValue assigned correctly
    const me = document.body.appendChild(document.createElement("wup-radio"));
    me.$options.items = [
      { value: 1, text: "Its one" },
      { value: 12, text: "Its number" },
    ];
    me.$initValue = 12;
    jest.advanceTimersByTime(1);
    expect(me.$value).toBe(12);
    expect(me.$refInput).toBe(me.$refItems[1]);
  });

  test("user clicks on radio", () => {
    const el = testEl;
    expect(el.$value).toBe(undefined);
    expect(el.$isChanged).toBe(false);

    el.$refItems[0].click();
    expect(el.$value).toBe(10);
    expect(el.$isChanged).toBe(true);
    expect(el.$refInput).toBe(el.$refItems[0]);

    el.$refItems[0].click();
    expect(el.$value).toBe(10);

    el.$refItems[1].click();
    expect(el.$value).toBe(20);
    expect(el.$isChanged).toBe(true);
    expect(el.$refInput).toBe(el.$refItems[1]);
  });

  test("[readOnly] prevents changing", () => {
    const el = testEl;
    el.$options.readOnly = true;
    jest.advanceTimersByTime(1);
    expect(el.$value).toBe(undefined);

    el.$refItems[0].click();
    expect(el.$value).toBe(undefined);

    el.$value = 20;
    el.$refInput.click();
    expect(el.$value).toBe(20);
    el.$refInput.click();
    expect(el.$value).toBe(20);
  });

  test("focus on current input", () => {
    let el = testEl;
    el.$value = 20;
    jest.advanceTimersByTime(1);
    expect(el.$refInput).toBe(el.$refItems[1]);
    el.focus();
    expect(document.activeElement).toBe(el.$refItems[1]);

    document.activeElement.blur();
    el.$refItems[1].disabled = true;
    el.focus();
    expect(document.activeElement).toBe(el.$refItems[0]);

    el.$refItems[1].disabled = false;
    el.focus();
    expect(document.activeElement).toBe(el.$refItems[1]);

    window.items = getItems();
    document.body.innerHTML = `
      <wup-form autofocus>
        <wup-radio initvalue="20" items="window.items"></wup-radio>
      </wup-form>
    `;
    jest.advanceTimersByTime(1);
    expect(document.body).toMatchInlineSnapshot(`
      <body>
        
            
        <wup-form
          autofocus=""
          role="form"
        >
          
              
          <wup-radio
            initvalue="20"
            items="window.items"
          >
            <fieldset>
              <legend>
                <strong />
              </legend>
              <label
                for="txt7"
              >
                <input
                  id="txt7"
                  name="txt6473"
                  tabindex="0"
                  type="radio"
                />
                <span>
                  Donny
                </span>
              </label>
              <label
                for="txt8"
              >
                <input
                  autocomplete="off"
                  id="txt8"
                  name="txt6473"
                  type="radio"
                />
                <span>
                  Mikky
                </span>
              </label>
              <label
                for="txt9"
              >
                <input
                  id="txt9"
                  name="txt6473"
                  type="radio"
                />
                <span>
                  Leo
                </span>
              </label>
              <label
                for="txt10"
              >
                <input
                  id="txt10"
                  name="txt6473"
                  type="radio"
                />
                <span>
                  Splinter
                </span>
              </label>
            </fieldset>
          </wup-radio>
          
            
        </wup-form>
        
          
      </body>
    `);
    el = document.body.querySelector("wup-radio");
    expect(document.activeElement).toBe(el.$refItems[1]);
  });

  test("storage", async () => {
    let el = testEl;
    const onThrowErr = jest.spyOn(WUPBaseControl.prototype, "throwError");
    const onConsoleErr = h.mockConsoleError();
    // with falsy value
    const items = getItems();
    items[0].value = null;

    el.$options.storageKey = "rd";
    el.$options.items = items;
    await h.wait(1);
    el.$value = null;
    await h.wait(1);
    expect(window.localStorage.getItem("rd")).toBe("null");
    expect(onThrowErr).not.toBeCalled();
    expect(onConsoleErr).not.toBeCalled();

    el = document.body.appendChild(document.createElement(el.tagName));
    el.$options.items = items;
    expect(el.$value).toBe(undefined);
    el.$options.storageKey = "rd";
    await h.wait(1);
    expect(el.$value).toBe(null);
    window.localStorage.clear();
    await h.wait();
    expect(onConsoleErr).not.toBeCalled();
    expect(onThrowErr).not.toBeCalled();

    // value is complex object
    items[0].value = { name: "Serge" };
    el = document.body.appendChild(document.createElement(el.tagName));
    el.$options.items = items;
    await h.wait(1);
    el.$options.storageKey = "rd";
    await h.wait(1);
    onConsoleErr.mockClear();
    // eslint-disable-next-line prefer-destructuring
    el.$value = items[0].value;
    expect(() => jest.advanceTimersByTime(1000)).toThrow(); // complex value isn't supported
    expect(onThrowErr).toBeCalled();
    expect(onConsoleErr).not.toBeCalled();
  });
});
