import { WUPNotifyElement } from "web-ui-pack";
import * as h from "../testHelper";

/** @type WUPNotifyElement */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let el;

beforeEach(() => {
  WUPNotifyElement.$use();
  jest.useFakeTimers();
  el = document.body.appendChild(document.createElement("wup-notify"));
  jest.spyOn(WUPNotifyElement, "$uniqueId", "get").mockImplementation(() => "sID");
  jest.advanceTimersToNextTimer(); // gotReady has timeout
  jest.spyOn(window, "matchMedia").mockReturnValue({ matches: true }); // simulate 'prefers-reduced-motion'
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("notifyElement", () => {
  h.baseTestComponent(() => document.createElement("wup-notify"), {
    attrs: {
      "w-placement": { value: "bottom-left" },
      "w-autoclose": { value: 3000 },
      "w-closeonclick": { value: true },
      "w-selfremove": { value: true },
      "w-opencase": { value: 0 },
    },
    // onCreateNew: (e) => (e.$options.items = getItems()),
  });

  test("open & close", async () => {
    // todo continue tests here
  });
});
