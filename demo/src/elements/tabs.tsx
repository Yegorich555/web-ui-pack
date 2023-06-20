import { useCallback, useState } from "react";
import { WUPcssButton, useBuiltinStyle } from "web-ui-pack/styles";
import styles from "./tabs.scss";

interface Item {
  label: string;
  render: any;
}
interface Props {
  items: Item[];
}

// todo rewrite with <wup-tabs />: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/examples/tabs-automatic/
export default function Tabs(props: Props): JSX.Element {
  const [current, setCurrent] = useState(0);
  const onClick = useCallback((e: React.MouseEvent) => {
    const ch = (e.currentTarget as HTMLElement).children;
    for (let i = 0; i < ch.length; ++i) {
      if (ch[i] === e.target || ch[i].contains(e.target as HTMLElement)) {
        setCurrent(i);
        break;
      }
    }
  }, []);
  const Item = props.items[current]?.render;

  return (
    <section className={styles.tabs}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div onClick={onClick} role="tablist" tabIndex={-1}>
        {props.items.map((a, i) => (
          <button type="button" role="tab" key={a.label} className={i === current ? styles.active : ""}>
            {a.label}
          </button>
        ))}
      </div>
      <div className={styles.content}>{Item}</div>
    </section>
  );
}

useBuiltinStyle(WUPcssButton(`.${styles.tabs} button`));
