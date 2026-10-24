/**
 * `initSentry` wiring: the environment tag and the per-environment trace rate reach
 * `Sentry.init`, and the init runs once. `src/services/sentry.ts` reads the DSN and the
 * Expo Go flag at import time, so each case loads a fresh module.
 */

const mockInit = jest.fn();

jest.mock("@sentry/react-native", () => ({
  init: (...args: unknown[]) => mockInit(...args),
}));

const mockConstants: { executionEnvironment: string } = {
  executionEnvironment: "standalone",
};
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: mockConstants,
}));

const mockMaestro = { IS_MAESTRO: false };
jest.mock("@/config/maestro", () => mockMaestro);

function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

type SentryModule = typeof import("../sentry");

function loadSentry(env: {
  appEnvironment?: string;
  dsn?: string;
  expoGo?: boolean;
  isDev?: boolean;
  isE2E?: boolean;
}): SentryModule {
  // Assigning `undefined` to process.env stores the string "undefined", so delete instead.
  setEnv("EXPO_PUBLIC_ENVIRONMENT", env.appEnvironment);
  setEnv("EXPO_PUBLIC_SENTRY_DSN", env.dsn);
  mockConstants.executionEnvironment = env.expoGo
    ? "storeClient"
    : "standalone";
  mockMaestro.IS_MAESTRO = env.isE2E ?? false;
  (globalThis as { __DEV__?: boolean }).__DEV__ = env.isDev ?? false;
  let mod!: SentryModule;
  jest.isolateModules(() => {
    mod = jest.requireActual<SentryModule>("../sentry");
  });
  return mod;
}

const DSN = "https://public@example.invalid/1";
const initOptions = (): { environment: string; tracesSampleRate: number } =>
  mockInit.mock.calls[0][0] as {
    environment: string;
    tracesSampleRate: number;
  };

describe("initSentry", () => {
  const savedEnv = { ...process.env };
  const savedDev = (globalThis as { __DEV__?: boolean }).__DEV__;

  beforeEach(() => mockInit.mockClear());
  afterAll(() => {
    process.env = savedEnv;
    (globalThis as { __DEV__?: boolean }).__DEV__ = savedDev;
  });

  it.each([
    ["production", "production", 0.1],
    ["preview", "staging", 0.02],
    [undefined, "development", 0],
  ] as const)(
    "app environment %s reports %s with traces %s",
    (appEnvironment, environment, rate) => {
      loadSentry({ appEnvironment, dsn: DSN }).initSentry();

      expect(mockInit).toHaveBeenCalledTimes(1);
      expect(initOptions().environment).toBe(environment);
      expect(initOptions().tracesSampleRate).toBe(rate);
    },
  );

  it("samples no traces in a __DEV__ bundle even when it targets staging", () => {
    loadSentry({
      appEnvironment: "preview",
      dsn: DSN,
      isDev: true,
    }).initSentry();

    expect(initOptions().environment).toBe("development");
    expect(initOptions().tracesSampleRate).toBe(0);
  });

  it("samples no traces in a Maestro E2E build", () => {
    loadSentry({
      appEnvironment: "preview",
      dsn: DSN,
      isE2E: true,
    }).initSentry();

    expect(initOptions().environment).toBe("development");
    expect(initOptions().tracesSampleRate).toBe(0);
  });

  it("initializes only once", () => {
    const { initSentry } = loadSentry({
      appEnvironment: "production",
      dsn: DSN,
    });
    initSentry();
    initSentry();

    expect(mockInit).toHaveBeenCalledTimes(1);
  });

  it("is a no-op without a DSN", () => {
    loadSentry({ appEnvironment: "production" }).initSentry();

    expect(mockInit).not.toHaveBeenCalled();
  });

  it("is a no-op in Expo Go", () => {
    loadSentry({
      appEnvironment: "production",
      dsn: DSN,
      expoGo: true,
    }).initSentry();

    expect(mockInit).not.toHaveBeenCalled();
  });
});
