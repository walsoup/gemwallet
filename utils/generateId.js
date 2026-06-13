function generateId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

module.exports = { generateId };
