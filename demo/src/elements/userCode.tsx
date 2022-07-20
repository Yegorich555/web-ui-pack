/* eslint-disable react/destructuring-assignment */
import WUPBaseElement from "web-ui-pack/baseElement";
import styles from "./userCode.scss";

interface Props {
  elType?: typeof WUPBaseElement<any>;
}

export default function UserCode(props: Pick<Props, "elType">) {
  if (!props.elType) {
    return null;
  }
  const reg = /(--[\w-]+): *([^;]+);/g;
  const str = props.elType.$styleRoot;
  const vars: { name: string; value: string }[] = [];
  // eslint-disable-next-line no-constant-condition
  while (1) {
    const exec = reg.exec(str);
    if (exec === null) {
      break;
    }
    vars.push({ name: exec[1], value: exec[2] });
  }

  return (
    <>
      <h3>CSS - variables</h3>
      <code className={styles.cssVars}>
        <ul>
          {vars.map((v) => (
            <li key={v.name}>
              <span>{v.name}</span>: <span>{v.value}</span>;
            </li>
          ))}
        </ul>
      </code>
    </>
  );
}
