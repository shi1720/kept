import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijkmnopqrstuvwxyz";
const short = customAlphabet(alphabet, 12);
const long = customAlphabet(alphabet + "ABCDEFGHJKLMNPQRSTUVWXYZ", 32);

export type IdPrefix =
  | "job"
  | "usr"
  | "atk"
  | "key"
  | "pct"
  | "mst"
  | "crt"
  | "sub"
  | "art"
  | "vrd"
  | "dsp"
  | "pay"
  | "pyo"
  | "rfd"
  | "txn"
  | "led"
  | "evt"
  | "whk"
  | "ntf";

/** Stripe-style prefixed identifiers make logs and support tickets readable. */
export const newId = (prefix: IdPrefix) => `${prefix}_${short()}`;

export const newToken = () => long();
