import React from "react";
import isComponentChild from "web-ui-pack/helpers/isComponentChild";
import Core from "web-ui-pack";
import * as h from "../testHelper";

class NodeDiv extends Core.Component {
  render() {
    return <div>{this.props.children}</div>;
  }
}

class Control extends Core.Component {
  render() {
    return <input {...this.props} />;
  }
}
class ControlWrapper extends Control {
  constructor(props) {
    super(props);
    this.state = {};
  }
}

let dom = h.initDom(); // assignment only for Intellisense
beforeAll(() => {
  dom = h.initDom();
});

afterAll(() => {
  dom.destroyDom();
  dom = null;
});

describe("helper.isComponentlChild", () => {
  it("zero node or props.name", () => {
    expect(isComponentChild(null)).toBe(false);
    expect(isComponentChild({}, {})).toBe(false);
    expect(isComponentChild({}, { props: {} })).toBe(false);
    expect(isComponentChild({}, { props: { name: null } })).toBe(false);
    expect(isComponentChild({}, { props: { name: "f" } })).toBe(false);
  });

  let control;
  let node;
  it("single child", () => {
    dom.render(
      <NodeDiv ref={el => (node = el)}>
        <Control name="f" ref={el => (control = el)} />
      </NodeDiv>
    );
    expect(isComponentChild(node, control)).toBe(true);
    expect(isComponentChild(node.props.children, control)).toBe(true);
  });

  it("inside array", () => {
    dom.render(
      <NodeDiv ref={el => (node = el)}>
        {[
          // render array
          <Control name="f" key="1" ref={el => (control = el)} />
        ]}
      </NodeDiv>
    );
    expect(isComponentChild(node, control)).toBe(true);
  });

  it("inside fragment", () => {
    dom.render(
      <NodeDiv ref={el => (node = el)}>
        <>
          <Control name="f" ref={el => (control = el)} />
        </>
      </NodeDiv>
    );
  });

  it("deep nested", () => {
    dom.render(
      <NodeDiv ref={el => (node = el)}>
        <NodeDiv>
          <Control name="f" ref={el => (control = el)} />
        </NodeDiv>
      </NodeDiv>
    );
    expect(isComponentChild(node, control)).toBe(true);
  });

  it("deep nested in div", () => {
    dom.render(
      <NodeDiv ref={el => (node = el)}>
        <div>
          <Control name="f" ref={el => (control = el)} />
        </div>
      </NodeDiv>
    );
    expect(isComponentChild(node, control)).toBe(true);
  });

  it("deep inherited control", () => {
    dom.render(
      <NodeDiv ref={el => (node = el)}>
        <ControlWrapper name="f" ref={el => (control = el)} />
      </NodeDiv>
    );
    expect(isComponentChild(node, control)).toBe(true);
  });

  it("not children", () => {
    dom.render(
      <div>
        <NodeDiv ref={el => (node = el)}>
          <Control name="f2" />
        </NodeDiv>
        <Control name="f" ref={el => (control = el)} />
      </div>
    );
    expect(isComponentChild(node, control)).toBe(false);
  });
});
