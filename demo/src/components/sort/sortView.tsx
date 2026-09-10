import Page from "src/elements/page";
import { WUPSortElement } from "web-ui-pack";
import Example1 from "./example1";
import Example2 from "./example2";
import Example3 from "./example3";
import Example4 from "./example4";
import Example5 from "./example5";

WUPSortElement.$use();

export default function SortView() {
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
        <>
          Parent with <b>[wup-sort=false]</b>: accepts dropped items (appended to the end) but without ordering them
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
        linkDemo: "demo/src/components/sort/sortView.tsx",
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
          `html
<!-- a parent with [wup-sort=false] accepts dropped items but without selecting the exact place:
     an item dragged here is appended to the end & items already here aren't re-ordered -->
<ul id="done" wup-sort="false">
  <li item>Item 1</li>
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
      <Example1 />
      <Example2 />
      <Example3 />
      <Example4 />
      <Example5 />
    </Page>
  );
}
