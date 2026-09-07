// [item] is a custom attribute of <wup-sort> - so eslint doesn't know about it
/* eslint-disable react/no-unknown-property */
import { useCallback, useRef, useState } from "react";
import Page from "src/elements/page";
import { WUPSortElement } from "web-ui-pack";
import styles from "./sortView.scss";

WUPSortElement.$use();

// WARN: these arrays are rendered only once: <wup-sort> changes position of children itself
// so React must not re-order the same nodes (otherwise it fights with the element for the DOM)
const listItems = ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"];
const gridItems = ["Ferrari", "Bugatti", "Lamborghini", "Porsche", "Aston Martin", "Bentley", "Maserati", "Jaguar"];
const attachItems = ["Alpha", "Beta", "Gamma", "Delta"];

export default function SortView() {
  const [list, setList] = useState(listItems);
  const [grid, setGrid] = useState(gridItems);
  const [attached, setAttached] = useState(attachItems);

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

  /** $attach doesn't require the <wup-sort> wrapper: it listens for the pointed element itself */
  const refDetach = useRef<(() => void) | undefined>(undefined);
  const onAttachedChange = useCallback((el: HTMLUListElement | null) => {
    refDetach.current?.(); // WARN: detach is required because the same ref can be called twice (StrictMode) & on unmount
    refDetach.current = el
      ? WUPSortElement.$attach(el, (value) => setAttached((prev) => value.map((i) => prev[i])))
      : undefined;
  }, []);

  return (
    <Page //
      header="SortElement"
      link="src/sortElement.ts"
      features={[
        "Wrapper: makes sortable any children with attribute [item]",
        <>
          Possible to use without the wrapper: <b>WUPSortElement.$attach(el, onChange)</b>
        </>,
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
          `html
<!-- OR without the wrapper: see $attach below -->
<ul>
  <li item>Item 1</li>
  <li item>Item 2</li>
  <li item="false">Item 3 - not sortable</li>
</ul>`,
        ],
        customJS: `const el = document.querySelector("wup-sort");
el.$onChange = (e) => console.warn({
  reason: e.detail.reason, // "move"
  newOrderedIndexes: e.detail.value, // [2,0,1] means: was [0,1,2]
  htmlItems: e.detail.items, // items in the new order
});

// OR without the <wup-sort> wrapper (when it breaks the layout: grid, flex, <ul> etc.)
const detach = WUPSortElement.$attach(
  document.querySelector("ul"),
  // removedIndex is -1 unless an item is dropped outside the element (requires option canRemove)
  (newOrderedIndexes, htmlItems, removedIndex) => console.warn({ newOrderedIndexes, htmlItems, removedIndex }),
  // { selectorName: ".my-sort" } // point own selector if styles are overridden
  // { canRemove: true } // allow to remove an item by dragging outside: remove it from the DOM by yourself
);
// $attach applies attribute [wup-sort] to the element: it's used by styles instead of :host
// detach() is required only if the element is removed via parent.innerHTML="..."

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

      <section>
        <h3>Ordinary element ($attach)</h3>
        <ul className={styles.list} ref={onAttachedChange}>
          {attachItems.map((txt) => (
            <li item="" key={txt}>
              {txt}
            </li>
          ))}
          <li item="false">Not sortable (item=false)</li>
        </ul>
        <div className={styles.result}>Order: {attached.join(", ")}</div>
      </section>
    </Page>
  );
}
