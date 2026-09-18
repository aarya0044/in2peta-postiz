import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CLOUDFLARED_PATH = path.join(PROJECT_ROOT, 'cloudflared.exe');

export class TunnelService {
  static cachedHostname = null;
  static lastChecked = 0;
  static childProcess = null;

  /**
   * Get the current live Cloudflare Quick Tunnel public URL
   */
  static async getTunnelUrl() {
    // Check cache (refresh every 30 seconds)
    if (this.cachedHostname && Date.now() - this.lastChecked < 30000) {
      return `https://${this.cachedHostname}`;
    }

    // 1. Try querying the active metrics/quicktunnel endpoint
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const res = await fetch('http://127.0.0.1:20241/quicktunnel', { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data?.hostname) {
          this.cachedHostname = data.hostname;
          this.lastChecked = Date.now();
          return `https://${this.cachedHostname}`;
        }
      }
    } catch {
      // Tunnel not answering on metrics port yet
    }

    // 2. Try starting cloudflared if available and not yet started
    if (fs.existsSync(CLOUDFLARED_PATH) && !this.childProcess) {
      try {
        console.log('🚀 Launching Cloudflare Tunnel for Postiz media delivery...');
        this.childProcess = spawn(CLOUDFLARED_PATH, ['tunnel', '--url', 'http://localhost:4007'], {
          detached: true,
          stdio: 'ignore',
        });
        this.childProcess.unref();

        // Wait briefly for quicktunnel to initialize
        for (let i = 0; i < 6; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const res = await fetch('http://127.0.0.1:20241/quicktunnel');
            if (res.ok) {
              const data = await res.json();
              if (data?.hostname) {
                this.cachedHostname = data.hostname;
                this.lastChecked = Date.now();
                console.log(`✅ Cloudflare Tunnel live: https://${this.cachedHostname}`);
                return `https://${this.cachedHostname}`;
              }
            }
          } catch {}
        }
      } catch (err) {
        console.error('Could not auto-start cloudflared:', err.message);
      }
    }

    return this.cachedHostname ? `https://${this.cachedHostname}` : null;
  }

  /**
   * Convert any localhost or relative uploads path into a public HTTPS tunnel URL
   */
  static async toPublicMediaUrl(mediaUrl) {
    if (!mediaUrl) return null;

    const tunnelBase = await this.getTunnelUrl();

    // If it's a relative uploads path
    if (mediaUrl.startsWith('/uploads/')) {
      return tunnelBase ? `${tunnelBase}${mediaUrl}` : mediaUrl;
    }

    // If it's a localhost:4007 or localhost:3005 URL
    if (mediaUrl.includes('localhost:4007') || mediaUrl.includes('127.0.0.1:4007')) {
      if (tunnelBase) {
        return mediaUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1):4007/, tunnelBase);
      }
    }

    // If it's already a public HTTPS URL, return as is
    return mediaUrl;
  }
}
