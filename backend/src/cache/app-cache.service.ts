import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class AppCacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly enabled = process.env.APP_CACHE_ENABLED !== 'false';

  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;

    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): T {
    if (!this.enabled || ttlSeconds <= 0) return value;

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    return value;
  }

  del(key: string) {
    this.store.delete(key);
  }

  delByPrefix(prefix: string) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  async remember<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    const value = await factory();
    return this.set(key, value, ttlSeconds);
  }

  stableHash(value: unknown): string {
    return createHash('sha1')
      .update(this.stableStringify(value))
      .digest('hex')
      .slice(0, 16);
  }

  private stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${this.stableStringify(record[key])}`)
      .join(',')}}`;
  }
}
