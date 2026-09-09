// [item] is a custom attribute of <wup-sort> - so eslint doesn't know about it
/* eslint-disable react/no-unknown-property */
import { useCallback, useState } from "react";
import Example from "src/elements/example";
import { WUPSortElement } from "web-ui-pack";
import styles from "./sortView.scss";

// WARN: this array is rendered only once: <wup-sort> changes position of children itself
// so React must not re-order the same nodes (otherwise it fights with the element for the DOM)
const gridItems = ["Ferrari", "Bugatti", "Lamborghini", "Porsche", "Aston Martin", "Bentley", "Maserati", "Jaguar"];

export default function Example2() {
  const [grid, setGrid] = useState(gridItems);

  /** e.detail.value contains new ordered indexes: value[newIndex] === prevIndex */
  const onGridChange = useCallback((el: WUPSortElement | null) => {
    if (el) {
      el.$onChange = (e) => setGrid((prev) => e.detail.value.map((i) => prev[i]));
    }
  }, []);

  return (
    <Example header="Multiple lines (grid)" link="demo/src/components/sort/example2.tsx">
      <wup-sort class={styles.grid} ref={onGridChange}>
        {gridItems.map((txt) => (
          <div item="" key={txt}>
            {txt}
          </div>
        ))}
      </wup-sort>
      <div className={styles.result}>Order: {grid.join(", ")}</div>
    </Example>
  );
}
