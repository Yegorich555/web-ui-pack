typescript;
/* eslint-disable react/require-default-props */
/* eslint-disable react/sort-comp */
/* eslint-disable import/newline-after-import */
/* eslint-disable import/first */
/* eslint-disable import/no-duplicates */
/* eslint-disable import/prefer-default-export */

// -------------------  main.tsx -------------------
import { localeInfo } from "web-ui-pack";
localeInfo.refresh(); // to update date & number formats according to user-locale

// -------------------  textControl.tsx -------------------
import { WUPTextControl } from "web-ui-pack";

// #1 change defaults
WUPTextControl.$defaults.clearButton = true;

// #2.0 override messages according to required language
const defVld = { ...WUPTextControl.$defaults.validationRules };
// rule "min"
WUPTextControl.$defaults.validationRules.min = (v, setV, c) =>
  defVld.min.call(c, v, setV, c) && `Min length ${setV} chars`;
// rule "email"
const emailReg =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
WUPTextControl.$defaults.validationRules.email = (v, setV) =>
  setV && (!v || !emailReg.test(v)) && "Invalid email address";

// #2.1 override ariaMessages according to required language
WUPTextControl.$ariaError = "Error for";
// check also other props started with `$aria...`: `WUPTextControl.$aria...`

// #3 extend default validations
declare global {
  namespace WUP.Text {
    interface ValidityMap {
      isNumber?: boolean; // it's required to extend default validationRules
    }
  }
}
WUPTextControl.$defaults.validationRules.isNumber = (v) => !/^[0-9]*$/.test(v) && "Please enter a valid number";

/* #4 reuse web-ui-pack control inside component
 in this case if you don't import TextControl component at all this part of code will be skipped from build - it's good for optimization */
import React from "react";

interface Props extends Partial<WUP.Text.Options> {
  className?: string;
  initValue?: string;
  value?: string;
  onChange?: WUPTextControl["$onChange"];
}

export class TextControl extends React.Component<Props> {
  domEl = {} as WUPTextControl;

  /* constructor(props: Props) {
    super(props);
    this.state = {};
  } */

  updateOptions(nextProps: Props | null): void {
    Object.assign(this.domEl.$options, this.props);
    this.domEl.$onChange = this.props.onChange;
    if (!nextProps || nextProps.initValue !== this.props.initValue) {
      this.domEl.$initValue = this.props.initValue; // update only if value changed
    }
    if (!nextProps || nextProps.value !== this.props.value) {
      this.domEl.$value = this.props.value; // update only if value changed
    }
  }

  /* Called every time when DOM element is appended to document */
  componentDidMount(): void {
    this.updateOptions(null);
  }

  /* Called every time when properties are changed */
  shouldComponentUpdate(nextProps: Readonly<Props>): boolean {
    const isChanged = this.props !== nextProps;
    isChanged && this.updateOptions(nextProps);
    return isChanged;
  }

  /* Called every time when properties are changed */
  render(): React.ReactNode {
    return (
      <wup-text
        class={["my-custom-class", this.props.className].filter((v) => v).join(" ")}
        ref={(el) => {
          this.domEl = el || this.domEl || ({} as any);
        }}
      />
    );
  }
}

// -------------------  main.ts -------------------
export function MainComponent() {
  return (
    <TextControl
      name="email"
      validations={{ email: true }}
      onChange={(e) => console.warn("Changed", { reason: e.detail, value: (e.target as WUPTextControl).$value })}
    />
  );
}
