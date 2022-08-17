import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./faq.scss";

interface Props {
  items: Array<{ link: string; question: string; answer: React.ReactElement }>;
}

export default function FAQ({ items }: Props) {
  const location = useLocation();
  useEffect(() => {
    const { hash } = location;
    // Check if there is a hash and if an element with that id exists
    const el = hash && document.getElementById(hash.substring(1));
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start", inline: "start" });
        setTimeout(() => el.focus(), 500);
      });
    }
  }, [location.hash]);

  return (
    <section className={styles.FAQ}>
      <ul>
        {items.map((n) => (
          <li id={n.link} key={n.link}>
            <h3>
              <Link to={{ hash: n.link }}>{n.question}?</Link>
            </h3>
            <div>{n.answer}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
