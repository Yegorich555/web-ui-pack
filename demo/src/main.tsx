/* eslint-disable jsx-a11y/anchor-has-content */
import "./styles/main.scss";
import React from "react";
import ReactDom from "react-dom";
import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import { stringPrettify } from "web-ui-pack";
import PopupView from "./components/popup/popupView";

import iconGit from "./assets/gitIcon.svg";
import imgLogo from "./assets/logo.png";
import styles from "./main.scss";

interface IRoute {
  label?: string;
  path: string;
  el: React.FunctionComponent;
}

const routes: IRoute[] = [{ path: "/popup", el: PopupView }];

export default function AppContainer() {
  return (
    <BrowserRouter>
      <h1>
        <img src={imgLogo} alt="logo" />
        web-ui-pack
        <a href="https://github.com/Yegorich555/web-ui-pack" target="_blank" rel="noreferrer" aria-label="Go to github">
          <img src={iconGit} alt="github" />
        </a>
      </h1>
      <div className={styles.page}>
        <nav className={styles.leftBar}>
          <ul>
            {routes.map((r) => (
              <li key={r.path}>
                <NavLink to={r.path} className={({ isActive }) => (isActive ? styles.activeLink : "")}>
                  {r.label || stringPrettify(r.path.replace("/", ""))}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main>
          <Routes>
            {routes.map((r) => (
              <Route key={r.path} path={r.path} element={React.createElement(r.el)} />
            ))}
            <Route path="*" element={<Navigate to={routes[0].path} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

ReactDom.render(<AppContainer />, document.getElementById("app"));
