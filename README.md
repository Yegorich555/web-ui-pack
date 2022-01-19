# web-ui-pack

Web package with custom high scalable WebComponents and helpers

[![npm version](https://img.shields.io/npm/v/web-ui-pack.svg?style=flat-square)](https://www.npmjs.com/package/web-ui-pack)
[![code coverage](https://coveralls.io/repos/github/Yegorich555/web-ui-pack/badge.svg?style=flat-square)](https://coveralls.io/github/Yegorich555/web-ui-pack)
[![install size](https://packagephobia.now.sh/badge?p=web-ui-pack)](https://packagephobia.now.sh/result?p=web-ui-pack)
[![npm downloads](https://img.shields.io/npm/dm/web-ui-pack.svg?style=flat-square)](http://npm-stat.com/charts.html?package=web-ui-pack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- Possible to use **with/without** any frameworks like Angular, React, Vue etc. (because it's js-native logic)
- Focus on accessibility (best practices)
- Focus on scalability (every component is developed to easy inherit and redefine/extend default logic)
- Built-in css-variables to use custom color-themes
- Optimized for webpack (in build included only in-use components and helpers)
- Zero dependancy (we don't need to wait for bug-fixing on another packages)
- Always 100% test coverage via e2e and unit tests (it's must-have and always will be so)

## Installing

Using npm:

```npm
npm install web-ui-pack
```

### UI Components

Coming soon

### Helpers

use `import focusFirst from "web-ui-pack/helpers/focusFirst"` etc.
or `import { focusFirst } from "web-ui-pack"`

- [**focusFirst**(element: HTMLElement)](#helpers) ⇒ `Set focus on parent itself or first possible element inside`
- [**nestedProperty.set**](#helpers) ⇒ `nestedProperty.set(obj, "value.nestedValue", 1) sets obj.value.nestedValue = 1`
- [**nestedProperty.get**](#helpers) ⇒ `nestedProperty.get(obj, "nestedValue1.nestVal2") returns value from obj.nestedValue1.nestVal2`
- **onEvent**([...args](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)) ⇒ `More strict (for Typescript) wrapper of addEventListener() that returns callback with removeListener()`
- [**onFocusGot**(element: HTMLElement, listener: (ev) => void, {debounceMs: 100, once: false, ...})](#helpers) ⇒ `Fires when element/children takes focus once (fires again after onFocusLost on element)`
- [**onFocusLost**(element: HTMLElement, listener: (ev) => void, {debounceMs: 100, once: false, ...})](#helpers) ⇒ `Fires when element/children completely lost focus`
- [**promiseWait**(promise: Promise, ms: number)](#helpers) ⇒ `Produce Promise during for "no less than pointed time"; it helps for avoding spinner blinking during the very fast api-request in case: pending > waitResponse > resetPending`
- [**stringPrettify**(text: string, changeKebabCase = false)](#helpers) ⇒ `Changes camelCase, snakeCase, kebaCase text to user-friendly`
