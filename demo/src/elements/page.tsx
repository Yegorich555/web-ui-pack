/* eslint-disable react/destructuring-assignment */
import UserCode, { UserCodeProps } from "./userCode";
import styles from "./page.scss";

interface Props {
  header: string;
  link: string;
  className?: string;
  details?: UserCodeProps;
  features: Array<string | JSX.Element> | null;
}

export default function Page(props: React.PropsWithChildren<Props>) {
  let { link } = props;
  if (link.startsWith("src")) {
    link = `/blob/${DEV ? "develop" : "master"}/${link}`;
  }

  return (
    <div className={props.className}>
      <h2>
        <a href={`https://github.com/Yegorich555/web-ui-pack${link}`} target="_blank" rel="noreferrer">
          {props.header}
        </a>
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
      {props.details ? <UserCode {...props.details} /> : null}
      {props.children}
    </div>
  );
}
