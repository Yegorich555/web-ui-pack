import styles from "./circleComplex.scss";

interface Props {
  isSmall?: boolean;
}

export default function CircleComplex(p: Props) {
  return (
    <div className={`${styles.complex} ${p.isSmall ? styles.small : ""}`}>
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
          <li key={`lbl${i}`} style={{ transform: `rotate(${(266 / 10) * i - 2}deg)` }}>
            <i style={{ transform: `rotate(-${(266 / 10) * i - 2}deg)` }}>{i}</i>
          </li>
        ))}
      </ul>
    </div>
  );
}
