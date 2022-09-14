/* eslint-disable jsx-a11y/label-has-associated-control */
import Page from "src/elements/page";
import { WUPPopup } from "web-ui-pack/popup/popupElement.types";
import Example1 from "./example1";
import Example2 from "./example2";
import Example3 from "./example3";
import Example4 from "./example4";
import styles from "./popupView.scss";

const opts: Partial<WUPPopup.Options> = {
  arrowEnable: true,
  offset: [0, 0, 0, 0],
  arrowOffset: [0, 0, 0, 0],
};

export default function PopupView() {
  function setOpts(o: Partial<WUPPopup.Options>) {
    Object.assign(opts, o);
    document.querySelectorAll("wup-popup").forEach((t) => {
      Object.assign(t.$options, opts);
      !t.$options.showCase && t.$show(); // required because some options are not watched
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
    <Page
      header="PopupElement"
      link="src/popup/popupElement"
      details={{ tag: "wup-popup" }}
      features={[
        "The main goal: place inside visible area without oveflow of target",
        <>
          Works without <b>position: relative</b>
        </>,
        "Optimized for render (via window.requestAnimationFrame)",
        "Built-in animations",
        "Built-in arrow",
        "Flexible way to change position-priorities",
      ]}
    >
      <h3>Options</h3>
      <fieldset className={styles.inputs}>
        <legend>Offset</legend>
        {["Top", "Right", "Bottom", "Left"].map((l, i) => (
          <label key={l}>
            <span>{l}</span>
            <input
              type="number"
              onChange={(e) => changeOffset(+e.target.value, i)}
              defaultValue={opts.offset && opts.offset[i]}
            />
          </label>
        ))}
      </fieldset>
      <wup-radio
        ref={(el) => {
          if (el && !el.$options.label) {
            el.$options.label = "Arrow";
            el.$options.items = [
              { value: true, text: "Show" },
              { value: false, text: " Hide" },
            ];
            el.$value = opts.arrowEnable;
            el.addEventListener("$change", () => setOpts({ arrowEnable: el.$value }));
          }
        }}
      />
      <fieldset className={styles.inputs}>
        <legend>ArrowOffset (only if arrow enabled)</legend>
        {["Top", "Right", "Bottom", "Left"].map((l, i) => (
          <label key={l}>
            <span>{l}</span>
            <input
              type="number"
              onChange={(e) => changeArrowOffset(+e.target.value, i)}
              defaultValue={opts.arrowOffset && opts.arrowOffset[i]}
            />
          </label>
        ))}
      </fieldset>
      <Example1 />
      <Example2 />
      <Example3 />
      <Example4 />
    </Page>
  );
}
