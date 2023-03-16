/* eslint-disable react/no-unescaped-entities */
import Page from "src/elements/page";
import { WUPCircleElement } from "web-ui-pack";
import styles from "./circleView.scss";

const sideEffect = WUPCircleElement;
!sideEffect && console.error("Missed"); // It's required otherwise import is ignored by webpack

(window as any).circleItems = [{ value: 60 }];

export default function CircleView() {
  return (
    <Page //
      header="CircleElement"
      link="src/circleElement.ts"
      details={{
        tag: "wup-circle",
      }}
      features={[
        "With rounded corners (use $options.corner)", //
        "Highly configurable (via css-vars, attrs)",
        "Fits parent size",
      ]}
    >
      <section>
        <h3>Default</h3>
        <small>(single full circle segment with corners 3 and background circle)</small>
        <wup-circle
          style={{ maxWidth: "100px" }}
          back
          from={0}
          to={360}
          space={2}
          minsize={10}
          min={0}
          max={100}
          width={14}
          corner={0.25}
          items="window.circleItems"
        />
      </section>
      <section>
        <h3>Gauge style</h3>
        <small>
          (single segment with corners 50% and custom <b>$options.from</b> & <b>to</b>)
          <br />
          <b>WARN:</b> don't forget to reduce height in half of size (via styles)
        </small>
        <wup-circle
          style={{ maxWidth: "100px" }}
          class={styles.half}
          from={-90}
          to={90}
          corner={0.5}
          items="window.circleItems"
        />
      </section>
      <section>
        <h3>Segmented</h3>
        <small>(point several items in $options.items)</small>
        <wup-circle
          back={false}
          style={{ maxWidth: "100px" }}
          from={-90}
          to={270}
          ref={(el) => {
            if (el) {
              el.$options.items = [
                { value: 12 },
                { value: 10 },
                { value: 13 },
                { value: 27 },
                { value: 15 },
                { value: 23 },
                { value: 23 },
              ];
            }
          }}
        />
        <small>
          point options <b>from=-90 & to=90</b>
        </small>
        <wup-circle
          style={{ maxWidth: "100px" }}
          class={styles.half}
          back={false}
          from={-90}
          to={90}
          ref={(el) => {
            if (el) {
              el.$options.items = [
                { value: 12 },
                { value: 1 },
                { value: 13 },
                { value: 27 },
                { value: 15 },
                { value: 23 },
                { value: 23 },
              ];
            }
          }}
        />
      </section>
    </Page>
  );
}
