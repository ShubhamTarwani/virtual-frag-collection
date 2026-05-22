# Fragrance Shelf Infrastructure Hardening Guide

This document details the configuration, testing, and monitoring setup for our high-traffic optimization. We have successfully replaced Supabase storage and Vercel Image Optimization with Cloudinary, and configured caching and health monitoring.

---

## 1. Cloudinary Account Configuration

Cloudinary has a generous, creditcard-free tier (25 credits per month, equivalent to ~25GB of bandwidth or storage). 

### Setup Instructions
1. Go to [Cloudinary Sign Up](https://cloudinary.com) and create an account.
2. Once inside your dashboard, locate your environment details:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Copy these credentials into your `.env.local` file (and Vercel dashboard when deploying):
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   ```
4. Define a secure secret string for your Operations dashboard:
   ```env
   ADMIN_HEALTH_TOKEN=your_secure_secret_token
   ```

---

## 2. Client-Side Upload Pipeline
When a user uploads a new fragrance bottle image:
1. **Compress**: The image is compressed on the client using `browser-image-compression` to **max 300KB** and converted to `image/webp`. This minimizes network bandwidth and storage size.
2. **Authorize**: The client requests a signed upload signature from our Vercel API endpoint (`/api/upload/presign`). This route verifies that the user is logged into our Supabase Auth instance.
3. **Upload**: The client uploads the file directly to Cloudinary’s REST API using the signed signature. **No heavy binary data is sent through or processed by our Vercel functions**, saving Vercel execution bandwidth.

---

## 3. Serving Optimized Images
We have disabled Next.js default built-in image optimization (`images.unoptimized = true` in `next.config.ts`) to avoid hitting Vercel's 5,000/month optimization limit.
- Instead, images are served with dynamic Cloudinary transformations via our custom `<SmartImage>` component or the `cdnImage` helper.
- When an image is rendered, `cdnImage(url, { width })` injects resize parameters like `w_640,q_75,f_auto,c_limit` directly into the image source URL.
- Cloudinary transforms and caches these assets automatically at the edge.

---

## 4. Run Legacy Image Migration
To migrate all existing images from Supabase Storage to Cloudinary, run the automated migration script.

### A. Dry Run (Preview Changes)
Run this command to preview which database rows will be migrated, without performing actual file writes or DB updates:
```bash
npm run migrate:images -- --dry-run
```

### B. Execute Migration
When ready to write, execute:
```bash
npm run migrate:images
```
- *Note:* This script downloads legacy files, uploads them to Cloudinary, and updates DB rows. It is idempotent; you can safely run it multiple times.
- *Safety Check:* The script does **NOT** delete the files from Supabase Storage. They remain intact as a backup.

---

## 5. Health Monitoring Dashboard
We have implemented a system health check API route at `/api/health` and a beautiful traffic-light visual dashboard.
- Access the status page via:
  `http://localhost:3000/api/health/dashboard?token=YOUR_ADMIN_HEALTH_TOKEN`
- You can set up a free uptime monitor (such as **BetterStack** or **UptimeRobot**) pointing to your public health JSON endpoint:
  `https://your-vercel-domain.vercel.app/api/health`
  *Configure it to expect a `200 OK` status. If any service (Supabase REST, Database client, or Cloudinary Ping API) goes down or takes longer than 3 seconds, it will return `503 Service Unavailable`, alerting you immediately.*
