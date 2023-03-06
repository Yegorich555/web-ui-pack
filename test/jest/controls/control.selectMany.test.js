import { WUPSelectManyControl } from "web-ui-pack";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";

const getItems = () => [
  { value: 10, text: "Donny" },
  { value: 20, text: "Mikky" },
  { value: 30, text: "Leo" },
  { value: 40, text: "Splinter" },
];

/** @type WUPSelectManyControl */
let el;
initTestBaseControl({
  type: WUPSelectManyControl,
  htmlTag: "wup-select-many",
  onInit: (e) => {
    el = e;
    el.$options.items = getItems();
    window.$1Value = [10];
    window.$2Value = [20, 40];
    window.$3Value = [30];

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

describe("control.selectMany", () => {
  testBaseControl({
    noInputSelection: true,
    initValues: [
      { attrValue: "window.$1Value", value: [10] },
      { attrValue: "window.$2Value", value: [20, 40] },
      { attrValue: "window.$3Value", value: [30] },
    ],
    validations: {},
    validationsSkip: ["_parse", "_mask"],
    attrs: { items: { skip: true } },
    $options: { items: { skip: true } },
    onCreateNew: (e) => (e.$options.items = getItems()),
  });
});

// manual testcase (close menu by outside click): to reproduce focus > pressEsc > typeText > try close by outside click
