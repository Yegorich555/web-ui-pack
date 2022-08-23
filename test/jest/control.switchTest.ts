import { WUPSwitchControl } from "web-ui-pack";
import { testBaseControl } from "./baseControlTest";

// eslint-disable-next-line jest/no-export
export default function testSwitchControl(getEl: () => WUPSwitchControl, opts: Parameters<typeof testBaseControl>[0]) {
  testBaseControl({
    ...opts,
    emptyValue: false,
    noInputSelection: true,
    initValues: [
      { attrValue: "true", value: true },
      { attrValue: "false", value: false },
      { attrValue: "true", value: true },
    ],
    validations: {
      ...opts?.validations,
    },
    attrs: { defaultchecked: { skip: true } },
    validationsSkip: ["required"], // because it doesn't make sense for checkbox
  });

  test("defaultChecked", () => {
    const el = getEl();
    expect(el.$refInput.type).toBe("checkbox");
    expect(el.$initValue).toBe(false);

    el.setAttribute("defaultchecked", "true");
    jest.advanceTimersByTime(1);
    expect(el.$initValue).toBe(true);
    expect(el.$value).toBe(true);
    expect(el.$refInput.checked).toBe(true);

    el.setAttribute("defaultchecked", "false");
    jest.advanceTimersByTime(1);
    expect(el.$initValue).toBe(false);
    expect(el.$value).toBe(false);
    expect(el.$refInput.checked).toBe(false);

    el.setAttribute("defaultchecked", "true");
    jest.advanceTimersByTime(1);
    expect(el.$initValue).toBe(true);
    el.removeAttribute("defaultchecked");
    el.$options.readOnly = true;
    jest.advanceTimersByTime(1);
    expect(el.$initValue).toBe(false);
  });
}
