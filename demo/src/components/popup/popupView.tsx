/* eslint-disable jsx-a11y/label-has-associated-control */
import InputRadio from "src/elements/inputRadio";
import Page from "src/elements/page";
import { WUPPopup } from "web-ui-pack/popupElement.types";
import Example1 from "./example1";
import Example2 from "./example2";
import Example3 from "./example3";
import Example4 from "./example4";

const opts: Partial<WUPPopup.Options> = {
  arrowEnable: true,
  offset: [0, 0, 0, 0],
  arrowOffset: [0.5, 0.5, 0.5, 0.5],
};

export default function PopupView() {
  function setOpts(o: Partial<WUPPopup.Options>) {
    Object.assign(opts, o);
    document.querySelectorAll("wup-popup").forEach((t) => {
      Object.assign(t.$options, opts);
      t.$show(); // required because some options are not watched
    });
  }

  function changeOffset(v: number, i: number) {
    const o = opts.offset || [0, 0, 0, 0];
    o[i] = v;
    setOpts({ offset: o });
  }

  function changeArrowOffset(v: number, i: number) {
    const o = opts.arrowOffset || [0, 0, 0, 0];
    o[i] = v;
    setOpts({ arrowOffset: o });
  }

  setTimeout(() => setOpts(opts));

  return (
    <Page header="PopupElement" link="#features">
      <h3>Options</h3>
      <fieldset>
        <legend>Offset</legend>
        {["Top", "Right", "Bottom", "Left"].map((l, i) => (
          <label key={l}>
            {l}
            <input
              type="number"
              onChange={(e) => changeOffset(+e.target.value, i)}
              defaultValue={opts.offset && opts.offset[i]}
            />
          </label>
        ))}
      </fieldset>
      {/* todo replace with wup-ctrl-radio after implementation */}
      <InputRadio
        label="Arrow"
        items={[
          { value: true, label: "Show" },
          { value: false, label: " Hide" },
        ]}
        defaultValue={opts.arrowEnable}
        onChange={(v) => setOpts({ arrowEnable: v })}
      />

      <fieldset>
        <legend>ArrowOffset (only if arrow enabled)</legend>
        {["Top", "Right", "Bottom", "Left"].map((l, i) => (
          <label key={l}>
            {l}
            <input
              type="number"
              onChange={(e) => changeArrowOffset(+e.target.value, i)}
              defaultValue={opts.arrowOffset && opts.arrowOffset[i]}
            />
          </label>
        ))}
      </fieldset>
      <br />
      <Example1 />
      <Example2 />
      <Example3 />
      <Example4 />
    </Page>
  );
}
