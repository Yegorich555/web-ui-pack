import Page from "src/elements/page";
import { WUPCircleElement } from "web-ui-pack";
import Example1 from "./example1";
import Example2 from "./example2";
import Example3 from "./example3";
import Example4 from "./example4";
import styles from "./circleView.scss";

WUPCircleElement.$use();

export default function CircleView() {
  return (
    <Page //
      header="CircleElement"
      link="src/circleElement.ts"
      details={{
        tag: "wup-circle",
        linkDemo: "demo/src/components/circle/circleView.tsx",
        customHTML: [
          `html
<wup-circle
  w-back="true"
  w-from="0"
  w-to="360"
  w-space="2"
  w-minsize="10"
  w-min="0"
  w-max="100"
  w-width="14"
  w-corner="0.25"
  w-items="window.circleItems"
>
  <strong>Custom label</strong>
</wup-circle>

<!--EQUAL TO-->
<wup-circle w-items="window.circleItems">
  <strong>Custom label</strong>
</wup-circle>`,
        ],
      }}
      features={[
        "Rounded corners (use $options.corner)",
        "Highly configurable (via css-vars, attrs)",
        "Auto fits parent size",
      ]}
      className={styles.page}
    >
      <Example1 />
      <Example2 />
      <Example3 />
      <Example4 />
    </Page>
  );
}
