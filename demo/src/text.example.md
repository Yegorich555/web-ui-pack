# Code style

Logic below contains best practice for re-using web-ui-pack elements. The main idea is create Component native to you framework and use web-ui-pack elements inside. Using web-ui-pack elements everywhere directly isn't recommended because in this case you need to import components to `main.ts` and if you somehow don't use these anymore it won't be removed by optimizator.

## Bad practice

Code below shows case when developer desides to use WUPTextControl everywhere.

```jsx
// main.ts
import { WUPTextControl } from "web-ui-pack";
!WUPTextControl && console.error("!"); // required to avoide side-effects optimization issue
// other files..tsx
<wup-text name="email" />; // If remove <wup-text/> everywhere it still imported in the build result because inlcuded in main.ts
```

## Step 1 - global localeInfo

```js
// main.ts
import { localeInfo } from "web-ui-pack";
localeInfo.refresh(); // use this once to update date & number formats according to user-locale
```

## Step 2 - override/extend defaults

```tsx
// textControl.tsx
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
```

## Step 3 - use inside component

90% logic here reusable for other frameworks like Angular, Vue etc.

**Attention!** Logic below placed in the same file that logic above

```tsx
// textControl.tsx
import React from "react";

/* #4 reuse web-ui-pack control inside component
 in this case if you don't import TextControl component at all this part of code will be skipped from build - it's good for optimization */

interface Props extends Partial<WUP.Text.Options> {
  className?: string;
  initValue?: string;
  value?: string;
  onChange?: WUPTextControl["$onChange"];
}

export class TextControl extends React.Component<Props> {
  domEl = {} as WUPTextControl;

  /* Apply props to $options */
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
    return this.props.className !== nextProps.className; // update render only if className is changed otherwise apply props directly to options
  }

  /* Called init and every time when shouldComponentUpdate returns `true`*/
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
```

## Reuse defined component everywhere you want

```tsx
// login.tsx
export function LoginComponent() {
  return (
   {/*... form here*/}
    <>
      <TextControl
        name="email"
        validations={{ email: true }}
        onChange={(e) => console.warn("Changed", { reason: e.detail, value: (e.target as WUPTextControl).$value })}
      />
      {/*... other controls here*/}
    </>
  );
}
```
