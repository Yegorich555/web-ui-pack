/* eslint-disable react/no-unescaped-entities */
import Page from "src/elements/page";
import { WUPCircleElement } from "web-ui-pack";
// import styles from "./circleView.scss.scss";

const sideEffect = WUPCircleElement;
!sideEffect && console.error("Missed"); // It's required otherwise import is ignored by webpack

export default function CircleView() {
  return (
    <Page //
      header="CircleElement"
      link="src/circleElement.ts"
      // className={styles.pageCircle}
      details={{
        tag: "wup-circle",
      }}
      features={[
        "With rounded corners", //
        "Highly configurable (via css-vars, attrs)",
        "Fits parent size",
      ]}
    >
      <wup-circle value={81} style={{ width: "100px" }} nofilter />
      <wup-circle value={81} style={{ width: "100px" }} />
      <wup-circle value={81} />
    </Page>
  );
}
