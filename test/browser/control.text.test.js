import { initTestTextControl, testTextControl } from "./control.textTest";

initTestTextControl({ htmlTag: "wup-text", type: "WUPTextControl" });

const histUndo = async () => {
  await page.keyboard.down("ControlLeft");
  await page.keyboard.press("KeyZ");
  await page.keyboard.up("ControlLeft");
};

const histRedo = async ({ isCtrlY, isMeta } = { isCtrlY: false, isMeta: false }) => {
  await page.keyboard.down(isMeta ? "MetaLeft" : "ControlLeft");
  !isCtrlY && (await page.keyboard.down("ShiftLeft"));
  await page.keyboard.press(isCtrlY ? "KeyY" : "KeyZ"); // Ctrl+Y or Ctrl+Shift+Y
  !isCtrlY && (await page.keyboard.up("ShiftLeft"));
  await page.keyboard.up(isMeta ? "MetaLeft" : "ControlLeft");
};

describe("control.text", () => {
  testTextControl();

  test("hist undo/redo", async () => {
    await page.type("#trueEl input", "Hi there", { delay: 10 });
    expect(await page.evaluate(() => document.getElementById("trueEl").$refInput.value)).toBe("Hi there");
    await histUndo();
    expect(await page.evaluate(() => document.getElementById("trueEl").$refInput.value)).toBe("Hi");
    await histUndo();
    expect(await page.evaluate(() => document.getElementById("trueEl").$refInput.value)).toBe("");
    await histRedo({ isCtrlY: false, isMeta: true });
    expect(await page.evaluate(() => document.getElementById("trueEl").$refInput.value)).toBe("Hi");
    await histRedo({ isCtrlY: true, isMeta: false });
    expect(await page.evaluate(() => document.getElementById("trueEl").$refInput.value)).toBe("Hi there");

    await page.evaluate(() => {
      const el = document.body.appendChild(document.createElement("wup-text"));
      el.id = "newEl";
      el.$initValue = "Mike";
    });
    await page.waitForTimeout(2); // timeout required because of debounceFilters
    await page.click("#newEl [clear]");
    expect(await page.evaluate(() => document.getElementById("newEl").$refInput.value)).toBe("");
    await histUndo();
    expect(await page.evaluate(() => document.getElementById("newEl").$refInput.value)).toBe("Mike");
  });
});
