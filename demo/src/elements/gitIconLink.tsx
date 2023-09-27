import linkGit from "src/helpers/linkGit";
import styles from "./gitIconLink.scss";

interface Props {
  href: string | null;
  className?: string;
}
export default function GitIconLink({ href, children, className }: React.PropsWithChildren<Props>) {
  href = linkGit(href);
  return (
    <a
      className={[styles.gitLink, className].filter((s) => s).join(" ")} //
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Link to github"
    >
      {children}
    </a>
  );
}
