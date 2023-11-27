/* eslint-disable jsx-a11y/anchor-has-content */
import "./styles/main.scss";
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { WUPHelpers, WUPSwitchControl } from "web-ui-pack";
import { useBuiltinStyle, WUPcssButton, WUPcssScrollSmall } from "web-ui-pack/styles";
import PopupView from "./components/popup/popupView";

import ControlsView from "./components/controls/controlsView";
import SpinView from "./components/spin/spinView";
import CircleView from "./components/circleView";
import DropdownView from "./components/dropdownView";
import ModalView from "./components/modalView";

import TextControlView from "./components/controls/text";
import TextareaControlView from "./components/controls/textarea";
import PasswordControlView from "./components/controls/password";
import SelectControlView from "./components/controls/select";
import SwitchControlView from "./components/controls/switch";
import CheckControlView from "./components/controls/check";
import RadioControlView from "./components/controls/radio";
import CalendarControlView from "./components/controls/calendar";
import DateControlView from "./components/controls/date";
import TimeControlView from "./components/controls/time";
import NumberControlView from "./components/controls/number";
import FAQView from "./components/FAQView";
import SelectManyControlView from "./components/controls/selectMany";
import MyLink from "./elements/myLink";

import imgLogo from "./assets/logo.png";
import styles from "./main.scss";
import Login from "./components/controls/login";

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
  ...[
    { path: "popup", el: PopupView },
    { path: "spin", el: SpinView },
    { path: "circle", el: CircleView },
    { path: "dropdown", el: DropdownView },
    { path: "modal", el: ModalView },
  ].sort((a, b) => a.path.localeCompare(b.path)),
  { path: "controls", label: "Form & Controls", el: ControlsView },
  { path: "control/text", el: TextControlView, isNested: true },
  { path: "control/textarea", el: TextareaControlView, isNested: true },
  { path: "control/password", el: PasswordControlView, isNested: true },
  { path: "control/number", el: NumberControlView, isNested: true },
  { path: "control/switch", el: SwitchControlView, isNested: true },
  { path: "control/check", el: CheckControlView, isNested: true },
  { path: "control/radio", el: RadioControlView, isNested: true },
  { path: "control/select", el: SelectControlView, isNested: true },
  { path: "control/selectMany", el: SelectManyControlView, isNested: true },
  { path: "control/calendar", el: CalendarControlView, isNested: true },
  { path: "control/date", el: DateControlView, isNested: true },
  { path: "control/time", el: TimeControlView, isNested: true },
  { path: "faq", label: "FAQ", el: FAQView },
];

routes.forEach((v) => (v.url = baseURL + v.path));

function last(arr: string[]) {
  return arr[arr.length - 1];
}

WUPSwitchControl.$use();

declare global {
  interface Window {
    onDarkModeChanged?: (isDark: boolean) => void;
    isDark?: boolean;
  }
}

function changeDarkMode(isDark: boolean): void {
  if (isDark) {
    document.body.setAttribute("wupdark", ""); // attr wupdark will be further
  } else {
    document.body.removeAttribute("wupdark");
  }
  window.isDark = isDark;
  window.onDarkModeChanged?.call(window, isDark);
}
// WARN: init darkMode required because $onChange triggers only after some timeout and blink visible on the screen
changeDarkMode(!!localStorage.getItem("darkmode"));

export default function AppContainer() {
  const navigate = useNavigate();

  useEffect(() => {
    const prevPath = window.localStorage.getItem("path");
    if (prevPath) {
      window.localStorage.removeItem("path");
      const p = prevPath.split(/[?#]/)[0];
      const r = routes.find((v) => v.path === p);
      r && navigate(process.env.BASE_URL + prevPath); // window.location.replace(r.url as string);
    }
  }, []);

  return (
    <>
      <h1>
        <div />
        <MyLink href="https://github.com/Yegorich555/web-ui-pack" className={styles.headerLink} gitIcon>
          <img src={imgLogo} alt="logo" />
          web-ui-pack
        </MyLink>
        <wup-switch
          class={styles.darkMode}
          w-storageKey="darkmode"
          ref={(el) => {
            if (el) {
              // NiceToHave: prevent toggle animation on init
              el.$refInput.ariaLabel = "toggle between light and darkmode";
              el.$onChange = () => changeDarkMode(el.$value);
            }
          }}
        />
      </h1>
      <div className={styles.page}>
        <nav className={`${styles.leftBar} scrolled`}>
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
        <main className="scrolled">
          <Routes>
            {routes.map((r) => (
              <Route key={r.path} path={r.url} element={React.createElement(r.el)} />
            ))}
            <Route path="login" element={<Login />} />
            <Route path="*" element={<Navigate to={routes[DEV ? routes.length - 1 : 0].url as string} />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("app")!).render(
  <BrowserRouter>
    <AppContainer />
  </BrowserRouter>
);

useBuiltinStyle(
  `${WUPcssScrollSmall(".scrolled")}
  .scrolled {
     overflow: auto;
  }`
);

useBuiltinStyle(WUPcssScrollSmall(".scrolled"));
useBuiltinStyle(WUPcssScrollSmall(".code pre"));
useBuiltinStyle(WUPcssButton(".btn"));
