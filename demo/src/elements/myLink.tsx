import linkGit from "src/helpers/linkGit";
import styles from "./myLink.scss";

interface Props {
  href: string | null;
  className?: string;
  gitIcon?: boolean;
}
export default function MyLink({ href, children, className, gitIcon }: React.PropsWithChildren<Props>) {
  href = href?.startsWith("http") ? href : linkGit(href);
  return (
    <a
      className={[gitIcon ? styles.link : null, className].filter((s) => s).join(" ")} //
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Link to github"
    >
      {children}
    </a>
  );
}
