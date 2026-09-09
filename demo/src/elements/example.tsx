/* eslint-disable react/destructuring-assignment */
import styles from "./example.scss";
import MyLink from "./myLink";

interface Props {
  header: string;
  /** Link to the source of the example (relative path from the repo root) */
  link: string | null;
  className?: string;
  style?: React.CSSProperties;
}

/** Single example inside the Page: header + link to its own source-code */
export default function Example(props: React.PropsWithChildren<Props>) {
  return (
    <section className={props.className} style={props.style}>
      <h3 className={styles.h3}>
        <MyLink href={props.link} gitIcon>
          {props.header}
        </MyLink>
      </h3>
      {props.children}
    </section>
  );
}
