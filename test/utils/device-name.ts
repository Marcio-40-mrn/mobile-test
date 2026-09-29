// Nome do aparelho desta execução, para o relatório Allure.
//
// Sem ele os N devices do pool têm o mesmo título de teste e o Allure os colapsa
// num teste só com "retries". Nada aqui cita um aparelho: tudo vem do host ou do CI.
//
//   iOS Device Farm  — DEVICE_LABEL, injetado no testspec pelo CI (o
//                      DEVICEFARM_DEVICE_NAME no iOS é o UDID, inútil como rótulo)
//   Android DF/local — fabricante + modelo que o UiAutomator2 devolve na sessão
//                      (ex.: "samsung SM-S938U1"); no AVD, o deviceName da capability
//   iOS Remote       — "iOS Remote"
import { IS_IOS } from './platform';

const REMOTE_ACCESS_LABEL = 'iOS Remote';

function capability(name: string): string | undefined {
  const capabilities = browser.capabilities as Record<string, unknown>;
  const value = capabilities[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Só pode ser chamada com a sessão aberta (lê `browser.capabilities`). */
export function deviceLabel(): string {
  const injected = process.env.DEVICE_LABEL;
  if (injected) return injected;

  if (IS_IOS) return process.env.DEVICEFARM_DEVICE_NAME ?? REMOTE_ACCESS_LABEL;

  // Local: o AVD tem nome próprio na capability (ex.: S25Ultra_API35); no Device Farm
  // o deviceName vem do host e é o serial, então lá vale o fabricante + modelo.
  const isDeviceFarm = Boolean(process.env.DEVICEFARM_DEVICE_UDID);
  if (!isDeviceFarm && capability('deviceName')) return capability('deviceName') as string;

  const manufacturer = capability('deviceManufacturer');
  const model = capability('deviceModel');
  if (model) return manufacturer ? `${manufacturer} ${model}` : model;

  return process.env.DEVICEFARM_DEVICE_NAME ?? 'android';
}
