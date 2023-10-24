import { WUPModalElement } from "web-ui-pack";
import * as h from "../testHelper";

/** @type WUPModalElement */
let el;

beforeEach(() => {
  WUPModalElement.$use();
  jest.useFakeTimers();
  el = document.body.appendChild(document.createElement("wup-modal"));
  el.appendChild(document.createElement("h2"));
  jest.advanceTimersToNextTimer(); // gotReady has timeout
  jest.spyOn(window, "matchMedia").mockReturnValue({ matches: true }); // simulate 'prefers-reduced-motion'
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("modalElement", () => {
  h.baseTestComponent(
    () => {
      const a = document.createElement("wup-modal");
      a.appendChild(document.createElement("h2"));
      return a;
    },
    {
      attrs: {
        "w-autofocus": { value: true },
        "w-placement": { value: "center" },
        "w-target": { value: "body", parsedValue: document.body },
      },
      // onCreateNew: (e) => (e.$options.items = getItems()),
    }
  );

  // todo add tests
});
