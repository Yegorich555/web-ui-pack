/* eslint-disable react/destructuring-assignment */
import WUPBaseElement from "web-ui-pack/baseElement";
import UserCode from "./userCode";

interface Props {
  header: string;
  link: string;
  className?: string;
  elType?: typeof WUPBaseElement<any>;
}

export default function Page(props: React.PropsWithChildren<Props>) {
  return (
    <div className={props.className}>
      <h2>
        <a href={`https://github.com/Yegorich555/web-ui-pack${props.link}`} target="_blank" rel="noreferrer">
          {props.header}
        </a>
      </h2>
      <UserCode elType={props.elType} />
      {props.children}
    </div>
  );
}
