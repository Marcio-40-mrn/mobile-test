# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run all E2E tests (starts Appium automatically, downloads latest APK from EAS first)
npm test

# Run a single spec file
npx wdio run wdio.conf.ts --spec test/specs/login.spec.ts

# Run unit tests (vitest, no device required)
npx vitest run

# Skip the APK download/install (device already has the app)
SKIP_DOWNLOAD=true npm test

# Run the suite on iOS, against a remote Device Farm session
npm run test:ios

# Collect the UI tree of each screen (on demand — not part of the suite)
npm run dump:ios
npm run dump:android
```

### The three execution targets

| Target | How it runs |
|---|---|
| **Android local** | AVD `S25Ultra_API35` on this Windows machine; `onPrepare` downloads the APK from EAS and `adb install`s it |
| **Device Farm (CI)** | Android on every PR, iOS gated behind `workflow_dispatch` with `run_ios=true`. Appium is started by the testspec; detected via `DEVICEFARM_DEVICE_UDID` |
| **iOS local** | XCUITest needs a macOS host, so there is no local Appium. A session is opened manually in Device Farm and WDIO connects to *its* Appium via `REMOTE_HOST`/`REMOTE_PORT`, with `REMOTE_PATH_IOS` as `appium:app` — the same endpoint one would paste into Appium Inspector |

The remote session is **ephemeral**: those three variables change every time and must be refreshed in `.env` before each run. `requireRemoteIosSession()` in `test/support/platform.ts` fails fast listing whichever are missing.

`npm run dump:*` swaps the whole suite for `test/specs/dump-source.spec.ts`, which walks the main flow and writes `pagesource-<platform>-<screen>.xml` into `reports/pagesource/`. Use it when a selector breaks or when porting a screen to iOS — it is a discovery tool, never part of a regression run, and it is not wired into CI.

## Architecture

This is a **WebdriverIO + Appium** test automation suite for the **Arys** app (React Native / Expo). Android is the platform that runs in CI on every PR, locally against the device `S25Ultra_API35`; iOS support exists in the code but is gated (see "Platform support" below).

### Test flow

1. **`onPrepare`** (in `wdio.conf.ts`) runs `scripts/download-build.ts` before any test, which uses the EAS CLI (`eas build:list`) to fetch the latest `INTERNAL` APK from Expo and downloads it to `C:\dev\apk_arys\arys-latest.apk`. Skipped on Device Farm and on iOS.
2. Appium is launched as a service by WDIO with `relaxedSecurity: true` (locally only — on Device Farm the testspec starts it).
3. Specs run in order; `00-update-check.spec.ts` is numbered to run first and handles any pending OTA update popup.
4. `beforeTest`/`afterTest` record a video of every test; on failure `afterTest` also captures a screenshot. Both are attached to the Allure report.

### Platform support

The suite is **cross-platform by construction**: one set of specs and page objects, with only the selector strings and the native API calls branching per platform.

- `test/support/platform.ts` — reads `PLATFORM` from the environment (`testspec-ios.yml` exports `PLATFORM=ios`), exposes `IS_IOS`, `APP_ID` and `requireIosBundleId()`. Use `IS_IOS` **only** where there is no Appium session yet (i.e. `wdio.conf.ts`); everywhere else use `driver.isIOS`.
- `test/support/locator.ts` — the platform-aware selector layer. See below.
- `test/pages/base.page.ts` — wraps every driver API that differs between UiAutomator2 and XCUITest.

**The iOS selectors have not been validated against a real device.** They were derived from the translation rules documented in the header of `test/support/locator.ts`. Treat them as hypotheses until a `npm run dump:ios` run confirms them.

### Key conventions

- **Selectors**: platform pairs resolved through `L()` — never a bare XPath string. See "Selectors" under Test Design Conventions.
- **Native APIs**: never call `mobile: *`, `browser.pressKeyCode()` or `driver.hideKeyboard()` directly from a page or spec — go through a `BasePage` method (see "Platform-specific APIs").
- **Auth state**: most specs start with `loginPage.resetApp()` to reset state, then `doLogin()` / `ensureLoggedIn()` from `test/pages/login.page.ts`. That flow handles the splash screen pause, optional OTA popup, login form, PIN entry, and the in-app notification permission modal.
- **`noReset: true`**: the Appium capability keeps the app installed between sessions; state is reset per-spec via `BasePage.resetApp()`.
- **Unit tests** live in `scripts/__tests__/` and `test/support/__tests__/` and use **Vitest** — they cover pure logic (e.g. `parseLatestBuildUrl`, the selector translation rules) without a device. `vitest.config.ts` scopes collection to those two directories; without it Vitest also picks up the WDIO specs and the whole run fails at collection.

### Environment

Read from `.env` (local) or injected as environment variables by the CI / Device Farm run:

| Variable | Purpose | Consumed by |
|---|---|---|
| `EXPO_TOKEN` | EAS CLI authentication token — required to list/download builds | `scripts/download-build.ts`, `mobile_test.yml` |
| `EXPO_PROJECT_ID` | EAS project ID — exposed as `expo.extra.eas.projectId`; `app.config.js` throws if missing | `app.config.js` (read by `eas build:list`) |
| `TEST_USER_EMAIL` | Login email of the app test account | `test/pages/login.page.ts` (`requireEnv` — throws if missing) |
| `TEST_USER_PASSWORD` | Password of the app test account | `test/pages/login.page.ts` (`requireEnv`) |
| `TEST_USER_PIN` | Access PIN of the app test account | `test/pages/login.page.ts` (`requireEnv`) |
| `PLATFORM` | `android` (default) or `ios` — selects capabilities and the selector set | `test/support/platform.ts`, `wdio.conf.ts` |
| `IOS_BUNDLE_ID` | Bundle identifier of the iOS app. **Not derivable from this repo** — `app.config.js` declares no `ios.bundleIdentifier`. Required on Device Farm; optional locally, where the session reports it | `test/support/platform.ts`, `test/pages/base.page.ts` (`resolveIosBundleId`) |
| `REMOTE_HOST` / `REMOTE_PORT` | Appium endpoint of the manually opened Device Farm session (iOS local only). Ephemeral — refresh before each run | `test/support/platform.ts` (`requireRemoteIosSession`), `wdio.conf.ts` |
| `REMOTE_PATH_IOS` | Path of the app inside that session; becomes the `appium:app` capability | idem |
| `DUMP_SOURCE` | `true` replaces the suite with the page-source collection spec (set by the `dump:*` scripts) | `wdio.conf.ts` |

Optional flags: `SKIP_DOWNLOAD=true` skips the APK download/install; `CI=true` changes report behavior in `wdio.conf.ts`.

On AWS Device Farm the host injects `DEVICEFARM_*` variables automatically (`DEVICEFARM_DEVICE_UDID`, `DEVICEFARM_LOG_DIR`, …); `wdio.conf.ts` uses `DEVICEFARM_DEVICE_UDID` to detect that environment.

**EAS project config:** the project ID is **not** hardcoded — `app.config.js` reads it from `EXPO_PROJECT_ID` and exposes it as `expo.extra.eas.projectId`. `eas build:list` resolves the project from that config (owner `aramis-engenharia` + slug `arys`). There is no `app.json`.

The `.env` file is loaded via `dotenv/config` in both `wdio.conf.ts` and `scripts/download-build.ts`.

CI adds AWS Device Farm secrets — see the README's "GitHub Secrets" table (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DEVICE_FARM_PROJECT_ARN`, `DEVICE_FARM_DEVICE_POOL_ARN`, `DEVICE_FARM_IOS_DEVICE_POOL_ARN`, `IOS_BUNDLE_ID`).

## Test Design Conventions

### Page Object Model

Every screen gets a class in `test/pages/` extending `BasePage`, with selectors declared in a `SEL` object at the top of the file, locators exposed as `get` properties, and interactions as `async` methods. Specs import a page instance and call only its methods — `$()` and `$$()` are forbidden inside spec files.

```ts
// test/pages/login.page.ts
import { BasePage } from './base.page';
import { L, byText, byTextContains, byTestId } from '../support/locator';

const SEL = {
  emailField: {
    android: '//android.widget.EditText[@hint="Digite seu e-email"]',
    ios: '//XCUIElementTypeTextField[@value="Digite seu e-email"]',
  },
  submitButton: byTestId('btn-sign-in-submit'),
  loginTitle: byText('Entrar'),
  homeGreeting: byTextContains('Olá,'),
};

class LoginPage extends BasePage {
  get emailField() { return $(L(SEL.emailField)); }
  get submitButton() { return $(L(SEL.submitButton)); }

  async fillAndSubmit(email: string, senha: string) {
    await (await this.emailField).setValue(email);
    await this.hideKeyboard();          // não driver.hideKeyboard()
    await (await this.submitButton).click();
  }
}
export const loginPage = new LoginPage();
```

Declaring selectors in `SEL` (rather than inline in each getter) is what lets `BasePage.isDisplayedOn(SEL.x)` reuse the same pair without re-resolving a string.

`test/support/` is for **test infrastructure** — platform detection and selector translation. It is not a place for business flows: cross-page behavior belongs in `BasePage` (e.g. `dismissUpdatePopupIfPresent`, `handleNotificationPopup`), and multi-screen flows belong in the page that owns the entry point (e.g. `loginPage.ensureLoggedIn()`).

### Selectors

Every selector is a `{ android, ios }` pair resolved at call time by `L()` from `test/support/locator.ts`. Prefer the shared builders over hand-written pairs:

- `byTestId('btn-x')` — **the preferred strategy.** A React Native `testID` becomes `resource-id` on Android and `accessibilityIdentifier` on iOS, so one call covers both.
- `byText` / `byTextContains` — visible copy. Fragile (breaks on wording changes and on i18n); use only when no testID exists.
- `byInputValue` — an input field identified by its current content.
- `byAccessibilityLabel` — `~label`. Note the asymmetry documented in `locator.ts`: on Android `~` matches `content-desc`, on iOS it matches `name`, which is the `accessibilityIdentifier` when one exists and only falls back to the label otherwise.

The full Android→iOS translation table (`@text`→`@label`, `@hint`→`@value`, `android.widget.EditText`→`XCUIElementTypeTextField`, …) lives in the header of `test/support/locator.ts`. **Read it there, don't duplicate it** — it is the single source of truth and is kept next to the code it governs.

Two selectors deliberately keep their Android class coupling (`//android.view.ViewGroup[@resource-id=…]` in `home.page.ts:backButton` and `clientes.page.ts:sortFilterBtn`) rather than using `byTestId`. Loosening them would widen the match to any node with that id, and that is not verifiable without a device. Don't "simplify" them.

### Platform-specific APIs

Anything that differs between UiAutomator2 and XCUITest is wrapped in `BasePage`. Pages and specs call the wrapper, never the driver directly:

| Instead of | Call |
|---|---|
| `driver.execute('mobile: clearApp')` + `activateApp` | `resetApp()` — XCUITest has no `clearApp`; iOS removes and reinstalls |
| `browser.pressKeyCode(66)` | `submitSearch()` |
| `driver.execute('mobile: type', …)` | `typeIntoFocused(text)` |
| `driver.hideKeyboard()` | `hideKeyboard()` — swallows the iOS "no dismiss button" error |
| `driver.execute('mobile: scrollGesture', …)` | `scrollDown(percent)` / `scrollUp(percent)` |
| repeated "if not displayed, scroll" | `scrollIntoViewByRetry(() => el)` |

The Android `scrollGesture` area is intentionally hardcoded (`left:100, top:300, width:300, height:400`). `percent` multiplies that area's height, so deriving it from the viewport would change the scroll distance and break the Home/Clientes calibration. Changing it requires running the suite on a device.

### DRY

If the same selector or interaction sequence appears in more than one file, it belongs in the page class, in `BasePage`, or as a builder in `test/support/locator.ts`. No exceptions.

### YAGNI

Add methods to a page only when a test requires them. Pages grow with tests, not ahead of them.

### Conditional Waits

Never use `browser.pause()` as a substitute for waiting on UI state. Always wait on observable element transitions:

- Element appearing: `waitForDisplayed({ timeout: N })`
- Element disappearing: `waitForDisplayed({ reverse: true, timeout: N })`

`browser.pause()` is only allowed for delays caused by animations or infrastructure that produce no observable element change. Require an inline comment explaining the constraint:

```ts
await browser.pause(500); // <reason: animation or infra constraint that produces no observable UI change>
```
