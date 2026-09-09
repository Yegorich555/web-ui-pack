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
const lineItems = ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5"];
const lineGridItems = ["Red", "Green", "Blue", "Yellow", "Magenta", "Cyan", "Orange", "Purple"];
const attachItems = ["Alpha", "Beta", "Gamma", "Delta"];
const todoItems = ["Task 1", "Task 2", "Task 3"];
const doneItems = ["Task 4"];

export default function SortView() {
  const [list, setList] = useState(listItems);
  const [grid, setGrid] = useState(gridItems);
  const [lineList, setLineList] = useState(lineItems);
  const [lineGrid, setLineGrid] = useState(lineGridItems);
  const [attached, setAttached] = useState(attachItems);
  const [todo, setTodo] = useState(todoItems);
  const [done, setDone] = useState(doneItems);

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

  /** $attach doesn't require the <wup-sort> wrapper: it listens for the pointed element itself */
  const refDetach = useRef<(() => void) | undefined>(undefined);
  const onAttachedChange = useCallback((el: HTMLUListElement | null) => {
    refDetach.current?.(); // WARN: detach is required because the same ref can be called twice (StrictMode) & on unmount
    refDetach.current = el
      ? WUPSortElement.$attach(el, (value) => setAttached((prev) => value.map((i) => prev[i])))
      : undefined;
  }, []);

  /** accepts an array of parents: an item can be dragged from one list into another */
  const refDetachCross = useRef<(() => void) | undefined>(undefined);
  const onCrossChange = useCallback((el: HTMLDivElement | null) => {
    refDetachCross.current?.();
    const lists = el ? Array.from<HTMLElement>(el.querySelectorAll("ul")) : null;
    refDetachCross.current = lists
      ? WUPSortElement.$attach(lists, (from, to) => {
          const setters = [setTodo, setDone];
          /** Applies the new state of the pointed list: `-1` marks the item that came from another list -
           * so its value is taken from the item itself */
          const apply = (c: WUP.Sort.AttachChange): void =>
            setters[lists.indexOf(c.parent)]((prev) =>
              c.newOrderedIndexes.map((i, k) => (i === -1 ? c.items[k].textContent! : prev[i]))
            );
          apply(from);
          from !== to && apply(to); // WARN: `from === to` when the item didn't change the list
        })
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
        <>
          Dragging between several parents: <b>WUPSortElement.$attach([el1, el2], onChange)</b>
        </>,
        "Supports mouse & touchscreens (drag & drop)",
        "Supports single & multi-line (grid) layouts",
        <>
          2 styles of drop-indicator: <b>ghost</b> (default) and <b>line</b>
        </>,
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
<!-- show a line between items instead of moving the item itself (no shifting of the layout) -->
<wup-sort w-dropindicator="line">
  <div item>Item 1</div>
  <div item>Item 2</div>
</wup-sort>`,
          `html
<!-- OR without the wrapper: see WUPSortElement.$attach below -->
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
  // { className: "my-sort" } // point own class-name if styles are overridden (null - to disable styles at all)
  // { canRemove: true } // allow to remove an item by dragging outside: remove it from the DOM by yourself
  // { dropIndicator: "line" } // "ghost" (default) moves the item between others; "line" paints a line between items
);

// OR point several parents: an item can be dragged from one of them into another.
// In this case onChange gets the new state of both parents: the one which held the item & the one which holds it now
const detachCross = WUPSortElement.$attach(
  [document.getElementById("todo"), document.getElementById("done")],
  (from, to) => {
    // { parent, newOrderedIndexes, items, removedIndex } for every side
    console.warn({ from, to });
    // WARN: from === to (the same object) when the item didn't change the parent
    // WARN: to.newOrderedIndexes contains -1 for the item that came from another parent
  }
);

// the same for the custom element (or globally via WUPSortElement.$defaults.dropIndicator)
document.querySelector("wup-sort").$options.dropIndicator = "line";
// WUPSortElement.$attach applies class-name "wup-sort" to the element: it's used by styles instead of :host
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
        <h3>Drop indicator: line</h3>
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

      <section>
        <h3>Several lists ($attach)</h3>
        <small>
          Point an array of parents - <b>$attach([el1, el2], onChange)</b> - and an item can be dragged from one list
          into another (items of all the lists are handled as the single list)
        </small>
        <div className={styles.columns} ref={onCrossChange}>
          <div>
            <b>Todo</b>
            <ul className={styles.list}>
              {todoItems.map((txt) => (
                <li item="" key={txt}>
                  {txt}
                </li>
              ))}
            </ul>
            <div className={styles.result}>{todo.join(", ") || "empty"}</div>
          </div>
          <div>
            <b>Done</b>
            <ul className={styles.list}>
              {doneItems.map((txt) => (
                <li item="" key={txt}>
                  {txt}
                </li>
              ))}
            </ul>
            <div className={styles.result}>{done.join(", ") || "empty"}</div>
          </div>
        </div>
      </section>
    </Page>
  );
}
