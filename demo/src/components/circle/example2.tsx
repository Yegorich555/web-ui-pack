import { WUPCircleElement } from "web-ui-pack";
import Example from "src/elements/example";
import styles from "./circleView.scss";

/** Use it to override the default label */
function renderPercentLabel(el: WUPCircleElement): void {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  el.renderLabel = (label, percent, _value) => {
    label.textContent = `${Math.round(percent)} %`;
  };
}

export default function Example2() {
  return (
    <Example header="Gauge style" link="demo/src/components/circle/example2.tsx">
      <small>
        single segment with <b>.$options.corner=0.5</b> and <b>.$options.from=-90</b> & <b>.$options.to=90</b>
        <br />
        <b>WARN:</b> half-size doesn&apos;t work for Safari 14- see{" "}
        <a
          href="https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio#browser_compatibility"
          target="_blank"
          rel="noreferrer"
        >
          CSS compatibility
        </a>
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
              renderPercentLabel(el);
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
              renderPercentLabel(el);
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
              renderPercentLabel(el);
            }
          }}
        />
      </div>
    </Example>
  );
}
