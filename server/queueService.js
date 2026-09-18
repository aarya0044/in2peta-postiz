import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

const DEFAULT_DATA = {
  settings: {
    autoApprove: false,
    defaultScheduleDelayHours: 2,
    preferredTone: 'Warm & Engaging',
    instagramHandle: '@in2peta.official',
  },
  queue: [],
};

export class QueueService {
  static init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
    }
  }

  static readData() {
    this.init();
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Error reading data.json, returning default:', err);
      return DEFAULT_DATA;
    }
  }

  static writeData(data) {
    this.init();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  static getSettings() {
    const data = this.readData();
    return data.settings || DEFAULT_DATA.settings;
  }

  static updateSettings(newSettings) {
    const data = this.readData();
    data.settings = { ...data.settings, ...newSettings };
    this.writeData(data);
    return data.settings;
  }

  static getQueue(filterStatus = null) {
    const data = this.readData();
    if (filterStatus) {
      return data.queue.filter((item) => item.status === filterStatus);
    }
    return data.queue;
  }

  static getPostById(id) {
    const data = this.readData();
    return data.queue.find((item) => item.id === id);
  }

  static addToQueue(postItem) {
    const data = this.readData();
    const id = 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();

    const fullText = [
      postItem.hook,
      postItem.caption || postItem.content,
      postItem.callToAction,
      (postItem.hashtags || []).join(' '),
    ]
      .filter(Boolean)
      .join('\n\n');

    const newPost = {
      id,
      topic: postItem.topic || 'Untitled Post',
      hook: postItem.hook || '',
      caption: postItem.caption || postItem.content || '',
      hashtags: postItem.hashtags || [],
      callToAction: postItem.callToAction || '',
      format: postItem.format || 'feed', // 'feed' | 'reel'
      visualPrompt: postItem.visualPrompt || postItem.imagePrompt || '',
      visualKeyword: postItem.visualKeyword || '',
      visualUrl: postItem.visualUrl || null,
      reelStoryboard: postItem.reelStoryboard || null,
      fullPostText: postItem.fullPostText || fullText,
      integrationId: postItem.integrationId,
      integrationName: postItem.integrationName || 'Instagram Account',
      platform: postItem.platform || 'instagram',
      scheduledDate: postItem.scheduledDate || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: postItem.status || 'PENDING_REVIEW',
      postizPostId: postItem.postizPostId || null,
      createdAt: now,
      updatedAt: now,
      reviewNotes: postItem.reviewNotes || '',
    };

    data.queue.unshift(newPost);
    this.writeData(data);
    return newPost;
  }

  static updatePost(id, updates) {
    const data = this.readData();
    const index = data.queue.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const existing = data.queue[index];
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.hook || updates.caption || updates.content || updates.callToAction || updates.hashtags) {
      updated.fullPostText = [
        updated.hook,
        updated.caption || updated.content,
        updated.callToAction,
        (updated.hashtags || []).join(' '),
      ]
        .filter(Boolean)
        .join('\n\n');
    }

    data.queue[index] = updated;
    this.writeData(data);
    return updated;
  }

  static deletePost(id) {
    const data = this.readData();
    data.queue = data.queue.filter((p) => p.id !== id);
    this.writeData(data);
    return true;
  }
}
