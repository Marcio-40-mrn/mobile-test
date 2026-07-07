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
```

## Architecture

This is a **WebdriverIO + Appium** test automation suite for the **Arys** Android app (React Native / Expo), targeting the device `S25Ultra_API35`.

### Test flow

1. **`onPrepare`** (in `wdio.conf.ts`) runs `scripts/download-build.ts` before any test, which uses the EAS CLI (`eas build:list`) to fetch the latest `INTERNAL` APK from Expo and downloads it to `C:\dev\apk_arys\arys-latest.apk`.
2. Appium is launched as a service by WDIO with `relaxedSecurity: true`.
3. Specs run in order; `00-update-check.spec.ts` is numbered to run first and handles any pending OTA update popup.
4. On test failure, `afterTest` auto-captures a screenshot to `test/screenshots/`.

### Key conventions

- **Selectors**: XPath only — use `@text`, `@content-desc`, `@resource-id`, and `@hint` attributes as found in the app's UI dump.
- **Auth state**: Most specs start by calling `mobile: clearApp` + `activateApp` to reset state, then call `doLogin()` from `test/helpers/auth.helper.ts`. The helper handles the splash screen pause, optional OTA popup, login form, PIN entry, and notification permission popup.
- **`noReset: true`**: The Appium capability keeps the app installed between sessions; state is reset per-spec via `mobile: clearApp`.
- **Unit tests** live in `scripts/__tests__/` and use **Vitest** — they test pure logic (e.g., `parseLatestBuildUrl`) without a device.

### Environment

Read from `.env` (local) or injected as environment variables by the CI / Device Farm run:

| Variable | Purpose | Consumed by |
|---|---|---|
| `EXPO_TOKEN` | EAS CLI authentication token — required to list/download builds | `scripts/download-build.ts`, `_devicefarm-run.yml` |
| `EXPO_PROJECT_ID` | EAS project ID — exposed as `expo.extra.eas.projectId`; `app.config.js` throws if missing | `app.config.js` (read by `eas build:list`) |
| `TEST_USER_EMAIL` | Login email of the app test account | `test/pages/login.page.ts` (`requireEnv` — throws if missing) |
| `TEST_USER_PASSWORD` | Password of the app test account | `test/pages/login.page.ts` (`requireEnv`) |
| `TEST_USER_PIN` | Access PIN of the app test account | `test/pages/login.page.ts` (`requireEnv`) |

Optional flags: `SKIP_DOWNLOAD=true` skips the APK download/install; `CI=true` changes report/screenshot behavior in `wdio.conf.ts`.

On AWS Device Farm the host injects `DEVICEFARM_*` variables automatically (`DEVICEFARM_DEVICE_UDID`, `DEVICEFARM_LOG_DIR`, …); `wdio.conf.ts` uses `DEVICEFARM_DEVICE_UDID` to detect that environment.

**EAS project config:** the project ID is **not** hardcoded — `app.config.js` reads it from `EXPO_PROJECT_ID` and exposes it as `expo.extra.eas.projectId`. `eas build:list` resolves the project from that config (owner `aramis-engenharia` + slug `arys`). There is no `app.json`.

The `.env` file is loaded via `dotenv/config` in both `wdio.conf.ts` and `scripts/download-build.ts`.

CI adds AWS Device Farm secrets — see the README's "GitHub Secrets" table (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DEVICE_FARM_PROJECT_ARN`, `DEVICE_FARM_DEVICE_POOL_ARN`, `DEVICE_FARM_IOS_DEVICE_POOL_ARN`).

## Test Design Conventions

### Page Object Model

Every screen gets a class in `test/pages/` with locators as `get` properties and interactions as `async` methods. Specs import a page instance and call only its methods — `$()` and `$$()` are forbidden inside spec files.

```ts
// test/pages/login.page.ts
class LoginPage {
  get emailField() { return $('//android.widget.EditText[@hint="Digite seu e-email"]'); }
  get passwordField() { return $('//android.widget.EditText[@hint="Digite sua senha"]'); }
  get submitButton() { return $('//*[@resource-id="btn-sign-in-submit"]'); }

  async fillAndSubmit(email: string, password: string) {
    await (await this.emailField).setValue(email);
    await (await this.passwordField).setValue(password);
    await driver.hideKeyboard();
    await (await this.submitButton).click();
  }
}
export const loginPage = new LoginPage();
```

`test/helpers/` is reserved for cross-page flows (e.g., `doLogin()`). Helpers call page methods, never raw selectors.

### DRY

If the same selector or interaction sequence appears in more than one file, it belongs in the page class or a shared helper. No exceptions.

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
