/* eslint-disable react/destructuring-assignment */
interface Props {
  header: string;
  link: string;
}

export default function Page(props: React.PropsWithChildren<Props>) {
  return (
    <div>
      <h2>
        <a href={`https://github.com/Yegorich555/web-ui-pack${props.link}`} target="_blank" rel="noreferrer">
          {props.header}
        </a>
      </h2>
      {props.children}
    </div>
  );
}
