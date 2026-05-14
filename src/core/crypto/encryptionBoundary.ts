export type EncryptedPayload = {
  cipherText: string;
  iv: string;
  keyId: string;
};

export interface FieldEncryptionBoundary {
  encrypt(plainText: string): Promise<EncryptedPayload>;
  decrypt(payload: EncryptedPayload): Promise<string>;
}

export async function assertEncryptedSyncPreconditions(): Promise<void> {
  return;
}
