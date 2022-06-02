import findScrollParent, { findScrollParentAll } from "web-ui-pack/helpers/findScrollParent";

afterEach(() => {
  document.body.innerHTML = "";
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

beforeEach(() => {
  // default scenario when no items places
  jest.spyOn(document.body, "scrollTop", "get").mockImplementation(() => 0);
  jest.spyOn(document.body.parentElement, "scrollTop", "get").mockImplementation(() => 0);
});

describe("helper.findScrollParent", () => {
  test("deault behavior", () => {
    const el = document.body.appendChild(document.createElement("div"));
    expect(findScrollParent(el)).toBeNull();
    expect(findScrollParent(document.body)).toBeNull();

    jest.restoreAllMocks(); // to allow change srollTop for body
    expect(findScrollParent(el) === document.body).toBeTruthy();
  });

  test("helper.findScrollParentAll", () => {
    const el = document.body.appendChild(document.createElement("div"));
    expect(findScrollParentAll(el)).toBeNull();
    expect(findScrollParentAll(document.body)).toBeNull();

    jest.restoreAllMocks(); // to allow change srollTop for body
    jest.spyOn(document.body.parentElement, "scrollTop", "get").mockImplementation(() => 0);
    expect(findScrollParentAll(el)).toEqual([document.body]);

    // move element to nested
    const main = document.body.appendChild(document.createElement("main"));
    main.appendChild(el);

    expect(findScrollParentAll(el)).toEqual([main, document.body]); // because scrollTop possible now
    // check when main without scroll
    jest.spyOn(main, "scrollTop", "get").mockImplementation(() => 0);
    expect(findScrollParentAll(el)).toEqual([document.body]);

    jest.restoreAllMocks(); // to allow change srollTop for body
    expect(findScrollParentAll(el)).toEqual([main, document.body, document.body.parentElement]); // in reality it's impossible but for simlation it's ok
  });
});
