import { WUPModalElement } from "web-ui-pack";
import * as h from "../testHelper";

let nextFrame = async () => {};
/** @type WUPModalElement */
let el;

beforeEach(() => {
  WUPModalElement.$use();
  jest.useFakeTimers();
  const a = h.useFakeAnimation();
  nextFrame = a.nextFrame;
  el = document.body.appendChild(document.createElement("wup-modal"));
  jest.advanceTimersToNextTimer(); // gotReady has timeout
  jest.spyOn(window, "matchMedia").mockReturnValue({ matches: true }); // simulate 'prefers-reduced-motion'
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("modalElement", () => {
  h.baseTestComponent(() => document.createElement("wup-modal"), {
    attrs: {
      // todo point supported attrs here
    },
    // onCreateNew: (e) => (e.$options.items = getItems()),
  });

  // todo add tests
});
