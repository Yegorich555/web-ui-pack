/* eslint-disable react/no-unescaped-entities */
import Page from "src/elements/page";
import { WUPCircleElement } from "web-ui-pack";

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
          style={{ width: "100px" }} //
          back
          from={0}
          to={360}
          width={14}
          corner={3}
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
          style={{ width: "100px", height: "50px" }} //
          from={-90}
          to={90}
          corner={7}
          items="window.circleItems"
        />
      </section>
      <section>
        <h3>Segmented</h3>
        <small>(point several items in $options.items)</small>
        <wup-circle
          back={false}
          style={{ width: "200px" }}
          ref={(el) => {
            if (el) {
              el.$options.items = [
                { value: 45 },
                { value: 70 },
                { value: 85 },
                { value: 120 },
                { value: 220 },
                { value: 360 },
              ];
            }
          }}
        />
      </section>
    </Page>
  );
}
