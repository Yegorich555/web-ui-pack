// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JustForGlobal {}

declare global {
  const unhandledReject: typeof console.error; // jest.Mock<void, [Error]>;

  interface Window {
    unhandledReject: typeof console.error; // jest.Mock<void, [Error]>;
  }

  namespace NodeJS {
    interface Global {
      unhandledReject: typeof console.error; // jest.Mock<void, [Error]>;
    }
  }
}
