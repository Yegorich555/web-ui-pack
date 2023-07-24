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
    expect(await page.evaluate(() => document.getElementById("trueEl").$refInput.value)).toBe("Hi ther");
    await histUndo();
    expect(await page.evaluate(() => document.getElementById("trueEl").$refInput.value)).toBe("Hi the");
    await histRedo({ isCtrlY: false, isMeta: true });
    expect(await page.evaluate(() => document.getElementById("trueEl").$refInput.value)).toBe("Hi ther");
    await histRedo({ isCtrlY: true, isMeta: false });
    expect(await page.evaluate(() => document.getElementById("trueEl").$refInput.value)).toBe("Hi there");
  });
});
