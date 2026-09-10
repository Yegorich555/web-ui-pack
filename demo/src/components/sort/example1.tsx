// [item] is a custom attribute of <wup-sort> - so eslint doesn't know about it
/* eslint-disable react/no-unknown-property */
import { useCallback, useState } from "react";
import Example from "src/elements/example";
import { WUPSortElement } from "web-ui-pack";
import styles from "./sortView.scss";

// WARN: this array is rendered only once: <wup-sort> changes position of children itself
// so React must not re-order the same nodes (otherwise it fights with the element for the DOM)
const listItems = ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"];

export default function Example1() {
  const [list, setList] = useState(listItems);

  /** e.detail.value contains new ordered indexes: value[newIndex] === prevIndex */
  const onListChange = useCallback((el: WUPSortElement | null) => {
    if (el) {
      el.$onChange = (e) => setList((prev) => e.detail.value.map((i) => prev[i]));
    }
  }, []);

  return (
    <Example header="Single line (list)" link="demo/src/components/sort/example1.tsx">
      <wup-sort class={styles.list} ref={onListChange}>
        {listItems.map((txt) => (
          <div item="" key={txt}>
            {txt}
          </div>
        ))}
        <div item="false">Not sortable (item=false)</div>
      </wup-sort>
      <div className={styles.result}>Order: {list.join(", ")}</div>
    </Example>
  );
}
