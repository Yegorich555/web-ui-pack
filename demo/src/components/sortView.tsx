// [item] is a custom attribute of <wup-sort> - so eslint doesn't know about it
/* eslint-disable react/no-unknown-property */
import { useCallback, useState } from "react";
import Page from "src/elements/page";
import { WUPSortElement } from "web-ui-pack";
import styles from "./sortView.scss";

WUPSortElement.$use();

// WARN: these arrays are rendered only once: <wup-sort> changes position of children itself
// so React must not re-order the same nodes (otherwise it fights with the element for the DOM)
const listItems = ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"];
const gridItems = ["Ferrari", "Bugatti", "Lamborghini", "Porsche", "Aston Martin", "Bentley", "Maserati", "Jaguar"];

export default function SortView() {
  const [list, setList] = useState(listItems);
  const [grid, setGrid] = useState(gridItems);

  /** e.detail.value contains new ordered indexes: value[newIndex] === prevIndex */
  const onListChange = useCallback((el: WUPSortElement | null) => {
    if (el) {
      el.$onChange = (e) => setList((prev) => e.detail.value.map((i) => prev[i]));
    }
  }, []);

  const onGridChange = useCallback((el: WUPSortElement | null) => {
    if (el) {
      el.$onChange = (e) => setGrid((prev) => e.detail.value.map((i) => prev[i]));
    }
  }, []);

  return (
    <Page //
      header="SortElement"
      link="src/sortElement.ts"
      features={[
        "Wrapper: makes sortable any children with attribute [item]",
        "Supports mouse & touchscreens (drag & drop)",
        "Supports single & multi-line (grid) layouts",
        "JS Native. Possible to use with any UI frameworks",
      ]}
      details={{
        tag: "wup-sort",
        linkDemo: "demo/src/components/sortView.tsx",
        customHTML: [
          `html
<wup-sort>
  <div item>Item 1</div>
  <div item>Item 2</div>
  <div item="false">Item 3 - not sortable</div>
</wup-sort>`,
        ],
        customJS: `const el = document.querySelector("wup-sort");
el.$onChange = (e) => console.warn({
  reason: e.detail.reason, // "move"
  newOrderedIndexes: e.detail.value, // [2,0,1] means: was [0,1,2]
  htmlItems: e.detail.items, // items in the new order
});

// WARN: element changes position of children itself.
// So with React/Vue/etc. don't re-render children by the new order - otherwise
// the framework fights with the element for the same DOM nodes`,
      }}
    >
      <section>
        <h3>Single line (list)</h3>
        <wup-sort class={styles.list} ref={onListChange}>
          {listItems.map((txt) => (
            <div item="" key={txt}>
              {txt}
            </div>
          ))}
          <div item="false">Not sortable (item=false)</div>
        </wup-sort>
        <div className={styles.result}>Order: {list.join(", ")}</div>
      </section>

      <section>
        <h3>Multiple lines (grid)</h3>
        <wup-sort class={styles.grid} ref={onGridChange}>
          {gridItems.map((txt) => (
            <div item="" key={txt}>
              {txt}
            </div>
          ))}
        </wup-sort>
        <div className={styles.result}>Order: {grid.join(", ")}</div>
      </section>
    </Page>
  );
}
