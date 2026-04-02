import * as https from "https";

export interface GistFile {
  filename: string;
  content: string;
}

export interface GistData {
  id: string;
  description: string;
  updated_at: string;
  files: Record<string, { filename: string; content: string }>;
}

type RequestError = Error & {
  statusCode?: number;
  code?: string;
  retryAfterMs?: number;
};

/**
 * GitHub Gist API service ??create, read, and update Gists.
 * Uses Node.js https module (no external dependencies).
 */
export class GistService {
  private readonly REQUEST_TIMEOUT_MS = 15000;
  private readonly MAX_RETRIES = 2;
  private readonly GISTS_PER_PAGE = 100;
  private readonly MAX_GIST_PAGES = 5;

  /**
   * Fetch all Gists for the authenticated user.
   */
  async getUserGists(token: string): Promise<any[]> {
    const gists: any[] = [];

    for (let page = 1; page <= this.MAX_GIST_PAGES; page++) {
      const pageResults = await this.request(
        "GET",
        `/gists?per_page=${this.GISTS_PER_PAGE}&page=${page}`,
        token,
      );

      if (!Array.isArray(pageResults) || pageResults.length === 0) {
        break;
      }

      gists.push(...pageResults);
      if (pageResults.length < this.GISTS_PER_PAGE) {
        break;
      }
    }

    return gists;
  }

  /**
   * Fetch a Gist by ID.
   */
  async getGist(gistId: string, token: string): Promise<GistData> {
    return this.request("GET", `/gists/${gistId}`, token);
  }

  /**
   * Fetch Gist revision history.
   */
  async getGistHistory(gistId: string, token: string): Promise<any[]> {
    const gist = await this.request("GET", `/gists/${gistId}`, token);
    return gist.history || [];
  }

  /**
   * Fetch a specific revision of a Gist.
   */
  async getGistRevision(
    gistId: string,
    sha: string,
    token: string,
  ): Promise<GistData> {
    return this.request("GET", `/gists/${gistId}/${sha}`, token);
  }

  /**
   * Create a new Gist (Private by default, or Public).
   * Returns the created Gist data (including the new ID).
   */
  async createGist(
    description: string,
    files: Record<string, { content: string }>,
    token: string,
    isPublic: boolean = false,
  ): Promise<GistData> {
    const body = {
      description,
      public: isPublic,
      files,
    };
    return this.request("POST", "/gists", token, JSON.stringify(body));
  }

  /**
   * Update an existing Gist (PATCH ??does NOT create a new one).
   */
  async updateGist(
    gistId: string,
    files: Record<string, { content: string }>,
    token: string,
    description?: string,
    filesToDelete: string[] = [],
  ): Promise<GistData> {
    const requestFiles: Record<string, { content: string } | null> = { ...files };
    for (const filename of filesToDelete) {
      requestFiles[filename] = null;
    }

    const body: any = { files: requestFiles };
    if (description) {
      body.description = description;
    }
    return this.request(
      "PATCH",
      `/gists/${gistId}`,
      token,
      JSON.stringify(body),
    );
  }

  /**
   * Core HTTPS request helper.
   */
  private async request(
    method: string,
    apiPath: string,
    token: string,
    body?: string,
  ): Promise<any> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.requestOnce(method, apiPath, token, body);
      } catch (error) {
        const requestError = error as RequestError;
        const statusCode = requestError.statusCode;
        if (!this.shouldRetry(requestError, statusCode) || attempt >= this.MAX_RETRIES) {
          throw error;
        }

        await this.delay(this.getRetryDelayMs(requestError, attempt));
      }
    }
  }

  private requestOnce(
    method: string,
    apiPath: string,
    token: string,
    body?: string,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);
      const options: https.RequestOptions = {
        hostname: "api.github.com",
        path: apiPath,
        method,
        signal: controller.signal,
        headers: {
          "User-Agent": "Solobois-Settings-Sync",
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
      };

      if (body) {
        (options.headers as any)["Content-Length"] =
          Buffer.byteLength(body).toString();
      }

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          clearTimeout(timeout);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            if (!data) {
              resolve(null);
              return;
            }
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error("Failed to parse GitHub API response"));
            }
          } else {
            let msg = `GitHub API error ${res.statusCode}`;
            try {
              const parsed = JSON.parse(data);
              if (parsed.message) {
                msg += `: ${parsed.message}`;
              }
            } catch {
              /* ignore parse error */
            }
            const error = new Error(msg) as RequestError;
            error.statusCode = res.statusCode;
            const retryAfterMs = this.parseRetryAfterMs(res.headers["retry-after"]);
            if (retryAfterMs !== undefined) {
              error.retryAfterMs = retryAfterMs;
            }
            reject(error);
          }
        });
      });

      req.on("error", (e: NodeJS.ErrnoException) => {
        clearTimeout(timeout);
        if (e.name === "AbortError") {
          const timeoutError = new Error(
            `GitHub API request timed out after ${this.REQUEST_TIMEOUT_MS}ms`,
          ) as RequestError;
          timeoutError.name = "AbortError";
          reject(timeoutError);
          return;
        }

        reject(e as RequestError);
      });

      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  private shouldRetry(error: RequestError, statusCode?: number): boolean {
    if (error.name === "AbortError") {
      return true;
    }

    if (error.code && ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"].includes(error.code)) {
      return true;
    }

    if (statusCode === 429) {
      return true;
    }

    if (statusCode === 403 && error.retryAfterMs !== undefined) {
      return true;
    }

    return statusCode !== undefined && statusCode >= 500;
  }

  private getRetryDelayMs(error: RequestError, attempt: number): number {
    return error.retryAfterMs ?? 1000 * Math.pow(2, attempt);
  }

  private parseRetryAfterMs(retryAfterHeader: string | string[] | undefined): number | undefined {
    const rawValue = Array.isArray(retryAfterHeader) ? retryAfterHeader[0] : retryAfterHeader;
    if (!rawValue) {
      return undefined;
    }

    const seconds = Number(rawValue);
    if (Number.isFinite(seconds)) {
      return Math.max(0, seconds * 1000);
    }

    const timestamp = Date.parse(rawValue);
    if (Number.isNaN(timestamp)) {
      return undefined;
    }

    return Math.max(0, timestamp - Date.now());
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}


