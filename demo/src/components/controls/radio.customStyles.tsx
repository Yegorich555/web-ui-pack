import { WUPRadioControl } from "web-ui-pack";
import styles from "./radio.customStyles.scss";

WUPRadioControl.$use();

let ir = 10;
const items = [
  { text: "Item N 1", value: ++ir },
  { text: "Item N 2", value: ++ir },
  { text: "Item N 3", value: ++ir },
];

(window as any).storedRadioItemsStyles = items;

export default function RadioCustomStyles() {
  return (
    <>
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
            setTimeout(() => {
              console.warn(el.$value);
            });
          }
        }}
      />
    </>
  );
}
