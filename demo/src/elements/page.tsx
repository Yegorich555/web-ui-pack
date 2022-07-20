/* eslint-disable react/destructuring-assignment */
import UserCode from "./userCode";

interface Props {
  header: string;
  link: string;
  className?: string;
  scanTag?: keyof HTMLElementTagNameMap;
}

export default function Page(props: React.PropsWithChildren<Props>) {
  return (
    <div className={props.className}>
      <h2>
        <a href={`https://github.com/Yegorich555/web-ui-pack${props.link}`} target="_blank" rel="noreferrer">
          {props.header}
        </a>
      </h2>
      {props.scanTag ? <UserCode scanEl={document.createElement(props.scanTag)} /> : null}
      {props.children}
    </div>
  );
}
