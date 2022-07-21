/* eslint-disable react/destructuring-assignment */
import UserCode, { UserCodeProps } from "./userCode";

interface Props {
  header: string;
  link: string;
  className?: string;
  details?: UserCodeProps;
}

export default function Page(props: React.PropsWithChildren<Props>) {
  return (
    <div className={props.className}>
      <h2>
        <a href={`https://github.com/Yegorich555/web-ui-pack${props.link}`} target="_blank" rel="noreferrer">
          {props.header}
        </a>
      </h2>
      {props.details ? <UserCode {...props.details} /> : null}
      {props.children}
    </div>
  );
}
