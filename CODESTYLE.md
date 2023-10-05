# Code style

Logic below contains best practice for re-using web-ui-pack elements. The main idea is create Component native to your framework and use web-ui-pack elements inside. Using web-ui-pack elements everywhere directly isn't recommended because in this case you need to import components to `main.ts` and if you somehow don't use these anymore it won't be removed by optimizator.

## Bad practice

Code below shows case when developer desides to use WUPTextControl everywhere.

```jsx
// main.ts
import { WUPTextControl } from "web-ui-pack";
!WUPTextControl && console.error("!"); // required to avoid side-effects - optimization feature/issue
// other files.tsx
<wup-text w-name="email" />;
// If remove <wup-text/> everywhere it's still imported in the build because inlcuded in `main.ts`
```

---

## Good practice

## Step 1 - global localeInfo & builtin-styles

```js
// main.ts
import { localeInfo } from "web-ui-pack";
import { useBuiltinStyle, WUPcssScrollSmall } from "web-ui-pack/styles";
// use this to update date & number formats according to user locale
localeInfo.refresh();
// OR setup specific locale that doesn't depend on user OS settings
// localeInfo.refresh("fr-FR");
// OR skip this if you satisfied with defaults "en-US"

// use this to apply scroll-style from web-ui-pack to all elements with class=".scrolled"
useBuiltinStyle(
  `${WUPcssScrollSmall(".scrolled")}
  .scrolled {
     overflow: auto;
  }`
);
```

## Step 2 - override/extend defaults

```tsx
// textControl.tsx
import { WUPTextControl } from "web-ui-pack";

// #1 change defaults
WUPTextControl.$defaults.clearButton = true;

// #2.0 override messages according to required language
const defVld = { ...WUPTextControl.$defaults.validationRules };
const vld = WUPTextControl.$defaults.validationRules;
// rule "min"
vld.min = (v, setV, c) => defVld.min.call(c, v, setV, c) && `Min length ${setV} chars`;
// rule "email"
vld.email = (v, setV) => setV && (!v || !v.includes("@")) && "Invalid email address";

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
vld.isNumber = (v) => !/^[0-9]*$/.test(v) && "Please enter a valid number";
```

## Step 3 - use inside component

90% logic here reusable for other frameworks like Angular, Vue etc.

**Attention!** Logic below placed in the same file that logic above

```tsx
// textControl.tsx
import React from "react";

// #4 reuse web-ui-pack control inside component

interface Props extends Partial<WUP.Text.Options> {
  className?: string;
  initValue?: string;
  value?: string;
  onChange?: WUPTextControl["$onChange"];
}

export class TextControl extends React.Component<Props> {
  domEl = {} as WUPTextControl;

  /* Apply React props to $options */
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
    // update render only if className is changed otherwise apply props directly to options
    return this.props.className !== nextProps.className;
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

## Override styles

Use css variables globally

```css
body {
  --border-radius: 6px;
  --ctrl-focus: #00778d;
  --ctrl-label: #5e5e5e;
  --ctrl-err: #ad0000;
  --ctrl-invalid-border: red;
}
body[wupdark] {
  /* this is built-in styles for darkMode: set attr [wupdark] to body to use it; Don't forget to define general background & text colors */
}
/* OR */
wup-num,
wup-text {
  --ctrl-padding: 12px 14px;
}
```

Use css variables per class for specific case

```css
.my-custom-class {
  --ctrl-err: red;
  --ctrl-invalid-border: red;
}
```
