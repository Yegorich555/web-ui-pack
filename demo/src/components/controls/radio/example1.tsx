import Example from "src/elements/example";
import MyLink from "src/elements/myLink";
import { WUPRadioControl } from "web-ui-pack";
import styles from "./example1.scss";

WUPRadioControl.$use();

let ir = 10;
const items = [
  { text: "Item N 1", value: ++ir },
  { text: "Item N 2", value: ++ir },
  { text: "Item N 3", value: ++ir },
];

(window as any).storedRadioItemsStyles = items;

export default function Example1() {
  return (
    <Example header="Customized via CSS only" link="demo/src/components/controls/radio/example1.tsx">
      <small>
        See details in <MyLink href="/demo/src/components/controls/radio/example1.scss">radio/example1.scss</MyLink>
      </small>
      <wup-radio
        class={styles.custom}
        w-name="customView_1"
        w-initValue={items[1].value.toString()}
        w-items="storedRadioItemsStyles"
      />
      <wup-radio
        class={styles.custom2}
        w-name="customView_2"
        w-initValue={items[1].value.toString()}
        ref={(el) => {
          if (el) {
            el.$options.items = items.slice(0, 4);
          }
        }}
      />
    </Example>
  );
}
