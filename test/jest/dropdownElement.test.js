import { WUPDropdownElement } from "web-ui-pack";
// import * as h from "../testHelper";

/** @type WUPDropdownElement */
let el;

beforeEach(() => {
  !WUPDropdownElement && console.error("missed");
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
});

describe("dropdownElement", () => {
  test("basic usage", async () => {
    // todo implement
  });
});
