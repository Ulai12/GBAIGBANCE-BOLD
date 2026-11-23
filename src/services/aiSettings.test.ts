import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import {
  getUserGeminiApiKey,
  removeUserGeminiApiKey,
  setUserGeminiApiKey,
} from './aiSettings.ts';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const storedValues = new Map<string, string>();

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => storedValues.get(key) ?? null,
      setItem: (key: string, value: string) => storedValues.set(key, value),
      removeItem: (key: string) => storedValues.delete(key),
    },
  },
});

after(() => {
  if (originalWindow) {
    Object.defineProperty(globalThis, 'window', originalWindow);
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
});

describe('Gemini personal API key storage', () => {
  it('stores a trimmed key locally and removes it when cleared', () => {
    setUserGeminiApiKey('  test-gemini-key  ');
    assert.equal(getUserGeminiApiKey(), 'test-gemini-key');

    setUserGeminiApiKey(' ');
    assert.equal(getUserGeminiApiKey(), '');
  });

  it('can explicitly remove the locally stored key', () => {
    setUserGeminiApiKey('test-gemini-key');
    removeUserGeminiApiKey();
    assert.equal(getUserGeminiApiKey(), '');
  });
});
