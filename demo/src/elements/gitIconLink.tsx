import linkGit from "src/helpers/linkGit";
import styles from "./gitIconLink.scss";

interface Props {
  href: string | null;
}
export default function GitIconLink({ href, children }: React.PropsWithChildren<Props>) {
  href = linkGit(href);
  return (
    <a
      className={styles.gitLink} //
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Link to github"
    >
      {children}
    </a>
  );
}
