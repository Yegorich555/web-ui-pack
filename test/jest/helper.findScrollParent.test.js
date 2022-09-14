import findScrollParent, { findScrollParentAll } from "web-ui-pack/helpers/findScrollParent";

afterEach(() => {
  document.body.innerHTML = "";
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

beforeEach(() => {
  // default scenario when no items places
  jest.spyOn(document.body, "scrollTop", "set").mockImplementation(() => 0);
  jest.spyOn(document.body.parentElement, "scrollTop", "set").mockImplementation(() => 0);
  jest.spyOn(document.body, "scrollLeft", "set").mockImplementation(() => 0);
  jest.spyOn(document.body.parentElement, "scrollLeft", "set").mockImplementation(() => 0);
});

describe("helper.findScrollParent", () => {
  test("default behavior", () => {
    const el = document.body.appendChild(document.createElement("div"));
    expect(findScrollParent(el)).toBeNull();
    expect(findScrollParent(document.body)).toBeNull();

    jest.restoreAllMocks(); // to allow change srollTop for body
    expect(findScrollParent(el) === document.body).toBe(true);

    document.body.scrollLeft = 2; // cover case when item is scrolled
    expect(findScrollParent(el) === document.body).toBe(true);
    document.body.scrollLeft = 0;

    jest.spyOn(document.body, "scrollTop", "set").mockImplementation(() => 0);
    expect(findScrollParent(el) === document.body).toBe(true); // because scrollLeft possible
  });

  test("helper.findScrollParentAll", () => {
    const el = document.body.appendChild(document.createElement("div"));
    expect(findScrollParentAll(el)).toBeNull();
    expect(findScrollParentAll(document.body)).toBeNull();

    jest.restoreAllMocks(); // to allow change srollTop for body
    jest.spyOn(document.body.parentElement, "scrollTop", "set").mockImplementation(() => 0);
    jest.spyOn(document.body.parentElement, "scrollLeft", "set").mockImplementation(() => 0);
    expect(findScrollParentAll(el)).toEqual([document.body]);

    // move element to nested
    const main = document.body.appendChild(document.createElement("main"));
    main.appendChild(el);

    expect(findScrollParentAll(el)).toEqual([main, document.body]); // because scrollTop possible now
    // check when main without scroll
    jest.spyOn(main, "scrollTop", "set").mockImplementation(() => 0);
    jest.spyOn(main, "scrollLeft", "set").mockImplementation(() => 0);
    expect(findScrollParentAll(el)).toEqual([document.body]);

    jest.restoreAllMocks(); // to allow change srollTop for body
    jest.spyOn(main, "scrollLeft", "set").mockImplementation(() => 0); // for checking scrollLeft
    expect(findScrollParentAll(el)).toEqual([main, document.body, document.body.parentElement]); // in reality it's impossible but for simlation it's ok
  });
});
