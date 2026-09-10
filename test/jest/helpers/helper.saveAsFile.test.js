import saveAsFile from "web-ui-pack/helpers/files/saveAsFile";

// jsdom (jest 29) implements neither of them
const urls = [];
global.URL.createObjectURL = jest.fn((b) => {
  urls.push(b);
  return `blob:test/${urls.length - 1}`;
});
global.URL.revokeObjectURL = jest.fn();

describe("helper.saveAsFile", () => {
  /** anchors that the helper has clicked */
  let clicked = [];

  beforeEach(() => {
    jest.useFakeTimers();
    clicked = [];
    urls.length = 0;
    jest.clearAllMocks();
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function click() {
      // WARN: the anchor is removed right after the click, so everything must be captured here
      clicked.push({ href: this.href, download: this.download, rel: this.rel, isAttached: this.isConnected });
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test("clicks a hidden <a download> & cleans up everything", () => {
    const blob = new Blob(["hello"], { type: "text/plain" });
    expect(saveAsFile(blob, "savedfile.txt")).toBeUndefined();

    // the url is created for the pointed blob & the anchor points to it
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(urls[0]).toBe(blob);
    expect(clicked).toEqual([{ href: "blob:test/0", download: "savedfile.txt", rel: "noopener", isAttached: true }]);
    // ...the anchor is attached only for the click-time: Firefox ignores a click on a detached one
    expect(document.querySelector("a")).toBeNull();

    // the url is revoked with a delay: an immediate revoking can abort the download
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    jest.advanceTimersByTime(39_000);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/0");
  });

  test("every call is independent", () => {
    saveAsFile(new Blob(["1"]), "one.txt");
    saveAsFile(new Blob(["2"]), "two.csv");
    expect(clicked.map((a) => `${a.download}:${a.href}`)).toEqual(["one.txt:blob:test/0", "two.csv:blob:test/1"]);
    expect(document.body.innerHTML).toBe("");

    jest.advanceTimersByTime(40_000);
    expect(URL.revokeObjectURL.mock.calls).toEqual([["blob:test/0"], ["blob:test/1"]]);
  });

  test("cleans up even when the click is failed", () => {
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
      throw new Error("test click");
    });
    expect(() => saveAsFile(new Blob(["1"]), "err.txt")).toThrow("test click");
    // the anchor is detached & the url is revoked anyway
    expect(document.body.innerHTML).toBe("");
    jest.advanceTimersByTime(40_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test/0");
  });
});
