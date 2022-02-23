import { Page } from "puppeteer";

export interface PageExtended extends Page {
  injectFile: (path: string) => Promise<void>;
}

declare global {
  const pageExt: PageExtended;
  function renderIt(): void;
}
