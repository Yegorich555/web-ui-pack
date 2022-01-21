import WUPPopupElement from "web-ui-pack/popupElement";
import * as h from "../testHelper";

jest.useFakeTimers();
/** @type WUPPopupElement */
let el;

beforeAll(() => {
  h.mockConsoleWarn();
});

afterAll(() => {
  h.unMockConsoleWarn();
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  el = document.body.appendChild(document.createElement("test-inher-el"));
});

afterEach(() => {
  el?.remove();
  el = null;
  document.body.innerHTML = "";
});

describe("popupElement", () => {
  describe("me", () => {
    h.testComponentFuncBind(document.createElement("wup-popup"));
  });
  describe("inheritance", () => {
    class TestPopupElement extends WUPPopupElement {}
    customElements.define("test-el", TestPopupElement);
    h.testComponentFuncBind(document.createElement("test-el"));
  });
});
