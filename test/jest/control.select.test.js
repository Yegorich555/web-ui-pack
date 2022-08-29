import { WUPSelectControl } from "web-ui-pack";
import { initTestBaseControl, testBaseControl } from "./baseControlTest";

const getItems = () => [
  { value: 10, text: "Donny" },
  { value: 20, text: "Mikky" },
  { value: 30, text: "Leo" },
  { value: 40, text: "Splinter" },
];

/** @type WUPSelectControl */
let testEl;
initTestBaseControl({
  type: WUPSelectControl,
  htmlTag: "wup-select",
  onInit: (e) => {
    testEl = e;
    testEl.$options.items = getItems();
  },
});

describe("control.select", () => {
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
    // testReadonly: { true: (el) => expect(el).toMatchSnapshot(), false: (el) => expect(el).toMatchSnapshot() },
  });
});
