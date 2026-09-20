import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const TUNNEL_FILE = path.join(DATA_DIR, 'tunnel.txt');
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CLOUDFLARED_PATH = path.join(PROJECT_ROOT, 'cloudflared.exe');

export class TunnelService {
  static cachedHostname = null;
  static lastChecked = 0;
  static childProcess = null;

  /**
   * Read persisted tunnel URL from disk if available
   */
  static getPersistedUrl() {
    try {
      if (fs.existsSync(TUNNEL_FILE)) {
        const url = fs.readFileSync(TUNNEL_FILE, 'utf-8').trim();
        if (url.startsWith('https://') && url.includes('.trycloudflare.com')) {
          return url;
        }
      }
    } catch {}
    return null;
  }

  /**
   * Save tunnel URL to disk
   */
  static savePersistedUrl(url) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(TUNNEL_FILE, url, 'utf-8');
    } catch (err) {
      console.warn('Could not persist tunnel URL:', err.message);
    }
  }

  static kill() {
    if (this.childProcess) {
      try {
        if (process.platform === 'win32' && this.childProcess.pid) {
          spawn('taskkill', ['/pid', this.childProcess.pid.toString(), '/f', '/t']);
        } else {
          this.childProcess.kill();
        }
      } catch {}
      this.childProcess = null;
    }
    this.cachedHostname = null;
    try {
      if (fs.existsSync(TUNNEL_FILE)) {
        fs.unlinkSync(TUNNEL_FILE);
      }
    } catch {}
  }

  /**
   * Get the current live Cloudflare Quick Tunnel public URL
   */
  static async getTunnelUrl() {
    // 1. If child process is running and hostname is cached, return it
    if (this.childProcess && this.cachedHostname && Date.now() - this.lastChecked < 60000) {
      return `https://${this.cachedHostname}`;
    }

    // 2. If cloudflared binary exists and process isn't spawned yet, spawn it and listen to stderr
    if (fs.existsSync(CLOUDFLARED_PATH) && !this.childProcess) {
      try {
        console.log('🚀 Starting Cloudflare Tunnel for Postiz media publishing...');
        this.childProcess = spawn(CLOUDFLARED_PATH, ['tunnel', '--url', 'http://localhost:4007'], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        const handleOutput = (chunk) => {
          const text = chunk.toString();
          if (text.includes('Unauthorized: Tunnel not found')) {
            console.warn('⚠️ Cloudflare quick tunnel expired. Refreshing tunnel...');
            this.kill();
            return;
          }
          const match = text.match(/https:\/\/([a-zA-Z0-9-]+\.trycloudflare\.com)/);
          if (match && match[1]) {
            this.cachedHostname = match[1];
            this.lastChecked = Date.now();
            const fullUrl = `https://${this.cachedHostname}`;
            this.savePersistedUrl(fullUrl);
            console.log(`✅ Cloudflare Tunnel ready: ${fullUrl}`);
          }
        };

        this.childProcess.stdout.on('data', handleOutput);
        this.childProcess.stderr.on('data', handleOutput);

        this.childProcess.on('error', (err) => {
          console.error('Cloudflared process error:', err.message);
          this.childProcess = null;
        });

        this.childProcess.on('exit', () => {
          this.childProcess = null;
        });

        // Wait up to 10 seconds for initial URL detection
        for (let i = 0; i < 10; i++) {
          if (this.cachedHostname) break;
          await new Promise((r) => setTimeout(r, 1000));
        }
      } catch (err) {
        console.error('Failed to spawn Cloudflare Tunnel:', err.message);
      }
    }

    if (this.cachedHostname) {
      return `https://${this.cachedHostname}`;
    }

    // Fallback to persisted URL
    return this.getPersistedUrl();
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
    if (mediaUrl.includes('localhost:3005') || mediaUrl.includes('127.0.0.1:3005')) {
      if (tunnelBase) {
        return mediaUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1):3005/, tunnelBase);
      }
    }

    // If it's already an existing tunnel URL or public HTTPS URL, return as is
    return mediaUrl;
  }
}

