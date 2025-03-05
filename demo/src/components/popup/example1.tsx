import styles from "./popupView.scss";

export default function Example1() {
  return (
    <>
      <h3>Example 1</h3>
      <div className={styles.popupEx1}>
        <button
          id="trg"
          type="button"
          className={[styles.trg, "btn"].join(" ")}
          ref={(el) => {
            setTimeout(() => {
              el?.click();
            }, 200);
          }}
        >
          Target
          <br />
          <small>
            and popups with different positions
            <br /> click me
          </small>
        </button>
        <wup-popup w-target="#trg" w-placement="top-start" w-animation="default">
          top.start
        </wup-popup>
        <wup-popup w-target="#trg" w-placement="top-middle">
          top.middle
        </wup-popup>
        <wup-popup w-target="#trg" w-placement="top-end">
          top.end
        </wup-popup>
        <wup-popup w-target="#trg" w-placement="right-start">
          right.start
        </wup-popup>
        <wup-popup w-target="#trg" w-placement="right-middle">
          right.middle
        </wup-popup>
        <wup-popup w-target="#trg" w-placement="right-end">
          right.end
        </wup-popup>
        <wup-popup w-target="#trg" w-placement="bottom-start">
          bottom.start
        </wup-popup>
        <wup-popup w-target="#trg" w-placement="bottom-middle">
          bottom.middle
        </wup-popup>
        <wup-popup w-target="#trg" w-placement="bottom-end">
          bottom.end
        </wup-popup>
        <wup-popup w-target="#trg" w-placement="left-start">
          left.start
        </wup-popup>
        <wup-popup w-target="#trg" w-placement="left-middle">
          left.middle
        </wup-popup>
        <wup-popup w-target="#trg" w-placement="left-end">
          left.end
        </wup-popup>
      </div>
    </>
  );
}
