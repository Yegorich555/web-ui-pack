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

  // todo test defaultChecked
}
