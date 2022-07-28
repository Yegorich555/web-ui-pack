/* eslint-disable react/destructuring-assignment */
import UserCode, { UserCodeProps } from "./userCode";

interface Props {
  header: string;
  link: string;
  className?: string;
  details?: UserCodeProps;
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
      {props.details ? <UserCode {...props.details} /> : null}
      {props.children}
    </div>
  );
}
