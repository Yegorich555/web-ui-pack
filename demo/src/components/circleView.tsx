/* eslint-disable react/no-unescaped-entities */
import Page from "src/elements/page";
import { WUPCircleElement } from "web-ui-pack";
import styles from "./circleView.scss";

WUPCircleElement.$use();

(window as any).circleItems = [{ value: 60 }];

export default function CircleView() {
  return (
    <Page //
      header="CircleElement"
      link="src/circleElement.ts"
      details={{
        tag: "wup-circle",
        linkDemo: "demo/src/components/circleView.tsx",
      }}
      features={[
        "With rounded corners (use $options.corner)", //
        "Highly configurable (via css-vars, attrs)",
        "Fits parent size",
      ]}
      className={styles.page}
    >
      <section>
        <h3>Default</h3>
        <small>single full circle segment with corners 3 and background circle</small>
        <wup-circle
          style={{ maxWidth: "100px" }}
          w-back
          w-from={0}
          w-to={360}
          w-space={2}
          w-minSize={10}
          w-min={0}
          w-max={100}
          w-width={14}
          w-corner={0.25}
          w-items="window.circleItems"
        />
      </section>
      <section>
        <h3>Gauge style</h3>
        <small>
          single segment with corners 50% and custom <b>$options.from</b> & <b>to</b>
          <br />
          <b>WARN:</b> don't forget to reduce height in half of size (via styles)
        </small>
        <div className={styles.group}>
          <wup-circle
            class={styles.half}
            w-from={-90}
            w-to={90}
            w-corner={0.5}
            w-width={20}
            ref={(el) => {
              if (el) {
                el.$options.items = [{ value: 2 }];
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                el.renderLabel = (label, percent, _value) => {
                  // use to override default label
                  label.textContent = `${Math.round(percent)} %`;
                };
                setTimeout(() => {
                  const path = el.querySelector("g>path")!;
                  const { width, height } = path.getBoundingClientRect();
                  if (Math.abs(width - height) > 1) {
                    // width must be equal height because item reduced to cornerSize that half of size
                    console.error("Size out of expected range", { width, height });
                  }
                }, 700);
              }
            }}
          />
          <wup-circle
            class={styles.half}
            w-from={-90}
            w-to={90}
            w-corner={0.5}
            w-width={20}
            ref={(el) => {
              if (el) {
                el.$options.items = [{ value: 5 }];
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                el.renderLabel = (label, percent, _value) => {
                  // use to override default label
                  label.textContent = `${Math.round(percent)} %`;
                };
              }
            }}
          />
          <wup-circle
            class={styles.half}
            w-from={-90}
            w-to={90}
            w-corner={0.5}
            w-width={20}
            ref={(el) => {
              if (el) {
                el.$options.items = [{ value: 30 }];
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                el.renderLabel = (label, percent, _value) => {
                  // use to override default label
                  label.textContent = `${Math.round(percent)} %`;
                };
              }
            }}
          />
        </div>
      </section>
      <section>
        <h3>Segmented</h3>
        <small>point several items in $options.items</small>
        <small>
          point <b>label</b> per item to show tooltip
        </small>
        <wup-circle
          style={{ maxWidth: "120px" }}
          w-back={false}
          w-from={-90}
          w-to={270}
          ref={(el) => {
            if (el) {
              el.$options.items = [
                { value: 1, tooltip: "Item 1\nvalue: {#}, percent: {#%}" },
                {
                  value: 100,
                  tooltip: (item) =>
                    `Custom tooltip\nvalue: ${item.value}, percent: ${Math.round(item.percentage * 10) / 10}%`,
                },
                { value: 13, tooltip: "Item 3\nvalue: {#}" },
                { value: 27, tooltip: "Item 4\nvalue: {#}" },
                { value: 15, tooltip: "Item 5\nvalue: {#}" },
                { value: 23, tooltip: "Item 6\nvalue: {#}" },
                { value: 23, tooltip: "Item 7\nvalue: {#}" },
              ];
            }
          }}
        />
        <small>
          point options <b>from=-90 & to=90</b>
        </small>
        <wup-circle
          class={styles.half}
          w-back={false}
          w-from={-90}
          w-to={90}
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
