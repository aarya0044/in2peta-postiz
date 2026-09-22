import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  ExternalLink,
  Send,
  RefreshCw,
  Layers,
  Calendar,
  Image as ImageIcon,
  Info,
  Check,
  Globe,
  Film,
  ArrowRight,
  HelpCircle,
  Heart,
  MessageCircle,
  Bookmark,
  MoreHorizontal,
  Upload,
  Link as LinkIcon,
  Play,
  Share2,
} from 'lucide-react';

const INSTA_GRADIENT = 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600';
const IN2PETA_EXPLORE_URL = 'https://www.in2peta.com/explore';

// Pre-curated inspiration topics for instant captions
const INSPIRATION_CHIPS = [
  'HVAC Summer Tune-Up 20% Off',
  '3 Signs Your AC Needs Urgent Service',
  'Energy-Saving Tips to Lower Electric Bills',
  'Behind the Scenes: A Day with Our Technicians',
  'Customer Spotlight: Total AC Transformation',
];

// Sample showcase visuals generated from in2peta AI
const SAMPLE_IN2PETA_MEDIA = [
  {
    name: 'HVAC Technician',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1080&auto=format&fit=crop&q=80',
  },
  {
    name: 'Modern Home Living',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1080&auto=format&fit=crop&q=80',
  },
  {
    name: 'AC Unit Repair',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1080&auto=format&fit=crop&q=80',
  },
];

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState('studio'); // 'studio' | 'queue' | 'history'
  const [showBeginnerGuide, setShowBeginnerGuide] = useState(true);

  // Channels & Account
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [customHandleInput, setCustomHandleInput] = useState('');

  // Settings & Queue
  const [settings, setSettings] = useState({ autoApprove: false });
  const [queueData, setQueueData] = useState({ counts: {}, queue: [] });
  const [publishedPosts, setPublishedPosts] = useState([]);
  const [healthInfo, setHealthInfo] = useState(null);

  // STEP 1: in2peta Media
  const [attachedMediaUrl, setAttachedMediaUrl] = useState(SAMPLE_IN2PETA_MEDIA[0].url);
  const [attachedMediaId, setAttachedMediaId] = useState(null);
  const [attachedMediaType, setAttachedMediaType] = useState('image'); // 'image' | 'video'
  const [mediaSourceType, setMediaSourceType] = useState('sample'); // 'sample' | 'url' | 'upload'
  const [pastedUrlInput, setPastedUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // STEP 2: AI Caption Generator
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Warm & Engaging');
  const [callToAction, setCallToAction] = useState('Drop a comment below or tap the link in bio!');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState(null);
  const [editHook, setEditHook] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editHashtags, setEditHashtags] = useState('');

  // Aspect ratio
  const [aspectRatio, setAspectRatio] = useState('portrait'); // 'square' | 'portrait' | 'reel'
  const [expandedCaption, setExpandedCaption] = useState(false);

  // Queue & Modals
  const [queueFilter, setQueueFilter] = useState('ALL');
  const [editingPost, setEditingPost] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initial Data Fetch
  const fetchData = async () => {
    try {
      const [settingsRes, channelsRes, queueRes, pubRes, healthRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/channels'),
        fetch('/api/queue'),
        fetch('/api/published'),
        fetch('/api/health'),
      ]);

      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (channelsRes.ok) {
        const ch = await channelsRes.json();
        setChannels(ch);
        if (ch.length > 0 && !activeChannel) setActiveChannel(ch[0]);
      }
      if (queueRes.ok) setQueueData(await queueRes.json());
      if (pubRes.ok) setPublishedPosts(await pubRes.json());
      if (healthRes.ok) setHealthInfo(await healthRes.json());
    } catch (err) {
      console.error('Data fetch error:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Toggle Auto-Approval
  const handleToggleAutoApprove = async () => {
    const nextVal = !settings.autoApprove;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoApprove: nextVal }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        showToast(
          nextVal
            ? '⚡ Auto-Publish ACTIVE: Posts will schedule directly via Postiz!'
            : '🛡️ Review Mode ACTIVE: Posts will wait in the approval queue.',
          'info'
        );
      }
    } catch {
      showToast('Could not update auto-publish setting', 'error');
    }
  };

  // Handle File Upload from computer (in2peta generated image/video or gallery)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine type
    const isVideo = file.type.startsWith('video/');
    setAttachedMediaType(isVideo ? 'video' : 'image');

    // Immediate local object preview for user responsiveness
    const localUrl = URL.createObjectURL(file);
    setAttachedMediaUrl(localUrl);
    setMediaSourceType('upload');

    // Upload to server & S3
    const formData = new FormData();
    formData.append('media', file);

    setIsUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setAttachedMediaUrl(data.url);
        setAttachedMediaId(data.postizMediaId || null);
        showToast(`☁️ Attached ${isVideo ? 'video' : 'image'} (Stored in S3)!`, 'success');
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'Upload failed. Please try again.', 'error');
        setAttachedMediaUrl(SAMPLE_IN2PETA_MEDIA[0].url);
      }
    } catch {
      showToast('Media upload failed. Please try again.', 'error');
      setAttachedMediaUrl(SAMPLE_IN2PETA_MEDIA[0].url);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Pasting in2peta URL
  const handlePasteUrlSubmit = (e) => {
    e.preventDefault();
    if (!pastedUrlInput.trim()) return;

    const isVideo =
      pastedUrlInput.endsWith('.mp4') ||
      pastedUrlInput.endsWith('.webm') ||
      pastedUrlInput.endsWith('.mov') ||
      pastedUrlInput.includes('video');

    setAttachedMediaUrl(pastedUrlInput.trim());
    setAttachedMediaId(null);
    setAttachedMediaType(isVideo ? 'video' : 'image');
    setMediaSourceType('url');
    showToast('Media URL linked to Instagram preview!', 'success');
  };

  // Generate Post Caption with AI
  const handleGenerateCaption = async (overrideTopic) => {
    const activeTopic = overrideTopic || topic;
    if (!activeTopic.trim()) {
      showToast('Please enter a topic or click one of the idea chips.', 'error');
      return;
    }

    if (isUploading) {
      showToast('Please wait, media is currently uploading to AWS S3...', 'info');
      return;
    }

    if (attachedMediaUrl && attachedMediaUrl.startsWith('blob:')) {
      showToast('Media is still uploading to cloud storage. Please wait a moment...', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: activeTopic,
          tone,
          callToAction,
          mediaUrl: attachedMediaUrl,
          mediaId: attachedMediaId,
          postizMediaId: attachedMediaId,
          mediaType: attachedMediaType,
          scheduledDate: new Date(scheduledDate).toISOString(),
          integrationId: activeChannel?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      const g = data.generated;
      setGeneratedDraft(data);
      setEditHook(g.hook || '');
      setEditCaption(g.caption || '');
      setEditHashtags((g.hashtags || []).join(' '));

      fetchData();

      if (data.autoApproved) {
        showToast('⚡ Caption generated & automatically scheduled in Postiz!', 'success');
      } else {
        showToast('✨ Caption crafted! Check the Instagram preview below.', 'success');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Approve Post
  const handleApprove = async (postId) => {
    setActionLoading(postId);
    try {
      const res = await fetch(`/api/queue/${postId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');

      showToast('🎉 Approved! Post is scheduled in Postiz for Instagram.', 'success');
      await fetchData();
      setActiveTab('queue');
      setQueueFilter('ALL');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Reject Post
  const handleReject = async (postId) => {
    setActionLoading(postId);
    try {
      await fetch(`/api/queue/${postId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Archived by user' }),
      });
      showToast('Post archived', 'info');
      fetchData();
    } catch {
      showToast('Failed to reject post', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Post
  const handleDelete = async (postId) => {
    if (!confirm('Remove this post from your queue?')) return;
    try {
      await fetch(`/api/queue/${postId}`, { method: 'DELETE' });
      showToast('Post deleted', 'info');
      fetchData();
    } catch {
      showToast('Could not delete', 'error');
    }
  };

  // Save manual edits
  const handleSaveEdit = async () => {
    if (!editingPost) return;
    try {
      const fullText = [
        editingPost.hook,
        editingPost.caption,
        editingPost.callToAction,
        Array.isArray(editingPost.hashtags) ? editingPost.hashtags.join(' ') : editingPost.hashtags,
      ]
        .filter(Boolean)
        .join('\n\n');

      const res = await fetch(`/api/queue/${editingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hook: editingPost.hook,
          caption: editingPost.caption,
          callToAction: editingPost.callToAction,
          hashtags: typeof editingPost.hashtags === 'string' ? editingPost.hashtags.split(' ') : editingPost.hashtags,
          scheduledDate: editingPost.scheduledDate,
          fullPostText: fullText,
        }),
      });

      if (res.ok) {
        showToast('Changes saved', 'success');
        setEditingPost(null);
        fetchData();
      }
    } catch {
      showToast('Failed to save changes', 'error');
    }
  };

  // Connect Instagram Handle
  const handleConnectInstagram = (e) => {
    e.preventDefault();
    if (!customHandleInput.trim()) return;
    const formatted = customHandleInput.startsWith('@') ? customHandleInput : `@${customHandleInput}`;
    const newChan = {
      id: 'ig_' + Date.now(),
      name: formatted.replace('@', ''),
      handle: formatted,
      platform: 'instagram',
      followers: '15.8K',
      postsCount: 142,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      connected: true,
    };
    setActiveChannel(newChan);
    setShowConnectModal(false);
    showToast(`Connected Instagram account ${formatted}!`, 'success');
  };

  const pendingCount = queueData.counts?.pending || 0;

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col font-sans antialiased selection:bg-rose-500/30 selection:text-rose-200">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all animate-in fade-in slide-in-from-bottom-5 ${
            toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-800/60'
              : toast.type === 'info'
              ? 'bg-indigo-950/90 text-indigo-200 border-indigo-800/60'
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-800/60'
          }`}
        >
          {toast.type === 'error' ? (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : toast.type === 'info' ? (
            <Info className="w-5 h-5 text-indigo-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/5 bg-[#0d0f17]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo & Platform Roles */}
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-2xl ${INSTA_GRADIENT} p-[2px] shadow-lg shadow-rose-500/20`}>
              <div className="w-full h-full bg-[#0d0f17] rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-rose-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight text-white">in2peta Social Studio</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Instagram Hub
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>Media by <strong>in2peta</strong></span>
                <span>·</span>
                <span>Smart AI Captions</span>
                <span>·</span>
                <span>Publishing by <strong>Postiz</strong></span>
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* S3 Storage Status Badge */}
            {healthInfo?.s3Storage && (
              <div
                className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  healthInfo.s3Storage.connected
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
                title={
                  healthInfo.s3Storage.connected
                    ? `AWS S3 Bucket: in2peta-postiz-media (Role: PostizMediaUploadRole active)`
                    : `AWS S3 Standby (${healthInfo.s3Storage.error || 'Needs [default] profile'}). Cloudflare Bridge active.`
                }
              >
                <span className={`w-2 h-2 rounded-full ${healthInfo.s3Storage.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span>{healthInfo.s3Storage.connected ? 'S3 Bucket Active' : 'S3 Ready (Bridge Mode)'}</span>
              </div>
            )}

            {/* Quick in2peta Explore Button */}
            <a
              href={IN2PETA_EXPLORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-lime-500/20 to-emerald-500/20 hover:from-lime-500/30 hover:to-emerald-500/30 border border-lime-500/40 text-xs font-semibold text-lime-300 transition-all cursor-pointer shadow-sm"
              title="Open in2peta AI image & video models"
            >
              <span>Create on in2peta</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Instagram Account Profile */}
            <div
              onClick={() => setShowConnectModal(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer group"
              title="Click to connect or switch Instagram account"
            >
              <div className={`w-7 h-7 rounded-full ${INSTA_GRADIENT} p-[1.5px] shrink-0`}>
                <img
                  src={activeChannel?.avatar || SAMPLE_IN2PETA_MEDIA[0].url}
                  alt="avatar"
                  className="w-full h-full rounded-full object-cover bg-slate-800"
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-white group-hover:text-rose-300 transition-colors flex items-center gap-1">
                  {activeChannel?.handle || '@mytestpage'}
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                </span>
                <span className="text-[10px] text-slate-400 capitalize">{activeChannel?.platform || 'Social'} Connected</span>
              </div>
            </div>

            {/* Auto-Publish Toggle */}
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Auto-Publish</span>
                <span className={`text-xs font-bold ${settings.autoApprove ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {settings.autoApprove ? 'Instant' : 'Review First'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoApprove}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.autoApprove ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center text-slate-800 ${
                    settings.autoApprove ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  <Zap className="w-3 h-3 text-amber-500" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="border-b border-white/5 bg-[#0d0f17]/90 backdrop-blur-xl px-4 sm:px-8 sticky top-18 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex space-x-2 sm:space-x-4">
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'studio'
                  ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Studio (Create Post)</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer relative ${
                activeTab === 'queue'
                  ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Review & Scheduled Queue</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Published on Instagram</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400">
                {publishedPosts.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowBeginnerGuide(!showBeginnerGuide)}
            className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer py-2"
          >
            <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>{showBeginnerGuide ? 'Hide Guide' : 'Show Beginner Guide'}</span>
          </button>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Beginner Step Cards */}
        {showBeginnerGuide && (
          <div className="bg-gradient-to-r from-purple-950/40 via-rose-950/20 to-slate-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-xs">
                  ★
                </div>
                <h3 className="font-bold text-sm text-white">How This Workflow Works: 3 Easy Steps</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBeginnerGuide(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Dismiss ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-lime-400">Step 1 · in2peta</span>
                <h4 className="text-sm font-semibold text-white">Create Media on in2peta</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Open <a href={IN2PETA_EXPLORE_URL} target="_blank" rel="noopener noreferrer" className="text-lime-300 underline font-medium">in2peta.com/explore</a> to generate an AI image or video, then attach it below.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400">Step 2 · Caption Studio</span>
                <h4 className="text-sm font-semibold text-white">Write Engaging Caption</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Type your concept or topic to instantly craft an Instagram caption with a punchy hook, clean spacing, and hashtags.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">Step 3 · Postiz</span>
                <h4 className="text-sm font-semibold text-white">Schedule to Instagram</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Preview the post on the Instagram simulator and schedule to your page via Postiz with 1 click.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: STUDIO (CREATE POST) */}
        {activeTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: STEP 1 (in2peta Media) + STEP 2 (AI Caption Studio) */}
            <div className="lg:col-span-7 space-y-6">
              {/* STEP 1: in2peta Media Hub Card */}
              <div className="bg-[#11131c] border border-lime-500/20 rounded-3xl p-6 shadow-xl space-y-5 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-lime-500/20 text-lime-400 flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-white">Attach Media from in2peta</h2>
                      <p className="text-[11px] text-slate-400">AI Images & Videos generated on in2peta platform</p>
                    </div>
                  </div>

                  {/* Direct Gateway to in2peta.com */}
                  <a
                    href={IN2PETA_EXPLORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-lime-500/10 hover:bg-lime-500/20 text-lime-300 border border-lime-500/30 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <span>Open in2peta Explore</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Media Attachment Options */}
                <div className="space-y-4">
                  {/* Mode tabs: Sample Showcase vs Upload from Computer vs Paste URL */}
                  <div className="grid grid-cols-3 gap-2 bg-black/40 p-1 rounded-2xl border border-white/5 text-xs">
                    <button
                      type="button"
                      onClick={() => setMediaSourceType('sample')}
                      className={`py-2 rounded-xl font-semibold transition-all cursor-pointer text-center ${
                        mediaSourceType === 'sample' ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      in2peta Samples
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMediaSourceType('upload');
                        fileInputRef.current?.click();
                      }}
                      className={`py-2 rounded-xl font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                        mediaSourceType === 'upload' ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaSourceType('url')}
                      className={`py-2 rounded-xl font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                        mediaSourceType === 'url' ? 'bg-white/10 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>Paste URL</span>
                    </button>
                  </div>

                  {/* Sample Showcase Selectors */}
                  {mediaSourceType === 'sample' && (
                    <div className="space-y-2">
                      <span className="text-[11px] text-slate-400 block font-medium">
                        Select a sample image from in2peta catalog:
                      </span>
                      <div className="grid grid-cols-3 gap-3">
                        {SAMPLE_IN2PETA_MEDIA.map((item, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              setAttachedMediaUrl(item.url);
                              setAttachedMediaType(item.type);
                            }}
                            className={`relative rounded-2xl overflow-hidden aspect-video border-2 transition-all cursor-pointer group ${
                              attachedMediaUrl === item.url
                                ? 'border-lime-400 shadow-lg shadow-lime-500/20'
                                : 'border-white/10 hover:border-white/30'
                            }`}
                          >
                            <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                              <span className="text-[11px] font-semibold text-white leading-tight">{item.name}</span>
                            </div>
                            {attachedMediaUrl === item.url && (
                              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-lime-400 text-black flex items-center justify-center font-bold text-[10px]">
                                ✓
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {mediaSourceType === 'upload' && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="p-6 rounded-2xl border-2 border-dashed border-white/15 hover:border-lime-400/50 bg-white/[0.02] flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-lime-500/10 text-lime-400 flex items-center justify-center">
                        {isUploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white block">
                          {isUploading ? 'Uploading directly to AWS S3...' : 'Click to browse image or video from gallery'}
                        </span>
                        <span className="text-[11px] text-slate-400">Permanently hosted on S3 &bullet; Supports PNG, JPG, MP4 (Max 50MB)</span>
                      </div>
                    </div>
                  )}

                  {/* Paste URL Input */}
                  {mediaSourceType === 'url' && (
                    <form onSubmit={handlePasteUrlSubmit} className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Paste in2peta image or video link (https://...)"
                        value={pastedUrlInput}
                        onChange={(e) => setPastedUrlInput(e.target.value)}
                        className="flex-1 bg-[#07080d] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:ring-1 focus:ring-lime-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-bold text-xs transition-all cursor-pointer shrink-0"
                      >
                        Apply Media
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* STEP 2: Caption Generator */}
              <div className="bg-[#11131c] border border-white/10 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                      2
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-white">Craft Engaging Caption & Hook</h2>
                      <p className="text-[11px] text-slate-400">High-converting Instagram captions, hooks & hashtags</p>
                    </div>
                  </div>

                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 font-semibold border border-purple-500/20">
                    AI Studio
                  </span>
                </div>

                {/* Topic / Prompt */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    What is this post about?
                  </label>
                  <textarea
                    rows={2}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. 20% discount on HVAC summer tune-up, energy saving tips, technician customer story..."
                    className="w-full bg-[#07080d] border border-white/10 rounded-2xl p-3.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none transition-all leading-relaxed"
                  />

                  {/* Idea Chips */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-rose-400" /> Ideas:
                    </span>
                    {INSPIRATION_CHIPS.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTopic(chip);
                          handleGenerateCaption(chip);
                        }}
                        className="text-xs bg-white/[0.04] hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 text-slate-400 px-3 py-1 rounded-full border border-white/5 transition-all cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone & CTA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">Tone of Voice</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full bg-[#07080d] border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                    >
                      <option>Warm & Engaging</option>
                      <option>High-Energy & Trendy</option>
                      <option>Luxury & Aesthetic</option>
                      <option>Direct & Promotional</option>
                      <option>Educational & Tips</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 mb-1 block">Schedule Slot</label>
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full bg-[#07080d] border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Call to Action (CTA)</label>
                  <input
                    type="text"
                    value={callToAction}
                    onChange={(e) => setCallToAction(e.target.value)}
                    placeholder="e.g. Drop a comment, Tap link in bio, DM us for quote..."
                    className="w-full bg-[#07080d] border border-white/10 text-white text-xs rounded-xl px-3.5 py-2.5 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                {/* Generate Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={isGenerating || isUploading || !topic.trim()}
                    onClick={() => handleGenerateCaption()}
                    className={`flex items-center gap-2 font-bold px-6 py-3 rounded-2xl text-white shadow-xl shadow-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer ${INSTA_GRADIENT} hover:opacity-95`}
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Writing Caption & Hook...</span>
                      </>
                    ) : isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Uploading Media to S3...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate Caption & Hashtags</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Editable Fields (When generated) */}
              {generatedDraft && (
                <div className="bg-[#11131c] border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-rose-400" />
                      Edit Post Details
                    </h3>
                    <span className="text-xs text-slate-400">Refine copy before scheduling</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-rose-300 block mb-1">Hook</label>
                    <input
                      type="text"
                      value={editHook}
                      onChange={(e) => setEditHook(e.target.value)}
                      className="w-full bg-[#07080d] border border-white/10 rounded-xl p-3 text-xs text-white focus:ring-1 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-rose-300 block mb-1">Caption</label>
                    <textarea
                      rows={4}
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      className="w-full bg-[#07080d] border border-white/10 rounded-xl p-3 text-xs text-white focus:ring-1 focus:ring-rose-500 focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-rose-300 block mb-1">Hashtags</label>
                    <input
                      type="text"
                      value={editHashtags}
                      onChange={(e) => setEditHashtags(e.target.value)}
                      className="w-full bg-[#07080d] border border-white/10 rounded-xl p-3 text-xs text-blue-400 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleApprove(generatedDraft.post.id)}
                      disabled={actionLoading === generatedDraft.post.id}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>{actionLoading === generatedDraft.post.id ? 'Scheduling...' : 'Schedule via Postiz'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: STEP 3 (Instagram Live Simulator) */}
            <div className="lg:col-span-5 sticky top-24 space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                    3
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Live Instagram Preview
                  </span>
                </div>

                {/* Aspect Ratio Switcher */}
                <div className="flex items-center gap-1 bg-[#11131c] p-1 rounded-xl border border-white/10 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('square')}
                    className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                      aspectRatio === 'square' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    1:1
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio('portrait')}
                    className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                      aspectRatio === 'portrait' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    4:5
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio('reel')}
                    className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                      aspectRatio === 'reel' ? 'bg-white text-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    9:16
                  </button>
                </div>
              </div>

              {/* The Instagram Feed Card Simulator */}
              <div className="bg-[#0b0c13] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full ${INSTA_GRADIENT} p-[1.5px]`}>
                      <img
                        src={activeChannel?.avatar || SAMPLE_IN2PETA_MEDIA[0].url}
                        alt="avatar"
                        className="w-full h-full rounded-full object-cover bg-black"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-white">
                          {activeChannel?.handle?.replace('@', '') || 'mytestpage'}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                      </div>
                      <span className="text-[10px] text-slate-400">California, USA</span>
                    </div>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-slate-400" />
                </div>

                {/* Media Screen (Image or Video) */}
                <div
                  className={`relative w-full bg-black overflow-hidden flex items-center justify-center ${
                    aspectRatio === 'square'
                      ? 'aspect-square'
                      : aspectRatio === 'portrait'
                      ? 'aspect-[4/5]'
                      : 'aspect-[9/16] max-h-[460px]'
                  }`}
                >
                  {attachedMediaType === 'video' ? (
                    <video
                      src={attachedMediaUrl}
                      controls
                      autoPlay
                      loop
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={attachedMediaUrl || SAMPLE_IN2PETA_MEDIA[0].url}
                      alt="in2peta visual"
                      className="w-full h-full object-cover transition-all"
                    />
                  )}

                  {/* Watermark badge */}
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-semibold text-white flex items-center gap-1 shadow-lg">
                    <Sparkles className="w-3 h-3 text-lime-400" />
                    <span>in2peta Media</span>
                  </div>
                </div>

                {/* Engagement Bar */}
                <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Heart className="w-5 h-5 text-white hover:text-rose-500 cursor-pointer transition-colors" />
                    <MessageCircle className="w-5 h-5 text-white hover:text-slate-300 cursor-pointer transition-colors" />
                    <Send className="w-5 h-5 text-white hover:text-slate-300 cursor-pointer transition-colors -rotate-12" />
                  </div>
                  <Bookmark className="w-5 h-5 text-white hover:text-slate-300 cursor-pointer transition-colors" />
                </div>

                {/* Likes */}
                <div className="px-4 pb-1">
                  <span className="text-xs font-bold text-white">528 likes</span>
                </div>

                {/* Captions */}
                <div className="px-4 pb-3 text-xs leading-relaxed text-slate-200 space-y-1.5">
                  <div>
                    <span className="font-bold text-white mr-1.5">
                      {activeChannel?.handle?.replace('@', '') || 'mytestpage'}
                    </span>
                    <span className="font-semibold text-white">
                      {editHook || (
                        <span className="text-slate-500 font-normal italic">
                          Hook headline will appear here...
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Body Caption */}
                  {editCaption ? (
                    <div>
                      {expandedCaption ? (
                        <p className="whitespace-pre-line text-slate-300 mt-1">{editCaption}</p>
                      ) : (
                        <p className="line-clamp-2 text-slate-300 mt-1">{editCaption}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedCaption(!expandedCaption)}
                        className="text-slate-500 hover:text-slate-300 text-[11px] mt-0.5 font-medium cursor-pointer"
                      >
                        {expandedCaption ? 'less' : '...more'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic mt-1">
                      Generated caption will appear here after clicking generate...
                    </p>
                  )}

                  {/* Hashtags */}
                  {editHashtags && (
                    <p className="text-blue-400 font-medium text-[11px] break-words pt-1">
                      {editHashtags}
                    </p>
                  )}

                  <div className="pt-2 text-[10px] text-slate-500 uppercase tracking-wider font-semibold border-t border-white/5">
                    Slot: {new Date(scheduledDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Schedule / Push Action Card */}
              {generatedDraft && (
                <div className="p-4 rounded-2xl bg-[#11131c] border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Ready to publish?</span>
                    <span className="text-[11px] text-slate-400">Postiz engine will publish this on schedule.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApprove(generatedDraft.post.id)}
                    disabled={actionLoading === generatedDraft.post.id}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>{actionLoading === generatedDraft.post.id ? 'Scheduling...' : 'Schedule via Postiz'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: QUEUE */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#11131c] p-5 rounded-3xl border border-white/10">
              <div>
                <h2 className="text-base font-bold text-white">Instagram Review & Schedule Queue</h2>
                <p className="text-xs text-slate-400">Posts waiting for review or scheduled in Postiz</p>
              </div>

              <div className="flex flex-wrap gap-1 bg-black/40 p-1 rounded-2xl border border-white/5 text-xs">
                {[
                  { key: 'ALL', label: 'All Posts', count: queueData.counts?.total || 0 },
                  { key: 'PENDING_REVIEW', label: 'Pending Review', count: queueData.counts?.pending || 0 },
                  { key: 'SCHEDULED', label: 'Scheduled', count: queueData.counts?.scheduled || 0 },
                  { key: 'REJECTED', label: 'Archived', count: queueData.counts?.rejected || 0 },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setQueueFilter(tab.key)}
                    className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      queueFilter === tab.key
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        queueFilter === tab.key ? 'bg-rose-800 text-white' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {queueData.queue.filter((p) => queueFilter === 'ALL' || p.status === queueFilter).length === 0 ? (
              <div className="bg-[#11131c]/50 border border-dashed border-white/10 rounded-3xl p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 mx-auto flex items-center justify-center text-slate-500 mb-3">
                  <Layers className="w-6 h-6 text-rose-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-300">No posts in this queue</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Create a post in Studio to preview and schedule it here.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('studio')}
                  className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Open Studio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {queueData.queue
                  .filter((p) => queueFilter === 'ALL' || p.status === queueFilter)
                  .map((post) => (
                    <div
                      key={post.id}
                      className="bg-[#11131c] border border-white/10 rounded-3xl p-5 shadow-xl flex flex-col justify-between hover:border-white/20 transition-all space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${INSTA_GRADIENT}`} />
                            {post.integrationName || 'Instagram'}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              post.status === 'PENDING_REVIEW'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : post.status === 'SCHEDULED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {post.status === 'PENDING_REVIEW' ? '⏳ Review Required' : post.status === 'SCHEDULED' ? '📅 Scheduled' : 'Archived'}
                          </span>
                        </div>

                        {post.visualUrl && (
                          <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/5 aspect-video group">
                            {post.mediaType === 'video' ? (
                              <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                                <video
                                  src={post.visualUrl}
                                  className="w-full h-full object-cover"
                                  muted
                                  playsInline
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                  <div className="w-10 h-10 rounded-full bg-rose-600/80 backdrop-blur-md flex items-center justify-center text-white shadow-lg">
                                    <Play className="w-5 h-5 ml-0.5" />
                                  </div>
                                </div>
                                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-bold text-white flex items-center gap-1 backdrop-blur-sm">
                                  <Film className="w-3 h-3 text-rose-400" /> Reel / Video
                                </span>
                              </div>
                            ) : (
                              <div className="relative w-full h-full">
                                <img
                                  src={post.visualUrl}
                                  alt={post.topic || 'Visual asset'}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1080&auto=format&fit=crop&q=80';
                                  }}
                                />
                                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-bold text-white flex items-center gap-1 backdrop-blur-sm">
                                  <ImageIcon className="w-3 h-3 text-rose-400" /> Photo Post
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        <h4 className="text-sm font-bold text-white">{post.hook || post.topic}</h4>
                        <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed whitespace-pre-line bg-black/40 p-3 rounded-2xl border border-white/5">
                          {post.caption || post.content}
                        </p>

                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            Slot: {new Date(post.scheduledDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingPost(post)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-all cursor-pointer"
                            title="Edit Post"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(post.id)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {post.status === 'PENDING_REVIEW' && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleReject(post.id)}
                              disabled={actionLoading === post.id}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-rose-950 text-slate-300 hover:text-rose-200 border border-white/5 cursor-pointer"
                            >
                              Archive
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprove(post.id)}
                              disabled={actionLoading === post.id}
                              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{actionLoading === post.id ? 'Approving...' : 'Approve & Schedule'}</span>
                            </button>
                          </div>
                        )}

                        {post.status === 'SCHEDULED' && (
                          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready in Postiz
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-[#11131c] p-5 rounded-3xl border border-white/10">
              <div>
                <h2 className="text-base font-bold text-white">Live Published Instagram Posts</h2>
                <p className="text-xs text-slate-400">Past posts successfully published to your connected page</p>
              </div>
              <button
                type="button"
                onClick={fetchData}
                className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl text-slate-300 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <div className="space-y-4">
              {publishedPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-[#11131c] border border-white/10 rounded-3xl p-5 flex flex-col md:flex-row gap-5 hover:border-white/20 transition-all shadow-xl"
                >
                  {/* Media Thumbnail */}
                  {post.mediaUrl && (
                    <div className="w-full md:w-44 h-44 rounded-2xl overflow-hidden bg-black/60 border border-white/5 shrink-0 relative group">
                      {post.mediaType === 'video' ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                          <video src={post.mediaUrl} className="w-full h-full object-cover" muted playsInline />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <div className="w-9 h-9 rounded-full bg-rose-600/80 flex items-center justify-center text-white shadow-md">
                              <Play className="w-4 h-4 ml-0.5" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={post.mediaUrl}
                          alt="Published media"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1080&auto=format&fit=crop&q=80';
                          }}
                        />
                      )}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-bold text-white backdrop-blur-sm">
                        {post.mediaType === 'video' ? '🎬 Reel' : '📸 Photo'}
                      </span>
                    </div>
                  )}

                  <div className="space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${INSTA_GRADIENT}`} />
                          {post.accountName}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400">
                          {new Date(post.publishDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            post.state === 'PUBLISHED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {post.state === 'PUBLISHED' ? '✅ Published' : post.state}
                        </span>
                      </div>

                      <div
                        className="text-xs text-slate-300 max-w-2xl leading-relaxed whitespace-pre-line bg-black/30 p-3 rounded-2xl border border-white/5"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[11px] text-slate-500">
                        Live on Facebook / Instagram
                      </span>
                      {post.releaseURL && (
                        <a
                          href={post.releaseURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-rose-500/20 to-purple-500/20 hover:from-rose-500/30 hover:to-purple-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold px-4 py-2 rounded-xl transition-all shrink-0 cursor-pointer shadow-sm"
                        >
                          <span>View on Instagram</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Connect Instagram Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11131c] border border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full ${INSTA_GRADIENT} p-[1.5px]`}>
                  <div className="w-full h-full bg-[#11131c] rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-rose-400" />
                  </div>
                </div>
                <h3 className="font-bold text-sm text-white">Connect Instagram Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Connect your Instagram Professional or Creator account to publish and schedule posts via Postiz.
            </p>

            <form onSubmit={handleConnectInstagram} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Instagram Handle</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">@</span>
                  <input
                    type="text"
                    required
                    value={customHandleInput}
                    onChange={(e) => setCustomHandleInput(e.target.value.replace('@', ''))}
                    placeholder="yourbrand or handle"
                    className="w-full bg-[#07080d] border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:ring-1 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-slate-400 space-y-1">
                <div className="font-semibold text-slate-200">Active Meta Connection:</div>
                <p>Currently linked with page: <strong>{activeChannel?.name || 'Mytestpage'}</strong></p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg shadow-rose-600/20 cursor-pointer ${INSTA_GRADIENT}`}
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {editingPost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11131c] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-rose-400" />
                Edit Post Content
              </h3>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Hook</label>
                <input
                  type="text"
                  value={editingPost.hook}
                  onChange={(e) => setEditingPost({ ...editingPost, hook: e.target.value })}
                  className="w-full bg-[#07080d] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Instagram Caption</label>
                <textarea
                  rows={4}
                  value={editingPost.caption}
                  onChange={(e) => setEditingPost({ ...editingPost, caption: e.target.value })}
                  className="w-full bg-[#07080d] border border-white/10 rounded-xl p-2.5 text-xs text-white leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Call to Action</label>
                <input
                  type="text"
                  value={editingPost.callToAction}
                  onChange={(e) => setEditingPost({ ...editingPost, callToAction: e.target.value })}
                  className="w-full bg-[#07080d] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Schedule Slot</label>
                <input
                  type="datetime-local"
                  value={new Date(editingPost.scheduledDate).toISOString().slice(0, 16)}
                  onChange={(e) => setEditingPost({ ...editingPost, scheduledDate: new Date(e.target.value).toISOString() })}
                  className="w-full bg-[#07080d] border border-white/10 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
