/* eslint-disable jsx-a11y/label-has-associated-control */
import Page from "src/elements/page";
import Example1 from "./example1";
import Example2 from "./example2";
import Example3 from "./example3";
import Example4 from "./example4";
import styles from "./popupView.scss";

const opts: Partial<WUP.Popup.Options> = {
  arrowEnable: true,
  offset: [0, 0, 0, 0],
  arrowOffset: [0, 0, 0, 0],
};

export default function PopupView() {
  function setOpts(o: Partial<WUP.Popup.Options>) {
    Object.assign(opts, o);
    document.querySelectorAll("wup-popup").forEach((t) => {
      Object.assign(t.$options, opts);
      !t.$options.openCase && t.$open(); // required because some options are not watched
      t.$refresh();
    });
  }

  function changeOffset(v: number, i: number) {
    const o = opts.offset || [0, 0, 0, 0];
    (o as Array<number>)[i] = v;
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
      link="src/popup/popupElement.ts"
      // todo issue: click CSS Vars then HTML tab => it renders extra attrs open & show
      details={{ tag: "wup-popup", linkDemo: "demo/src/components/popup/popupView.tsx" }}
      features={[
        "The main goal: place inside visible area without overflow of target",
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
      <fieldset className={styles.groupCtrl}>
        <legend>Offset</legend>
        {["Top", "Right", "Bottom", "Left"].map((l, i) => (
          <wup-num
            key={l}
            w-label={l}
            ref={(el) => {
              if (el) {
                el.$initValue = opts.offset && (opts.offset as Array<number>)[i];
                el.$onChange = () => changeOffset(el.$value ?? 0, i);
                el.$options.clearButton = false;
              }
            }}
          />
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
      <fieldset className={styles.groupCtrl}>
        <legend>ArrowOffset (only if arrow enabled)</legend>
        {["Top", "Right", "Bottom", "Left"].map((l, i) => (
          <wup-num
            key={l}
            w-label={l}
            ref={(el) => {
              if (el) {
                el.$initValue = opts.arrowOffset && opts.arrowOffset[i];
                el.$onChange = () => changeArrowOffset(el.$value ?? 0, i);
                el.$options.clearButton = false;
              }
            }}
          />
        ))}
      </fieldset>
      <Example1 />
      <Example2 />
      <Example3 />
      <Example4 />
    </Page>
  );
}
