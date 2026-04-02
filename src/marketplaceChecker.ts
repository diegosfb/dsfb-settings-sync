import * as https from 'https';
import * as http from 'http';
import { Platform } from './platformDetector';

export interface ExtensionUpdateInfo {
    id: string;
    currentVersion: string;
    latestVersion: string;
    vsixUrl?: string;
    marketplaceDomain: string;
}

export type ExtensionAvailability = 'available' | 'unavailable' | 'unknown';

const BATCH_SIZE = 20;
const VS_MARKETPLACE_TIMEOUT_MS = 3000;

export async function checkOpenVSX(ids: string[]): Promise<Map<string, ExtensionAvailability>> {
    const result = new Map<string, ExtensionAvailability>();
    const normalized = normalizeIds(ids);

    for (const batch of chunk(normalized, BATCH_SIZE)) {
        const settled = await Promise.allSettled(batch.map(id => checkOneOpenVSX(id)));
        for (let i = 0; i < batch.length; i++) {
            const id = batch[i];
            const status = settled[i];
            if (status.status === 'fulfilled') {
                result.set(id, status.value);
            } else {
                result.set(id, 'unknown');
            }
        }
    }

    return result;
}

export async function checkVSCodeMarketplace(ids: string[]): Promise<Map<string, ExtensionAvailability>> {
    const result = new Map<string, ExtensionAvailability>();
    const normalized = normalizeIds(ids);

    for (const batch of chunk(normalized, BATCH_SIZE)) {
        const settled = await Promise.allSettled(batch.map(id => checkOneVSCodeMarketplace(id)));
        for (let i = 0; i < batch.length; i++) {
            const id = batch[i];
            const status = settled[i];
            if (status.status === 'fulfilled') {
                result.set(id, status.value);
            } else {
                result.set(id, 'unknown');
            }
        }
    }

    return result;
}

export async function checkMarketplaceForPlatform(
    ids: string[],
    platform: Platform,
    customMarketplaceUrl?: string
): Promise<Map<string, ExtensionAvailability>> {
    let result: Map<string, ExtensionAvailability>;

    if (platform === 'antigravity') {
        result = await checkOpenVSX(ids);
    } else if (platform === 'vscode') {
        result = await checkVSCodeMarketplace(ids);
    } else {
        result = new Map<string, ExtensionAvailability>();
        for (const id of normalizeIds(ids)) {
            result.set(id, 'unknown');
        }
    }

    // Retry unknowns with custom marketplace fallback
    if (customMarketplaceUrl && customMarketplaceUrl.trim()) {
        const unknownIds = [...result.entries()]
            .filter(([, v]) => v === 'unknown')
            .map(([id]) => id);

        if (unknownIds.length > 0) {
            const customResult = await checkCustomMarketplace(unknownIds, customMarketplaceUrl.trim());
            for (const [id, status] of customResult) {
                if (status !== 'unknown') {
                    result.set(id, status);
                }
            }
        }
    }

    return result;
}

export async function checkCustomMarketplace(ids: string[], baseUrl: string): Promise<Map<string, ExtensionAvailability>> {
    const result = new Map<string, ExtensionAvailability>();
    const normalized = normalizeIds(ids);
    const cleanBase = baseUrl.replace(/\/$/, '');

    for (const batch of chunk(normalized, BATCH_SIZE)) {
        const settled = await Promise.allSettled(batch.map(id => checkOneCustomMarketplace(id, cleanBase)));
        for (let i = 0; i < batch.length; i++) {
            const id = batch[i];
            const status = settled[i];
            result.set(id, status.status === 'fulfilled' ? status.value : 'unknown');
        }
    }
    return result;
}

async function checkOneCustomMarketplace(id: string, baseUrl: string): Promise<ExtensionAvailability> {
    const parts = id.split('.');
    if (parts.length < 2) {
        return 'unknown';
    }

    const namespace = encodeURIComponent(parts[0]);
    const extensionName = encodeURIComponent(parts.slice(1).join('.'));
    const urlPath = `/api/${namespace}/${extensionName}`;

    try {
        const parsed = new URL(baseUrl);
        if (!parsed.hostname || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
            return 'unknown';
        }

        const res = await request({
            hostname: parsed.hostname,
            port: (parsed.port && !isNaN(parseInt(parsed.port, 10))) ? parseInt(parsed.port, 10) : undefined,
            method: 'GET',
            path: parsed.pathname.replace(/\/$/, '') + urlPath,
            headers: {
                'User-Agent': 'Solobois-Settings-Sync',
                'Accept': 'application/json'
            }
        });

        if (res.statusCode === 200) { return 'available'; }
        if (res.statusCode === 404) { return 'unavailable'; }
        return 'unknown';
    } catch (err: any) {
        console.warn(`Soloboi's Settings Sync: Custom marketplace check failed for ${id}:`, err?.message || err);
        return 'unknown';
    }
}

function normalizeIds(ids: string[]): string[] {
    const seen = new Set<string>();
    const normalized: string[] = [];

    for (const raw of ids) {
        const id = (raw || '').trim().toLowerCase();
        if (!id || seen.has(id)) {
            continue;
        }
        seen.add(id);
        normalized.push(id);
    }

    return normalized;
}

function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

async function checkOneOpenVSX(id: string): Promise<ExtensionAvailability> {
    const parts = id.split('.');
    if (parts.length < 2) {
        return 'unknown';
    }

    const namespace = encodeURIComponent(parts[0]);
    const extensionName = encodeURIComponent(parts.slice(1).join('.'));
    const path = `/api/${namespace}/${extensionName}`;

    try {
        const res = await request({
            hostname: 'open-vsx.org',
            method: 'GET',
            path,
            headers: {
                'User-Agent': 'Solobois-Settings-Sync',
                'Accept': 'application/json'
            }
        });

        if (res.statusCode === 200) {
            return 'available';
        }
        if (res.statusCode === 404) {
            return 'unavailable';
        }
        return 'unknown';
    } catch {
        return 'unknown';
    }
}

async function checkOneVSCodeMarketplace(id: string): Promise<ExtensionAvailability> {
    const body = JSON.stringify({
        filters: [
            {
                criteria: [
                    { filterType: 7, value: id }
                ],
                pageNumber: 1,
                pageSize: 1,
                sortBy: 0,
                sortOrder: 0
            }
        ],
        assetTypes: [],
        flags: 0
    });

    try {
        const res = await request({
            hostname: 'marketplace.visualstudio.com',
            method: 'POST',
            path: '/_apis/public/gallery/extensionquery',
            headers: {
                'User-Agent': 'Solobois-Settings-Sync',
                'Accept': 'application/json;api-version=3.0-preview.1',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body).toString()
            }
        }, body, VS_MARKETPLACE_TIMEOUT_MS);

        if (!res.body) {
            return 'unknown';
        }

        const parsed = JSON.parse(res.body);
        const count = parsed?.results?.[0]?.extensions?.length ?? 0;
        return count > 0 ? 'available' : 'unavailable';
    } catch {
        return 'unknown';
    }
}

function request(
    options: https.RequestOptions,
    body?: string,
    timeoutMs?: number
): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
        const useHttp = (options as any).__useHttp === true;
        const transport = useHttp ? http : https;
        const req = (transport as typeof https).request(options, res => {
            let data = '';
            res.on('data', chunk => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode || 0,
                    body: data
                });
            });
        });

        req.on('error', reject);

        if (timeoutMs && timeoutMs > 0) {
            req.setTimeout(timeoutMs, () => {
                req.destroy(new Error(`Request timeout after ${timeoutMs}ms`));
            });
        }

        if (body) {
            req.write(body);
        }
        req.end();
    });
}

// ── Update Checker ──────────────────────────────────────────────────────────

/**
 * Fetches available versions for an extension from an OpenVSX-compatible marketplace.
 * Returns versions sorted newest-first, or empty array on failure.
 */
export async function fetchVersionList(id: string, baseUrl: string): Promise<string[]> {
    const parts = id.split('.');
    if (parts.length < 2) { return []; }

    const namespace = encodeURIComponent(parts[0]);
    const extensionName = encodeURIComponent(parts.slice(1).join('.'));

    try {
        const parsed = new URL(baseUrl.replace(/\/$/, ''));
        if (!parsed.hostname || (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) {
            return [];
        }

        const opts: https.RequestOptions & { __useHttp?: boolean } = {
            hostname: parsed.hostname,
            port: (parsed.port && !isNaN(parseInt(parsed.port, 10))) ? parseInt(parsed.port, 10) : undefined,
            method: 'GET',
            path: `${parsed.pathname.replace(/\/$/, '')}/api/${namespace}/${extensionName}/versions`,
            headers: {
                'User-Agent': 'Solobois-Settings-Sync',
                'Accept': 'application/json'
            },
            __useHttp: parsed.protocol === 'http:'
        };

        const res = await request(opts);
        if (res.statusCode !== 200 || !res.body) { return []; }

        const data = JSON.parse(res.body);
        // OpenVSX returns { versions: { "1.2.3": { ... }, ... } }
        const versions = data?.versions ? Object.keys(data.versions) : [];
        return versions.sort((a, b) => compareSemver(b, a));
    } catch {
        return [];
    }
}

/**
 * Checks installed extensions against all registered custom marketplaces and
 * returns a list of extensions that have a newer version available.
 */
export async function checkCustomMarketplaceUpdates(
    installedExtensions: { id: string; version: string }[],
    marketplaceUrls: string[]
): Promise<ExtensionUpdateInfo[]> {
    if (!installedExtensions.length || !marketplaceUrls.length) {
        return [];
    }

    const updates: ExtensionUpdateInfo[] = [];

    for (const baseUrl of marketplaceUrls) {
        let domain = '';
        try { domain = new URL(baseUrl).hostname; } catch { continue; }

        const normalized = normalizeIds(installedExtensions.map(e => e.id));

        for (const batch of chunk(normalized, BATCH_SIZE)) {
            const settled = await Promise.allSettled(
                batch.map(async id => {
                    const versions = await fetchVersionList(id, baseUrl);
                    if (!versions.length) { return null; }

                    const latestVersion = versions[0];
                    const installed = installedExtensions.find(
                        e => e.id.toLowerCase() === id
                    );
                    if (!installed) { return null; }

                    if (compareSemver(latestVersion, installed.version) > 0) {
                        return {
                            id: installed.id,
                            currentVersion: installed.version,
                            latestVersion,
                            marketplaceDomain: domain,
                        } satisfies ExtensionUpdateInfo;
                    }
                    return null;
                })
            );

            for (const s of settled) {
                if (s.status === 'fulfilled' && s.value !== null) {
                    // avoid duplicate updates (first marketplace wins)
                    if (!updates.some(u => u.id.toLowerCase() === s.value!.id.toLowerCase())) {
                        updates.push(s.value!);
                    }
                }
            }
        }
    }

    return updates;
}

/** Simple semver comparator. Returns positive if a > b, negative if a < b, 0 if equal. */
function compareSemver(a: string, b: string): number {
    const parse = (v: string) => v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
    const [aMaj, aMin, aPatch] = parse(a);
    const [bMaj, bMin, bPatch] = parse(b);
    return (aMaj - bMaj) || (aMin - bMin) || (aPatch - bPatch);
}
