import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import styles from "./anchor.scss";

interface Props {
  hash: string;
}

function tryScrollTo(hash: string) {
  const el = hash && document.getElementById(hash.replace("#", ""));
  if (el) {
    setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start", inline: "start" });
      setTimeout(() => el.focus(), 500);
    }, 100);
  }
}

export default function Anchor(p: React.PropsWithChildren<Props>) {
  const location = useLocation();

  useEffect(() => {
    tryScrollTo(location.hash);
  }, [location.hash]);

  return (
    <Link
      className={styles.anchor}
      to={{ hash: p.hash }}
      id={p.hash.replace("#", "")}
      ref={(el) => {
        if (el) {
          el.onclick = (e) => {
            e.preventDefault(); // required to prevent page-reload
            e.stopPropagation();
            const { href } = el;
            // eslint-disable-next-line no-restricted-globals
            history.pushState({}, "", href);
            tryScrollTo(p.hash);
          };
        }
      }}
    >
      {p.children}
    </Link>
  );
}
