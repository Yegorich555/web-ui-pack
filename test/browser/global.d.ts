import { Page } from "puppeteer";
import React from "react";

export interface PageExtended extends Page {
  injectFile: (path: string) => Promise<void>;
}

declare global {
  const pageExt: PageExtended;
  /** Attention: it doesn't work with `toMatchInlineSnapshot` file @link https://github.com/facebook/jest/issues/11730 */
  function renderIt(el: React.ReactElement): Promise<void>;
  function renderHtml(str: string): void;
}
