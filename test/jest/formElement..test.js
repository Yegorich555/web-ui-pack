import { WUPFormElement } from "web-ui-pack";

/** @type WUPFormElement */
let el;

beforeEach(() => {
  jest.useFakeTimers();
  // eslint-disable-next-line no-self-assign
  WUPFormElement.$defaults.submitActions = WUPFormElement.$defaults.submitActions;
  el = document.body.appendChild(document.createElement("wup-form"));
  const inp1 = el.appendChild(document.createElement("wup-text"));
  inp1.$options.name = "email";
  const inp2 = el.appendChild(document.createElement("wup-text"));
  inp2.$options.name = "firstName";
  const inp3 = el.appendChild(document.createElement("wup-text"));
  inp3.$options.name = undefined;
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("formElement", () => {
  test("$initModel", () => {
    // testcase: check if set model={v: 1} shouldn't reset control with other names
  });
});
