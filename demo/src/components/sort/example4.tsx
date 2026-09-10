// [item] is a custom attribute of <wup-sort> - so eslint doesn't know about it
/* eslint-disable react/no-unknown-property */
import { useCallback, useRef, useState } from "react";
import Example from "src/elements/example";
import { WUPSortElement } from "web-ui-pack";
import styles from "./sortView.scss";

// WARN: this array is rendered only once: the element changes position of children itself
// so React must not re-order the same nodes (otherwise it fights with the element for the DOM)
const attachItems = ["Alpha", "Beta", "Gamma", "Delta"];

export default function Example4() {
  const [attached, setAttached] = useState(attachItems);

  /** $attach doesn't require the <wup-sort> wrapper: it listens for the pointed element itself */
  const refDetach = useRef<(() => void) | undefined>(undefined);
  const onAttachedChange = useCallback((el: HTMLUListElement | null) => {
    refDetach.current?.(); // WARN: detach is required because the same ref can be called twice (StrictMode) & on unmount
    refDetach.current = el
      ? WUPSortElement.$attach(el, (value) => setAttached((prev) => value.map((i) => prev[i])))
      : undefined;
  }, []);

  return (
    <Example header="Ordinary element" link="demo/src/components/sort/example4.tsx">
      <small>Use WUPSortElement.$attach(...)</small>
      <ul className={styles.list} ref={onAttachedChange}>
        {attachItems.map((txt) => (
          <li item="" key={txt}>
            {txt}
          </li>
        ))}
        <li item="false">Not sortable (item=false)</li>
      </ul>
      <div className={styles.result}>Order: {attached.join(", ")}</div>
    </Example>
  );
}
