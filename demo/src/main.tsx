/* eslint-disable jsx-a11y/anchor-has-content */
import "./styles/main.scss";
import React, { useEffect } from "react";
import ReactDom from "react-dom";
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { WUPHelpers } from "web-ui-pack";
import PopupView from "./components/popup/popupView";

import iconGit from "./assets/gitIcon.svg";
import imgLogo from "./assets/logo.png";
import styles from "./main.scss";
import ControlsView from "./components/controls/controlsView";
import SpinView from "./components/spin/spinView";
import TextControlView from "./components/controls/text";
import PasswordControlView from "./components/controls/password";
import SelectControlView from "./components/controls/select";
import SwitchControlView from "./components/controls/switch";
import CheckControlView from "./components/controls/check";
import RadioControlView from "./components/controls/radio";
import CalendarControlView from "./components/controls/calendar";
import DateControlView from "./components/controls/date";
import FAQView from "./components/FAQView";
import NumberControlView from "./components/controls/number";

(window as any).WUPHelpers = WUPHelpers;

interface IRoute {
  label?: string;
  path: string;
  url?: string;
  el: React.FunctionComponent;
  isNested?: boolean;
}
const baseURL = process.env.BASE_URL || "/";

const routes: IRoute[] = [
  { path: "popup", el: PopupView },
  { path: "spin", el: SpinView },
  { path: "controls", label: "Form & Controls", el: ControlsView },
  { path: "control/text", el: TextControlView, isNested: true },
  { path: "control/password", el: PasswordControlView, isNested: true },
  { path: "control/number", el: NumberControlView, isNested: true },
  { path: "control/switch", el: SwitchControlView, isNested: true },
  { path: "control/check", el: CheckControlView, isNested: true },
  { path: "control/radio", el: RadioControlView, isNested: true },
  { path: "control/select", el: SelectControlView, isNested: true },
  // { path: "control/selectMany", el: SelectManyControlView, isNested: true },
  { path: "control/calendar", el: CalendarControlView, isNested: true },
  { path: "control/date", el: DateControlView, isNested: true },
  { path: "faq", label: "FAQ", el: FAQView },
];

routes.forEach((v) => (v.url = baseURL + v.path));

function last(arr: string[]) {
  return arr[arr.length - 1];
}

export default function AppContainer() {
  const navigate = useNavigate();

  useEffect(() => {
    const prevPath = window.localStorage.getItem("path");
    if (prevPath) {
      window.localStorage.removeItem("path");
      const r = routes.find((v) => v.path === prevPath);
      r && navigate(r.url as string); // window.location.replace(r.url as string);
    }
  }, []);

  return (
    <>
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
                <NavLink
                  to={r.url as string}
                  className={({ isActive }) =>
                    [isActive ? styles.activeLink : "", r.isNested ? styles.nested : ""].join(" ")
                  }
                >
                  {r.label || WUPHelpers.stringPrettify(r.label || last(r.path.split("/")))}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main>
          <Routes>
            {routes.map((r) => (
              <Route key={r.path} path={r.url} element={React.createElement(r.el)} />
            ))}
            <Route path="*" element={<Navigate to={routes[DEV ? routes.length - 1 : 0].url as string} />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

ReactDom.render(
  <BrowserRouter>
    <AppContainer />{" "}
  </BrowserRouter>,
  document.getElementById("app")
);
