import Page from "src/elements/page";
import { WUPSpinElement } from "web-ui-pack";
import Example1 from "./example1";
import Example2 from "./example2";
import Example3 from "./example3";
import Example4 from "./example4";
import Example5 from "./example5";
import styles from "./spinView.scss";

WUPSpinElement.$use();

export default function SpinView() {
  return (
    <Page //
      header="SpinElement"
      link="src/spinElement.ts"
      className={styles.pageSpin}
      details={{
        tag: "wup-spin",
        linkDemo: "demo/src/components/spin/spinView.tsx",
        cssVarAlt: new Map([["--spin-step", "Used for specific types"]]),
      }}
      features={[
        "Highly configurable (via css-vars, presets, attrs)",
        "Ability to fit parent without affecting on parent-height",
      ]}
    >
      <Example1 />
      <Example2 />
      <Example3 />
      <Example4 />
      <Example5 />
      <div className={styles.bottom} />
    </Page>
  );
}
