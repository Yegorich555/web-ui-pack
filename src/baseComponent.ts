import Core from "./core";

function isPropsChanged<T extends Record<string, any>>(
  v1: T,
  v2: T,
  excludeProps: Readonly<Array<keyof T | string>>
): boolean {
  const keys = Object.keys(v1);
  for (let i = 0, key = keys[0]; i <= keys.length; key = keys[++i]) {
    if (v2[key] !== v1[key] && !excludeProps.includes(key as keyof T)) {
      return true;
    }
  }
  return false;
}

export interface BaseComponentProps {
  /** Html attribute */
  className?: string;
  /** Html attribute. This is InitProp - replacing after component-init doesn't have effect */
  autoFocus?: boolean;
}

export abstract class BaseComponent<Props extends BaseComponentProps, State> extends Core.Component<Props, State> {
  // watch-fix: https://github.com/Microsoft/TypeScript/issues/3841#issuecomment-337560146
  ["constructor"]: typeof BaseComponent;

  /** props that are ignored in shouldComponentUpdate */
  static excludedRenderProps: Readonly<Array<keyof BaseComponentProps>> = ["autoFocus"];

  domEl: HTMLElement | null | undefined;
  setDomEl = <T extends HTMLElement>(el: T | null): void => {
    this.domEl = el;
  };

  /** @inheritdoc */
  componentDidMount(): void {
    if (this.props.autoFocus && this.domEl) {
      this.domEl.focus();
    }
  }

  /** @inheritdoc */
  shouldComponentUpdate(nextProps: Readonly<Props>, nextState: Readonly<State>, nextContext: any): boolean {
    if (this.state !== nextState || this.context !== nextContext) {
      return true;
    }
    // in this case props are always new
    const { props } = this;
    const excludeProps = this.constructor.excludedRenderProps;
    return isPropsChanged(props, nextProps, excludeProps) || isPropsChanged(nextProps, props, excludeProps);
  }
}
