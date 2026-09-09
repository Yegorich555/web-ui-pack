import Example from "src/elements/example";
import styles from "./circleView.scss";

export default function Example3() {
  return (
    <Example header="Segmented" link="demo/src/components/circle/example3.tsx">
      <small>point several items in $options.items</small>
      <small>
        point <b>tooltip</b> per item to show tooltip
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
                tooltip: (item) => {
                  console.warn(item.color);
                  return `Custom tooltip\nvalue: ${item.value}, percent: ${Math.round(item.percentage * 10) / 10}%`;
                },
              },
              { value: 13, tooltip: "Item 3\nvalue: {#}" },
              { value: 27, tooltip: "Item 4\nvalue: {#}" },
              { value: 15, tooltip: "Item 5\nvalue: {#}" },
              { value: 23, tooltip: "Item 6\nvalue: {#}" },
              { value: 23, tooltip: "Item 7\nvalue: {#}" },
            ];
          }
        }}
      >
        <strong>Your Label</strong>
      </wup-circle>
      <small>
        point options <b>w-from=&apos;-90&apos;</b> and <b>w-to=&apos;90&apos;</b>
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
      >
        <strong>Your Label</strong>
      </wup-circle>
    </Example>
  );
}
