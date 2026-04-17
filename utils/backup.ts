import CryptoJS from 'crypto-js';

type BackupEnvelope = {
  version: 1;
  createdAt: number;
  payload: unknown;
};

type EncryptedBackup = {
  cipherText: string;
  iv: string;
  salt: string;
};

const PBKDF2_ITERATIONS = 15000;
const KEY_SIZE = 256 / 32;

function deriveKey(passphrase: string, salt: CryptoJS.lib.WordArray) {
  return CryptoJS.PBKDF2(passphrase, salt, {
    keySize: KEY_SIZE,
    iterations: PBKDF2_ITERATIONS,
  });
}

export function encryptBackup(payload: unknown, passphrase: string): string {
  const envelope: BackupEnvelope = {
    version: 1,
    createdAt: Date.now(),
    payload,
  };

  const salt = CryptoJS.lib.WordArray.random(16);
  const iv = CryptoJS.lib.WordArray.random(16);
  const key = deriveKey(passphrase, salt);
  const cipher = CryptoJS.AES.encrypt(JSON.stringify(envelope), key, { iv });

  const result: EncryptedBackup = {
    cipherText: cipher.toString(),
    iv: iv.toString(CryptoJS.enc.Hex),
    salt: salt.toString(CryptoJS.enc.Hex),
  };

  const wordArray = CryptoJS.enc.Utf8.parse(JSON.stringify(result));
  return CryptoJS.enc.Base64.stringify(wordArray);
}

export function decryptBackup<T>(encoded: string, passphrase: string): T {
  const decodedUtf8 = CryptoJS.enc.Base64.parse(encoded).toString(CryptoJS.enc.Utf8);
  const parsed = JSON.parse(decodedUtf8) as EncryptedBackup;
  if (!parsed?.cipherText || !parsed?.iv || !parsed?.salt) {
    throw new Error('Invalid backup format');
  }

  const salt = CryptoJS.enc.Hex.parse(parsed.salt);
  const iv = CryptoJS.enc.Hex.parse(parsed.iv);
  const key = deriveKey(passphrase, salt);
  const bytes = CryptoJS.AES.decrypt(parsed.cipherText, key, { iv });
  const plaintext = bytes.toString(CryptoJS.enc.Utf8);
  if (!plaintext) throw new Error('Invalid passphrase');

  const envelope = JSON.parse(plaintext) as BackupEnvelope;
  if (envelope.version !== 1) {
    throw new Error('Unsupported backup version');
  }

  return envelope.payload as T;
}
