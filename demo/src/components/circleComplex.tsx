import styles from "./circleComplex.scss";

export default function CircleComplex() {
  return (
    <div className={styles.complex}>
      <wup-circle
        w-from={0}
        w-to={270}
        w-min={0}
        w-max={270}
        w-width={15}
        ref={(el) => {
          if (el) {
            el.$options.items = [{ value: 190 }];
            el.renderLabel = (lbl) => (lbl.textContent = "Expected");
          }
        }}
      />
      <wup-circle
        w-from={0}
        w-to={270}
        w-min={0}
        w-max={270}
        w-width={25}
        ref={(el) => {
          if (el) {
            el.$options.items = [{ value: 60, color: "#19bdb5" }];
            el.renderLabel = (lbl) => (lbl.textContent = "Actual");
          }
        }}
      />
      <ul>
        {Array.from({ length: 11 }).map((_, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={`lbl${i}`} style={{ transform: `rotate(${(270 / 10) * i}deg)` }}>
            <i style={{ transform: `rotate(-${(270 / 10) * i}deg)` }}>{i}</i>
          </li>
        ))}
      </ul>
    </div>
  );
}
