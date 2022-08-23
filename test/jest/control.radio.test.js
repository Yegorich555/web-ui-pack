import { WUPRadioControl } from "web-ui-pack";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";

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
    attrs: { items: { skip: true } },
    $options: { items: { skip: true } },
    // attrs: { defaultchecked: { skip: true } },
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
      `"<fieldset><legend><strong></strong></legend><label for=\\"txt13\\"><input id=\\"txt13\\" type=\\"radio\\" name=\\"txt12473\\" tabindex=\\"0\\"><span>Don</span></label></fieldset>"`
    );
  });

  // test("parsing $initValue", () => {
  //   const el = testEl;
  //   el.testMe = true;
  //   el.$initValue = 20;

  //   el.setAttribute("initvalue", "333");
  //   jest.advanceTimersByTime(1);
  //   expect(el.$initValue).toBe(undefined); // because not found

  //   el.$options.items = [{ value: null, text: "Me" }];
  //   jest.advanceTimersByTime(1);
  //   el.setAttribute("initvalue", "");
  //   jest.advanceTimersByTime(1);
  //   expect(el.$initValue).toBe(null);

  //   el.$options.items = [{ value: 10, text: "Me" }];
  //   el.setAttribute("initvalue", "");
  //   jest.advanceTimersByTime(1);
  //   expect(el.$initValue).toBe(null);
  // });

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
});
