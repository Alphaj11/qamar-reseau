// Notifie les iPhone qu'une carte a changé (APNs). L'iPhone vient ensuite chercher la
// nouvelle version de la carte sur notre service web, puis affiche le changeMessage.
// Pour les cartes Wallet, on s'authentifie avec le certificat "Pass Type ID" et la charge est "{}".
import "server-only";
import http2 from "http2";
import type { AppleConfig } from "./config";

const APNS_HOST = "https://api.push.apple.com";

export interface PushOutcome {
  pushToken: string;
  ok: boolean;
  status?: number;
  /** true si Apple indique que ce téléphone n'existe plus : on supprime l'enregistrement. */
  gone: boolean;
}

export async function pushPassUpdates(cfg: AppleConfig, pushTokens: string[]): Promise<PushOutcome[]> {
  if (!pushTokens.length) return [];
  if (!cfg.pushEnabled) {
    return pushTokens.map((pushToken) => ({ pushToken, ok: true, gone: false }));
  }
  const client = http2.connect(APNS_HOST, {
    cert: cfg.signerCert,
    key: cfg.signerKey,
    passphrase: cfg.signerKeyPassphrase,
  });
  client.on("error", () => undefined);
  try {
    return await Promise.all(
      pushTokens.map(
        (pushToken) =>
          new Promise<PushOutcome>((resolve) => {
            const req = client.request({
              ":method": "POST",
              ":path": `/3/device/${pushToken}`,
              "apns-topic": cfg.passTypeId,
              "content-type": "application/json",
            });
            let status: number | undefined;
            req.on("response", (h) => (status = Number(h[":status"])));
            req.on("error", () => resolve({ pushToken, ok: false, gone: false }));
            req.on("close", () =>
              resolve({ pushToken, ok: status === 200, status, gone: status === 410 || status === 400 }),
            );
            req.setTimeout(10_000, () => req.close());
            req.end("{}");
          }),
      ),
    );
  } finally {
    client.close();
  }
}
