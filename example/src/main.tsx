import "./styles/main.scss";
import React, { Component } from "react";
import ReactDom from "react-dom";
import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import focusFirst from "web-ui-pack/helpers/focusFirst";
import PopupView from "./components/popupView";
import styles from "./main.scss";

interface IRoute {
  label?: string;
  path: string;
  el: React.FunctionComponent;
}

const routes: IRoute[] = [{ path: "/popup", el: PopupView }];

function snakeCaseToUpperCaseFirst(s: string): string {
  const rs = s.replace(/([A-Z])/g, " $1");
  return rs.charAt(0).toUpperCase() + rs.slice(1);
}

class AppContainer extends Component {
  render() {
    return (
      <BrowserRouter>
        <h1 ref={(el) => el && focusFirst(el)}>web-ui-pack</h1>
        <div className={styles.page}>
          <nav className={styles.leftBar}>
            <ul>
              {routes.map((r) => (
                <li key={r.path}>
                  <NavLink to={r.path} className={({ isActive }) => (isActive ? styles.activeLink : "")}>
                    {r.label || snakeCaseToUpperCaseFirst(r.path.replace("/", ""))}
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
}

ReactDom.render(<AppContainer />, document.getElementById("app"));
