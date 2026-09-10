// [item] is a custom attribute of <wup-sort> - so eslint doesn't know about it
/* eslint-disable react/no-unknown-property */
import { useCallback, useRef, useState } from "react";
import Example from "src/elements/example";
import { WUPSortElement } from "web-ui-pack";
import styles from "./sortView.scss";

// WARN: these arrays are rendered only once: the element changes position of children itself
// so React must not re-order the same nodes (otherwise it fights with the element for the DOM)
const todoItems = ["Task 1", "Task 2", "Task 3"];
const doneItems = ["Task 4"];

export default function Example5() {
  const [todo, setTodo] = useState(todoItems);
  const [done, setDone] = useState(doneItems);

  /** accepts an array of parents: an item can be dragged from one list into another */
  const refDetachCross = useRef<(() => void) | undefined>(undefined);
  const onCrossChange = useCallback((el: HTMLDivElement | null) => {
    refDetachCross.current?.();
    const lists = el ? Array.from<HTMLElement>(el.querySelectorAll("ul")) : null;

    lists![0].setAttribute("wup-sort", "false");

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
    <Example header="Several lists" link="demo/src/components/sort/example5.tsx">
      <small>
        Point an array of parents - <b>WUPSortElement.$attach([el1, el2], onChange)</b> - and an item can be dragged
        from one list into another (items of all the lists are handled as the single list)
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
    </Example>
  );
}
