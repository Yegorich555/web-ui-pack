import selectFiles from "web-ui-pack/helpers/files/selectFiles";

describe("helper.selectFiles", () => {
  /** inputs that the helper has clicked */
  let clicked = [];

  /** Simulates the user selecting the files in the dialog of the last clicked input */
  const select = (...files) => {
    const inp = clicked[clicked.length - 1];
    Object.defineProperty(inp, "files", { value: files, configurable: true });
    inp.dispatchEvent(new Event("change"));
  };

  const png = () => new File(["png"], "a.png", { type: "image/png" });

  beforeEach(() => {
    clicked = [];
    jest.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function click() {
      clicked.push(this);
    });
  });

  afterEach(() => {
    clicked.forEach((inp) => inp.dispatchEvent(new Event("cancel"))); // to reset the opened dialog between tests
    jest.restoreAllMocks();
    delete navigator.userActivation;
    document.body.innerHTML = "";
  });

  test("opens the dialog via a hidden temporary input", async () => {
    const onSelect = jest.fn(() => "uploaded");
    const p = selectFiles(onSelect, { accept: ["image/png", ".jpg"], multiple: true });

    expect(clicked).toHaveLength(1);
    const inp = clicked[0];
    // the input is attached during the selecting: Safari doesn't fire `change` on a detached one
    expect(inp.isConnected).toBe(true);
    // not `hidden`: some mobile browsers don't open the dialog for an input with `display: none`
    expect(inp.hidden).toBe(false);
    expect(inp.outerHTML).toBe(
      '<input type="file" tabindex="-1" aria-hidden="true" style="position: fixed; top: 0px; left: 0px; width: 1px; height: 1px; opacity: 0; pointer-events: none;" multiple="" accept="image/png,.jpg">'
    );

    const f = png();
    select(f);
    await expect(p).resolves.toBe("uploaded");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith([f]);
    expect(document.body.innerHTML).toBe("");
  });

  test("default options", async () => {
    const p = selectFiles((files) => files.map((f) => f.name));
    expect(clicked[0].multiple).toBe(false);
    expect(clicked[0].hasAttribute("accept")).toBe(false);
    // every file is allowed
    select(new File(["1"], "any.bin"), new File(["22"], "b.txt", { type: "text/plain" }));
    await expect(p).resolves.toEqual(["any.bin", "b.txt"]);
  });

  test("async onSelect & its failure", async () => {
    let p = selectFiles(() => Promise.resolve(5));
    select(png());
    await expect(p).resolves.toBe(5);

    p = selectFiles(() => Promise.reject(new Error("upload failed")));
    select(png());
    await expect(p).rejects.toThrow("upload failed");

    p = selectFiles(() => {
      throw new Error("sync failed");
    });
    select(png());
    await expect(p).rejects.toThrow("sync failed");
    expect(document.body.innerHTML).toBe("");
  });

  test("every call uses a new input", async () => {
    // otherwise selecting the same file again doesn't fire `change`
    const p1 = selectFiles(() => 1);
    select(png());
    await p1;
    const p2 = selectFiles(() => 2);
    select(png());
    await expect(p2).resolves.toBe(2);
    expect(clicked).toHaveLength(2);
    expect(clicked[0]).not.toBe(clicked[1]);
  });

  test("cancel", async () => {
    const onSelect = jest.fn();
    let p = selectFiles(onSelect);
    clicked[0].dispatchEvent(new Event("cancel"));
    await expect(p).resolves.toBeNull();
    expect(document.body.innerHTML).toBe("");

    // some browsers fire `change` with empty files instead
    p = selectFiles(onSelect);
    select();
    await expect(p).resolves.toBeNull();

    p = selectFiles(onSelect);
    Object.defineProperty(clicked[2], "files", { value: null });
    clicked[2].dispatchEvent(new Event("change"));
    await expect(p).resolves.toBeNull();

    expect(onSelect).not.toHaveBeenCalled();
    expect(document.body.innerHTML).toBe("");
  });

  test("only one dialog at once", async () => {
    // `performance.now` instead of `Date.now`: it's monotonic, so the system clock moving back doesn't block calls
    const dateNow = jest.spyOn(Date, "now").mockReturnValue(0);
    const now = jest.spyOn(performance, "now").mockReturnValue(10_000);
    const onSelect = jest.fn((files) => files.length);

    // double-click: the browser opens a single dialog & ignores the next `click()`
    const p1 = selectFiles(onSelect);
    now.mockReturnValue(10_999);
    await expect(selectFiles(onSelect)).resolves.toBeNull();
    expect(clicked).toHaveLength(1);
    expect(document.body.children).toHaveLength(1);
    select(png());
    await expect(p1).resolves.toBe(1);

    // the next call after 1s replaces the opened one: its dialog isn't opened at all or is opened yet (non-modal picker)
    const p2 = selectFiles(onSelect, { accept: ["image/*"] });
    now.mockReturnValue(10_999 + 1000);
    dateNow.mockReturnValue(-60_000); // the system clock is moved back
    const onSelect3 = jest.fn((files) => `3: ${files.length}`);
    const p3 = selectFiles(onSelect3, { multiple: true });
    await expect(p2).resolves.toBeNull();
    expect(clicked).toHaveLength(3);
    // the input is reused: the browser ignores `click()` of another input while the dialog is opened
    expect(clicked[2]).toBe(clicked[1]);
    expect(document.body.children).toHaveLength(1);
    // with the options of the next call
    expect(clicked[2].multiple).toBe(true);
    expect(clicked[2].hasAttribute("accept")).toBe(false);
    select(png(), png());
    await expect(p3).resolves.toBe("3: 2");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect3).toHaveBeenCalledTimes(1);
    expect(document.body.innerHTML).toBe("");
    // the late events of the removed input are ignored
    clicked[2].dispatchEvent(new Event("change"));
    clicked[2].dispatchEvent(new Event("cancel"));
    expect(onSelect3).toHaveBeenCalledTimes(1);

    // the same for cancel
    now.mockReturnValue(40_000);
    const p4 = selectFiles(onSelect);
    now.mockReturnValue(50_000);
    const p5 = selectFiles(onSelect);
    clicked[4].dispatchEvent(new Event("cancel"));
    await expect(p4).resolves.toBeNull();
    await expect(p5).resolves.toBeNull();
    expect(document.body.innerHTML).toBe("");

    // a settled call doesn't block the next one & uses a new input
    const p6 = selectFiles(onSelect);
    expect(clicked[5]).not.toBe(clicked[4]);
    select(png());
    await expect(p6).resolves.toBe(1);
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  test("option accept", async () => {
    const onSelect = jest.fn((files) => files.length);
    const check = async (accept, file) => {
      const p = selectFiles(onSelect, { accept, multiple: true });
      select(file);
      try {
        return await p;
      } catch (err) {
        return err.message;
      }
    };

    // mime-type
    expect(await check(["image/png"], png())).toBe(1);
    expect(await check(["image/PNG "], png())).toBe(1); // case & spaces are ignored
    expect(await check(["image/jpeg"], png())).toBe("File 'a.png' has invalid format. Expected: image/jpeg");
    // mime-group
    expect(await check(["image/*"], png())).toBe(1);
    expect(await check(["video/*"], png())).toBe("File 'a.png' has invalid format. Expected: video/*");
    // extension: `type` is empty for an unknown one
    expect(await check([".heic"], new File(["1"], "Photo.HEIC"))).toBe(1);
    expect(await check([".heic"], new File(["1"], "heic.jpg"))).toMatch("has invalid format");
    // any of the rules
    expect(await check(["video/*", ".txt", "image/png"], png())).toBe(1);

    // the browser can report empty `type` for some known formats: it's got from the extension
    expect(await check(["image/*"], new File(["1"], "Photo.HEIC"))).toBe(1);
    expect(await check(["image/heif"], new File(["1"], "a.heif"))).toBe(1);
    expect(await check(["image/*"], new File(["1"], "a.bin"))).toBe(
      "File 'a.bin' has invalid format. Expected: image/*"
    );
    expect(await check(["image/*"], new File(["1"], "heic"))).toMatch("has invalid format"); // without extension
    expect(await check(["text/markdown"], new File(["1"], "README.md"))).toBe(1);
    expect(await check(["text/csv"], new File(["1"], "a.csv"))).toBe(1);
    // `Object.prototype` isn't used as a type by extension
    expect(await check(["image/*"], new File(["1"], "a.constructor"))).toMatch("has invalid format");

    // the browser can report an OS-specific type: it's matched by the extension as well
    const zip = new File(["1"], "a.zip", { type: "application/x-zip-compressed" }); // Windows
    expect(await check(["application/zip"], zip)).toBe(1);
    expect(await check(["application/x-zip-compressed"], zip)).toBe(1);
    expect(await check(["text/csv"], new File(["1"], "a.csv", { type: "application/vnd.ms-excel" }))).toBe(1);
    expect(await check(["image/png"], new File(["1"], "photo", { type: "image/jpeg" }))).toMatch("has invalid format");

    // empty rules are skipped: otherwise they match every file with empty `type`
    expect(await check(["image/png", " "], new File(["1"], "a.bin"))).toBe(
      "File 'a.bin' has invalid format. Expected: image/png"
    );
    expect(clicked[clicked.length - 1].accept).toBe("image/png");
    expect(await check(["", " "], new File(["1"], "a.bin"))).toBe(1); // no rules: every file is allowed
    expect(clicked[clicked.length - 1].hasAttribute("accept")).toBe(false);
    // wildcards allow every file
    expect(await check(["*/*"], new File(["1"], "a.bin"))).toBe(1);
    expect(await check(["image/png", "*"], new File(["1"], "a.bin"))).toBe(1);
    expect(clicked[clicked.length - 1].hasAttribute("accept")).toBe(false);

    // every file is checked
    const p = selectFiles(onSelect, { accept: ["image/png"], multiple: true });
    select(png(), new File(["1"], "b.txt", { type: "text/plain" }));
    await expect(p).rejects.toThrow("File 'b.txt' has invalid format. Expected: image/png");
    expect(onSelect).toHaveBeenCalledTimes(15); // only for the accepted ones above
    expect(document.body.innerHTML).toBe("");

    // invalid value is rejected before opening the dialog & before replacing the opened one
    jest.spyOn(performance, "now").mockReturnValue(10_000);
    const opened = selectFiles(onSelect);
    performance.now.mockReturnValue(20_000);
    const openedInp = clicked[clicked.length - 1];
    const clickedCount = clicked.length;
    await expect(selectFiles(onSelect, { accept: ["pdf"] })).rejects.toThrow("Invalid option accept: 'pdf'");
    await expect(selectFiles(onSelect, { accept: ["image/"] })).rejects.toThrow("Invalid option accept: 'image/'");
    await expect(selectFiles(onSelect, { accept: ["*/png"] })).rejects.toThrow("Invalid option accept: '*/png'");
    await expect(selectFiles(onSelect, { accept: ["."] })).rejects.toThrow("Invalid option accept: '.'");
    await expect(selectFiles(onSelect, { accept: "image/*" })).rejects.toThrow(
      "Invalid option accept: image/*. Expected an array"
    );
    expect(clicked).toHaveLength(clickedCount); // nothing is clicked
    expect(document.body.children).toHaveLength(1);
    // so the opened call is still pending
    const late = jest.fn();
    opened.then(late);
    await Promise.resolve();
    expect(late).not.toHaveBeenCalled();
    openedInp.dispatchEvent(new Event("cancel"));
    await expect(opened).resolves.toBeNull();
  });

  test("option maxSize", async () => {
    const onSelect = jest.fn(() => "ok");
    let p = selectFiles(onSelect, { maxSize: 3 });
    select(png()); // 3 bytes
    await expect(p).resolves.toBe("ok");

    p = selectFiles(onSelect, { maxSize: 2 });
    select(png());
    await expect(p).rejects.toThrow("File 'a.png' is bigger than 2 bytes");
    expect(onSelect).toHaveBeenCalledTimes(1);

    p = selectFiles(onSelect, { maxSize: 0 }); // no limit
    select(png());
    await expect(p).resolves.toBe("ok");

    // invalid value is rejected before opening the dialog
    clicked = [];
    await expect(selectFiles(onSelect, { maxSize: NaN })).rejects.toThrow("Invalid option maxSize: NaN");
    await expect(selectFiles(onSelect, { maxSize: -1 })).rejects.toThrow("Invalid option maxSize: -1");
    expect(clicked).toHaveLength(0);
    expect(document.body.innerHTML).toBe("");
  });

  test("user-action is required", async () => {
    navigator.userActivation = { isActive: false };
    await expect(selectFiles(jest.fn())).rejects.toThrow("must be called from a user-action");
    expect(clicked).toHaveLength(0);
    expect(document.body.innerHTML).toBe("");

    navigator.userActivation = { isActive: true };
    const p = selectFiles(() => 1);
    select(png());
    await expect(p).resolves.toBe(1);
  });

  test("click is failed", async () => {
    jest.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {
      throw new Error("test click");
    });
    await expect(selectFiles(jest.fn())).rejects.toThrow("test click");
    expect(document.body.innerHTML).toBe("");
    // the failed call doesn't block the next one
    jest.restoreAllMocks();
    jest.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function click() {
      clicked.push(this);
    });
    const p = selectFiles(() => 1);
    select(png());
    await expect(p).resolves.toBe(1);
  });

  test("it's rejected instead of throwing outside a browser", async () => {
    jest.spyOn(window, "navigator", "get").mockImplementation(() => {
      throw new ReferenceError("navigator is not defined");
    });
    let p;
    expect(() => {
      p = selectFiles(jest.fn());
    }).not.toThrow();
    await expect(p).rejects.toThrow("navigator is not defined");
  });
});
