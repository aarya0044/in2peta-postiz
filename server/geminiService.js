import { CONFIG } from './config.js';

export class GeminiService {
  /**
   * Generate Instagram-native content and visual assets using in2peta AI
   */
  static async generatePost({
    topic,
    tone = 'Warm & Friendly',
    format = 'feed', // 'feed' | 'reel'
    callToAction = 'Drop a comment or DM us!',
    customInstructions = '',
  }) {
    const isReel = format === 'reel';

    const prompt = `You are in2peta AI, an elite Instagram social media strategist and creative director.
Generate a captivating, high-performing Instagram ${isReel ? 'Reel script and visual concept' : 'feed post and visual asset'}.

Topic / Theme: ${topic}
Tone of Voice: ${tone}
Format: ${isReel ? 'Instagram Reel (Short-form Video)' : 'Instagram Feed Post (Image/Carousel)'}
${callToAction ? `Call To Action: ${callToAction}` : ''}
${customInstructions ? `Special Instructions: ${customInstructions}` : ''}

CRITICAL INSTAGRAM GUIDELINES:
- The hook MUST be punchy and under 125 characters so it hooks viewers before the "...more" button.
- Use natural line breaks between paragraphs and tasteful, aesthetic emojis.
- Include 5 to 8 targeted hashtags.
- Generate an inspiring visual direction for an AI image or video shoot.
- Provide a curated visual keyword for high-resolution stock/AI visualization (e.g. "modern living room", "air conditioner repair technician", "sunset patio", etc.).

Respond ONLY with a valid JSON object matching the following structure (no markdown formatting, no code block backticks):
{
  "hook": "A scroll-stopping opening hook (under 125 characters)",
  "caption": "The main Instagram caption. Well-spaced with line breaks and emojis. Do not repeat the hook or hashtags here.",
  "hashtags": ["#Tag1", "#Tag2", "#Tag3", "#Tag4", "#Tag5"],
  "visualPrompt": "Detailed creative direction for an AI-generated image or video scene",
  "visualKeyword": "2-3 word search keyword for realistic imagery",
  "reelStoryboard": ${isReel ? `[
    {"second": "0-3s", "visual": "Punchy hook scene description", "audio": "Voiceover / sound effect"},
    {"second": "3-15s", "visual": "Core tip or visual transformation", "audio": "Voiceover value drop"},
    {"second": "15-20s", "visual": "Closing screen with CTA", "audio": "Call to action audio cue"}
  ]` : 'null'}
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

    const payload = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
      },
    };

    let res = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) break;

        if (res.status === 503 || res.status === 429) {
          console.warn(`Gemini API busy (${res.status}), retrying in ${attempts * 1500}ms...`);
          await new Promise((r) => setTimeout(r, attempts * 1500));
          continue;
        }

        const errorText = await res.text();
        throw new Error(`in2peta AI error (${res.status}): ${errorText}`);
      } catch (err) {
        if (attempts >= maxAttempts) throw err;
        await new Promise((r) => setTimeout(r, attempts * 1500));
      }
    }

    if (!res || !res.ok) {
      const errorText = await res?.text?.() || 'Service unavailable';
      throw new Error(`in2peta AI error (${res?.status || 500}): ${errorText}`);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('No content returned from in2peta AI');
    }

    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
    else if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);
    cleanJson = cleanJson.trim();

    try {
      const parsed = JSON.parse(cleanJson);
      return parsed;
    } catch (parseErr) {
      return {
        hook: topic.slice(0, 120),
        caption: rawText,
        hashtags: ['#in2peta', '#instagramgrowth', '#creators'],
        visualPrompt: 'A vibrant, modern photo representing ' + topic,
        visualKeyword: 'modern lifestyle',
        reelStoryboard: null,
      };
    }
  }
}
