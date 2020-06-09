// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";
import { BaseComponent } from "web-ui-pack";
import * as h from "../testHelper";

jest.useFakeTimers();
let dom = h.initDom(); // assignment only for Intellisense
beforeAll(() => {
  dom = h.initDom();
});

afterAll(() => {
  dom.destroyDom();
  dom = null;
  jest.clearAllTimers();
});

describe("baseComponent", () => {
  h.testComponentFuncBind(BaseComponent);

  test("autofocus", () => {
    // checking if autoFocus behavior works without errors other checking possible only with puppeteer
    const fn = jest.fn();
    class Some extends BaseComponent {
      componentDidMount() {
        super.componentDidMount();
        fn();
      }

      render() {
        if (this.props.isAttach) {
          return <input ref={this.setDomEl} />;
        }
        return <input />;
      }
    }

    dom.render(<Some autoFocus />);
    expect(fn).toBeCalledTimes(1);
    dom.renderWait(<Some key={1} autoFocus isAttach />);
    expect(fn).toBeCalledTimes(2);

    class NoFocus extends BaseComponent {
      render() {
        return <div ref={this.setDomEl} />;
      }
    }

    // testing not-focusable element
    const fnConsole = h.wrapConsoleWarn(() => dom.render(<NoFocus autoFocus />));
    expect(fnConsole).toBeCalledTimes(1);
  });

  test("shouldComponentUpdate", () => {
    const fn = jest.fn();
    let el;
    class Some extends BaseComponent {
      constructor(props) {
        super(props);
        this.state = {};
        el = this;
      }

      render() {
        fn();
        return <div {...this.props} {...this.state} />;
      }
    }

    dom.renderWait(<Some />);
    expect(fn).toBeCalledTimes(1);
    dom.renderWait(<Some />);
    expect(fn).toBeCalledTimes(1);

    dom.renderWait(<Some data-attr />);
    expect(fn).toBeCalledTimes(2);

    dom.renderWait(<Some data-attr="true" />);
    expect(fn).toBeCalledTimes(3);

    el.setState({ "data-val": true });
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(4);

    // state doesn't have comparison and must be controlled in every component individually
    el.setState({ "data-val": true });
    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(5);
  });
});
