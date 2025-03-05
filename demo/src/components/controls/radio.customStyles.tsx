import { WUPRadioControl } from "web-ui-pack";
import styles from "./radio.customStyles.scss";

WUPRadioControl.$use();

let ir = 10;
const items = [
  { text: "Item N 1", value: ++ir },
  { text: "Item N 2", value: ++ir },
  { text: "Item N 3", value: ++ir },
  { text: "Item N 4", value: ++ir },
  { text: "Item N 5", value: ++ir },
  { text: "Don 1", value: ++ir },
  { text: "Item N 7", value: ++ir },
  { text: "Angel", value: ++ir },
  { text: "Item N 9", value: ++ir },
  { text: "Item N 10", value: ++ir },
];

export default function RadioCustomStyles() {
  return (
    <>
      <wup-radio
        class={styles.custom}
        w-name="customView_1"
        w-initValue={items[1].value.toString()}
        w-items="storedRadioItems.items"
      />
      <wup-radio
        class={styles.custom2}
        w-name="customView_2"
        w-initValue={items[1].value.toString()}
        ref={(el) => {
          if (el) {
            el.$options.items = items.slice(0, 4);
            setTimeout(() => {
              console.warn(el.$value);
            });
          }
        }}
      />
    </>
  );
}
