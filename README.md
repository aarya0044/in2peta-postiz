# PostPulse — Custom Admin & Post Approval Application

A client-facing Admin and Approval Portal for social media management, built with **React**, **Tailwind CSS**, **Node.js Express**, **Google Gemini**, and the **Postiz Engine**.

---

## 🌟 Key Features

1. **Google Gemini Content Studio**:
   - High-converting post generation powered by Google's latest `gemini-3.6-flash`.
   - Generates structured Hook / Headline, body caption with formatting and emojis, targeted hashtags, recommended visual/imagery concepts, and Call-To-Action (CTA).
   - Instant live editing of all generated fields before scheduling.

2. **Master Auto-Approval Workflow (Core Feature)**:
   - **Auto-Approval ON (⚡)**: Newly generated posts are automatically scheduled directly to Postiz without manual intervention.
   - **Auto-Approval OFF (🛡️)**: Newly generated posts are placed in a **Pending Review** queue. Reviewers can preview the live post card, edit the text/schedule slot, approve, or reject.

3. **Live Social Media Feed Mockup**:
   - Interactive preview simulating a live Facebook post feed (with avatar, channel badge, formatted body, hashtags, and mock engagement controls).

4. **Multi-Tab Dashboard**:
   - **AI Post Studio**: Generate & refine posts with one click.
   - **Review Queue**: Filter posts by *Pending Review*, *Scheduled*, *Rejected*, and *All*.
   - **Live Feed & History**: Real-time sync with Postiz and Meta Graph API, including direct "View Live on Facebook" links.
   - **Settings & AWS**: Diagnostic dashboard showing Postiz connection, Gemini model status, and AWS S3 bucket configuration.

5. **AWS S3 Media Architecture**:
   - Prepared for bucket `in2peta-postiz-media` in AWS Region `ap-southeast-2` (Sydney).
   - Ready for IAM Role ARN temporary credentials as soon as supplied by the AWS manager.

---

## 🚀 Getting Started

### Access the Application
The application is running and accessible in your web browser at:
👉 **[http://localhost:3005](http://localhost:3005)**

### Commands (from `admin-approval-portal` folder):
```bash
# Start the fullstack application on http://localhost:3005
npm start

# Run frontend dev server with hot reload on http://localhost:5173
npm run dev:client

# Rebuild the production client bundle
npm run build
```

---

## ⚙️ Configuration & Environment

- **Server Port**: `3005`
- **Postiz Engine URL**: `http://localhost:4007/api/public/v1`
- **Postiz Connected Channel**: `Mytestpage` (Facebook Page)
- **LLM**: Google Gemini (`gemini-3.6-flash`)
- **AWS S3 Bucket**: `in2peta-postiz-media` (Sydney `ap-southeast-2`)
