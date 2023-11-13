/* eslint-disable react/destructuring-assignment */
import UserCode, { UserCodeProps } from "./userCode";
import styles from "./page.scss";
import MyLink from "./myLink";

interface Props {
  header: string;
  link: string | null;
  className?: string;
  details?: UserCodeProps;
  features: Array<string | JSX.Element> | null;
}

export default function Page(props: React.PropsWithChildren<Props>) {
  return (
    <div
      className={props.className}
      ref={(el) => {
        if (el) {
          el.style.opacity = "0";
          setTimeout(() => (el.style.opacity = ""), 100); // to prevent awful blink
        }
      }}
    >
      <h2 className={styles.h2}>
        <MyLink href={props.link} gitIcon>
          {props.header}
        </MyLink>
      </h2>

      {props.features === null ? null : (
        <section className={styles.features}>
          <h3>Features</h3>
          <ul>
            {props.features?.map((f, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <li key={i}>{f}</li>
            ))}
          </ul>
        </section>
      )}
      {props.details ? (
        <UserCode {...props.details} tag={props.details.tag && (`#example ${props.details.tag}` as any)} />
      ) : null}
      <div id="example">{props.children}</div>
    </div>
  );
}
