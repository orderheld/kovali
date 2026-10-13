"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, KeyRound, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { buttonClass } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/**
 * Generates the values for the Vercel environment variables in the browser. Nothing typed
 * here is sent to the server: the password is hashed locally with PBKDF2 (WebCrypto).
 */

const ITERATIONS = 600_000;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input: string): Uint8Array<ArrayBuffer> {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of input.toUpperCase().replace(/[^A-Z2-7]/g, "")) {
    value = (value << 5) | BASE32.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

function random(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n));
}

async function hashPassword(password: string): Promise<string> {
  const salt = random(16);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password.normalize("NFC")), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256);
  return `pbkdf2-sha256:${ITERATIONS}:${base64url(salt)}:${base64url(new Uint8Array(bits))}`;
}

async function totpNow(secret: string, offset = 0): Promise<string> {
  const counter = Math.floor(Date.now() / 30_000) + offset;
  const msg = new Uint8Array(8);
  new DataView(msg.buffer).setBigUint64(0, BigInt(counter));
  const key = await crypto.subtle.importKey("raw", base32Decode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const o = mac[mac.length - 1] & 0x0f;
  const bin = (((mac[o] & 0x7f) << 24) | (mac[o + 1] << 16) | (mac[o + 2] << 8) | mac[o + 3]) % 1_000_000;
  return String(bin).padStart(6, "0");
}

const COMMON = ["111111", "123456", "12345678", "password", "passwort", "kovali", "admin", "qwertz", "000000"];

function weakness(pw: string): string | null {
  if (!pw) return null;
  if (COMMON.some((c) => pw.toLowerCase().includes(c)) || /^(.)\1*$/.test(pw)) {
    return "Dieses Passwort steht in jeder Liste, die Angreifer zuerst ausprobieren. Es schützt die Kandidatendaten kaum.";
  }
  if (pw.length < 12) return "Kürzer als 12 Zeichen. Empfohlen sind mindestens 12 Zeichen oder eine Passphrase aus vier Wörtern.";
  return null;
}

function CopyValue({ name, value }: { name: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 rounded-md border border-line bg-mist/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <code className="text-xs font-semibold text-ink">{name}</code>
        <button
          type="button"
          className={buttonClass("secondary", "sm")}
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
          {copied ? "Kopiert" : "Wert kopieren"}
        </button>
      </div>
      <code className="mt-2 block font-mono text-xs break-all text-slate">{value}</code>
    </div>
  );
}

function Step({ icon: Icon, title, children }: { icon: typeof KeyRound; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-ink">
        <Icon aria-hidden className="size-4 text-blue" />
        {title}
      </h2>
      <div className="mt-2 text-sm text-slate">{children}</div>
    </section>
  );
}

const input =
  "block w-full rounded-md border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink focus:border-blue focus:ring-2 focus:ring-blue/20 focus:outline-none";

export function SetupGenerator() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [hash, setHash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [totp, setTotp] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [test, setTest] = useState("");
  const [testResult, setTestResult] = useState<boolean | null>(null);

  useEffect(() => {
    if (!totp) return;
    const uri = `otpauth://totp/KOVALI:Admin?secret=${totp}&issuer=KOVALI&algorithm=SHA1&digits=6&period=30`;
    QRCode.toDataURL(uri, { margin: 1, width: 220, errorCorrectionLevel: "M" }).then(setQr, () => setQr(null));
  }, [totp]);

  const warn = weakness(pw);
  const mismatch = pw2.length > 0 && pw !== pw2;

  return (
    <div className="space-y-4">
      <Step icon={KeyRound} title="1. Passwort festlegen">
        <p>Das Passwort wird hier im Browser in einen Hash umgerechnet. Nur der Hash kommt zu Vercel, das Passwort selbst wird nirgends gespeichert.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            Passwort
            <input type="password" autoComplete="new-password" className={cn(input, "mt-1.5")} value={pw} onChange={(e) => { setPw(e.target.value); setHash(null); }} />
          </label>
          <label className="block text-sm font-medium text-ink">
            Passwort wiederholen
            <input type="password" autoComplete="new-password" className={cn(input, "mt-1.5")} value={pw2} onChange={(e) => { setPw2(e.target.value); setHash(null); }} />
          </label>
        </div>
        {warn ? <p className="mt-2 text-[0.8125rem] font-medium text-amber-800">{warn}</p> : null}
        {mismatch ? <p className="mt-2 text-[0.8125rem] font-medium text-red-700">Die beiden Eingaben stimmen nicht überein.</p> : null}
        <button
          type="button"
          className={cn(buttonClass("primary", "md"), "mt-4")}
          disabled={!pw || pw !== pw2 || busy}
          onClick={async () => {
            setBusy(true);
            try {
              setHash(await hashPassword(pw));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Wird berechnet …" : "Hash erzeugen"}
        </button>
        {hash ? <CopyValue name="ADMIN_PASSWORD_HASH" value={hash} /> : null}
      </Step>

      <Step icon={ShieldCheck} title="2. Geheimer Schlüssel">
        <p>
          Damit werden Lebensläufe und Dokumente verschlüsselt. Den Wert einmal erzeugen, in Vercel eintragen und zusätzlich im Passwort-Manager
          ablegen. <strong className="text-ink">Er darf nie mehr geändert werden</strong>, sonst lassen sich gespeicherte Dokumente nicht mehr öffnen.
        </p>
        <button type="button" className={cn(buttonClass("secondary", "md"), "mt-4")} onClick={() => setSecret(base64url(random(32)))}>
          <RefreshCw aria-hidden className="size-4" />
          {secret ? "Neu erzeugen" : "Schlüssel erzeugen"}
        </button>
        {secret ? <CopyValue name="ADMIN_SECRET" value={secret} /> : null}
      </Step>

      <Step icon={Smartphone} title="3. Zwei-Faktor-Code (empfohlen)">
        <p>
          Mit einer Authenticator-App (z.&nbsp;B. Microsoft Authenticator, Google Authenticator, 1Password) braucht die Anmeldung zusätzlich einen
          sechsstelligen Code. Ein erratenes Passwort reicht dann nicht mehr.
        </p>
        <button
          type="button"
          className={cn(buttonClass("secondary", "md"), "mt-4")}
          onClick={() => {
            setTotp(base32(random(20)));
            setTest("");
            setTestResult(null);
          }}
        >
          <RefreshCw aria-hidden className="size-4" />
          {totp ? "Neu erzeugen" : "Code-Schlüssel erzeugen"}
        </button>
        {totp ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR-Code für die Authenticator-App" width={220} height={220} className="rounded-md border border-line" />
            ) : null}
            <div>
              <p>QR-Code mit der App scannen, dann den angezeigten Code hier prüfen:</p>
              <div className="mt-2 flex gap-2">
                <input
                  className={cn(input, "w-32")}
                  inputMode="numeric"
                  placeholder="123456"
                  value={test}
                  onChange={(e) => {
                    setTest(e.target.value);
                    setTestResult(null);
                  }}
                />
                <button
                  type="button"
                  className={buttonClass("secondary", "md")}
                  onClick={async () => {
                    const code = test.replace(/\s/g, "");
                    const valid = await Promise.all([-1, 0, 1].map((o) => totpNow(totp, o)));
                    setTestResult(valid.includes(code));
                  }}
                >
                  Prüfen
                </button>
              </div>
              {testResult === true ? <p className="mt-2 text-[0.8125rem] font-medium text-emerald-700">Der Code stimmt. Die App ist richtig eingerichtet.</p> : null}
              {testResult === false ? <p className="mt-2 text-[0.8125rem] font-medium text-red-700">Der Code stimmt nicht. Bitte nochmals scannen.</p> : null}
              <CopyValue name="ADMIN_TOTP_SECRET" value={totp} />
            </div>
          </div>
        ) : null}
      </Step>
    </div>
  );
}
