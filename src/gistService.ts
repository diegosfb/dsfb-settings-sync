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

/**
 * GitHub Gist API service — create, read, and update Gists.
 * Uses Node.js https module (no external dependencies).
 */
export class GistService {
  /**
   * Fetch all Gists for the authenticated user.
   */
  async getUserGists(token: string): Promise<any[]> {
    return this.request("GET", "/gists", token);
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
   * Update an existing Gist (PATCH — does NOT create a new one).
   */
  async updateGist(
    gistId: string,
    files: Record<string, { content: string }>,
    token: string,
    description?: string,
  ): Promise<GistData> {
    const body: any = { files };
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
  private request(
    method: string,
    apiPath: string,
    token: string,
    body?: string,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: "api.github.com",
        path: apiPath,
        method,
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
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
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
            reject(new Error(msg));
          }
        });
      });

      req.on("error", (e) => reject(e));

      if (body) {
        req.write(body);
      }
      req.end();
    });
  }
}
