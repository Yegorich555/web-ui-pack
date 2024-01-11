/* eslint-disable react/require-default-props */
import React from "react";
import styles from "./faq.scss";
import Anchor from "./anchor";

interface Props {
  items: Array<{ link: string; question: string; answer: React.ReactElement | string }>;
  endString?: string | null;
}

export default function FAQ({ items, endString }: Props) {
  return (
    <section className={styles.FAQ}>
      <ul>
        {items.map((n) => (
          <li id={n.link} key={n.link}>
            <h3>
              <Anchor hash={n.link}>
                {n.question}
                {endString ?? "?"}
              </Anchor>
            </h3>
            <div>{n.answer}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
