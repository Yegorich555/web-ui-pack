// [item] is a custom attribute of <wup-sort> - so eslint doesn't know about it
/* eslint-disable react/no-unknown-property */
import { useCallback, useState } from "react";
import Example from "src/elements/example";
import { WUPSortElement } from "web-ui-pack";
import styles from "./sortView.scss";

// WARN: these arrays are rendered only once: <wup-sort> changes position of children itself
// so React must not re-order the same nodes (otherwise it fights with the element for the DOM)
const lineItems = ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5"];
const lineGridItems = ["Red", "Green", "Blue", "Yellow", "Magenta", "Cyan", "Orange", "Purple"];

export default function Example3() {
  const [lineList, setLineList] = useState(lineItems);
  const [lineGrid, setLineGrid] = useState(lineGridItems);

  /** e.detail.value contains new ordered indexes: value[newIndex] === prevIndex */
  const onLineListChange = useCallback((el: WUPSortElement | null) => {
    if (el) {
      el.$onChange = (e) => setLineList((prev) => e.detail.value.map((i) => prev[i]));
    }
  }, []);

  const onLineGridChange = useCallback((el: WUPSortElement | null) => {
    if (el) {
      el.$onChange = (e) => setLineGrid((prev) => e.detail.value.map((i) => prev[i]));
    }
  }, []);

  return (
    <Example header="Drop indicator: line" link="demo/src/components/sort/example3.tsx">
      <small>
        Instead of moving the item between others (<b>ghost</b>) the line is painted over the layout - so items
        aren&apos;t shifted during the dragging and the new order is applied on drop
      </small>
      <wup-sort class={styles.list} w-dropindicator="line" ref={onLineListChange}>
        {lineItems.map((txt) => (
          <div item="" key={txt}>
            {txt}
          </div>
        ))}
      </wup-sort>
      <div className={styles.result}>Order: {lineList.join(", ")}</div>
      <wup-sort class={styles.grid} w-dropindicator="line" ref={onLineGridChange}>
        {lineGridItems.map((txt) => (
          <div item="" key={txt}>
            {txt}
          </div>
        ))}
      </wup-sort>
      <div className={styles.result}>Order: {lineGrid.join(", ")}</div>
    </Example>
  );
}
