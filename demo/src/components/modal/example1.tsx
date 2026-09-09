import Example from "src/elements/example";
import { bigContent, smallContent } from "./content";
import styles from "./modalView.scss";

/** The same footer for every modal: shows the confirm-modal on close */
function SameFooter() {
  return (
    <footer>
      <button
        type="submit"
        w-confirm="Close me?"
        ref={(el) => {
          if (el) {
            el.$onRenderModal = (m) => {
              m.$options.replace = true;
            };
          }
        }}
      >
        Close with confirm-replace
      </button>
      <button type="submit" w-confirm="Close me?">
        Close with confirm
      </button>
    </footer>
  );
}

/** The same as below but without the content: to debug the small modal (see DEV below) */
const dbgSmall = (
  <>
    <div className={styles.block}>
      <button className={`btn ${styles.left}`} type="button">
        Left
      </button>
      <wup-modal w-target="prev" w-placement="left">
        <h2>Modal with placement: left</h2>
      </wup-modal>
      {/*  */}
      <button className={`btn ${styles.top}`} type="button">
        Top
      </button>
      <wup-modal w-target="prev" w-placement="top">
        <h2>Modal with placement: top</h2>
      </wup-modal>
      {/*  */}
      <button className={`btn ${styles.center}`} type="button">
        Center
      </button>
      <wup-modal w-target="prev" w-placement="center">
        <h2>Modal with placement: center</h2>
      </wup-modal>
      {/*  */}
      <button className={`btn ${styles.right}`} type="button">
        Right
      </button>
      <wup-modal w-target="prev" w-placement="right">
        <h2>Modal with placement: right</h2>
      </wup-modal>
    </div>

    <small>The same with big scrollable content</small>
  </>
);

export default function Example1() {
  return (
    <Example header="Different placements" link="demo/src/components/modal/example1.tsx">
      <small>Use $options.placement or attribute [w-placement]</small>
      {DEV && false ? dbgSmall : null}
      <div className={styles.block}>
        <button className={`btn ${styles.left}`} type="button">
          Left
        </button>
        <wup-modal w-target="prev" w-placement="left">
          <h2>Modal with placement: left</h2>
          <div>{bigContent}</div>
          <SameFooter />
        </wup-modal>
        {/*  */}
        <button className={`btn ${styles.top}`} type="button">
          Top
        </button>
        <wup-modal w-target="prev" w-placement="top">
          <h2>Modal with placement: top</h2>
          <div>{smallContent}</div>
          <SameFooter />
        </wup-modal>
        {/*  */}
        <button className={`btn ${styles.center}`} type="button">
          Center
        </button>
        <wup-modal w-target="prev" w-placement="center">
          <h2>Modal with placement: center</h2>
          <div>{smallContent}</div>
          <SameFooter />
        </wup-modal>
        {/*  */}
        <button className={`btn ${styles.right}`} type="button">
          Right
        </button>
        <wup-modal w-target="prev" w-placement="right">
          <h2>Modal with placement: right</h2>
          <div>{bigContent}</div>
          <SameFooter />
        </wup-modal>
      </div>
    </Example>
  );
}
