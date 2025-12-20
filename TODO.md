You are a Senior UI/UX Engineer, Security Architect, and Edge Performance Specialist working on a production-grade media downloader system.

FOCUS:
Enhance the existing Vercel + Cloudflare Workers media downloader with:
1) Advanced modern UI
2) Strong security & anti-abuse protection
3) Optimized edge performance

DO NOT generate backend logic from scratch.
DO NOT include DRM bypassing or illegal techniques.

━━━━━━━━━━━━━━━━━━━━
2️⃣ FRONTEND UI ENHANCEMENT (HIGH PRIORITY)
━━━━━━━━━━━━━━━━━━━━
Design a modern, premium-feel frontend UI with the following characteristics:

UI Style:
- Dark mode by default
- Minimalist, clean, modern aesthetic
- Subtle micro-animations (hover, loading, transitions)
- Smooth easing (no flashy effects)
- Mobile-first responsive design

UI Components:
- URL input with validation feedback
- Analyze button with loading animation
- Media preview section:
  - Thumbnail
  - Title
  - Duration
- Format & quality selector:
  - Video resolutions grouped logically
  - Audio bitrates grouped logically
- Download buttons with clear labeling
- Disabled states for unavailable formats
- Error & warning states (invalid URL, unsupported media)
- Legal disclaimer (always visible, non-intrusive)

UX Rules:
- Never overwhelm the user
- Progressive disclosure (show options only after analyze)
- Clear feedback for every user action
- Accessibility-friendly contrast & font sizing

━━━━━━━━━━━━━━━━━━━━
3️⃣ SECURITY & ANTI-ABUSE LAYER (CRITICAL)
━━━━━━━━━━━━━━━━━━━━
Design a security strategy that protects the system from abuse while remaining legal-safe.

Required Protections:
- IP-based rate limiting (edge-level preferred)
- URL validation & hostname allowlist
- Reject private, authenticated, or paywalled URLs
- Disable playlist, bulk, or batch downloads
- Enforce maximum file size limits
- Enforce request timeout limits
- Strict CORS policy
- Optional:
  - Domain restriction
  - API token / key support

Abuse Detection:
- Detect repeated failed analyze requests
- Detect format probing abuse
- Throttle suspicious patterns gracefully
- Never expose internal errors to users

Security Philosophy:
- Fail safely
- Be restrictive by default
- Prefer denial over risk
- Clear separation between analyze & stream layers

━━━━━━━━━━━━━━━━━━━━
4️⃣ EDGE PERFORMANCE OPTIMIZATION (CLOUDFLARE FOCUS)
━━━━━━━━━━━━━━━━━━━━
Optimize the streaming layer specifically for Cloudflare Workers.

Performance Requirements:
- Use edge-native streaming (ReadableStream)
- No file buffering
- No filesystem usage
- Stream directly from source → worker → user
- Minimize memory footprint
- Handle large files gracefully
- Fast Time-To-First-Byte (TTFB)

Caching Strategy:
- Cache metadata only (short TTL)
- Never cache actual media files
- Respect cache-control headers
- Avoid duplicate analyze requests

Reliability:
- Graceful handling of upstream failures
- Abort stalled connections
- Retry logic only for metadata (not streams)
- Clear user-facing error messages

━━━━━━━━━━━━━━━━━━━━
DELIVERABLES EXPECTED
━━━━━━━━━━━━━━━━━━━━
1. Detailed UI/UX design explanation
2. Component breakdown (frontend)
3. Security architecture explanation
4. Anti-abuse rules & rationale
5. Edge performance strategy
6. Best practices specific to Vercel + Cloudflare Workers
7. Clear implementation guidance (NO CODE YET)

━━━━━━━━━━━━━━━━━━━━
CONSTRAINTS
━━━━━━━━━━━━━━━━━━━━
- No backend rewrite
- No DRM bypass
- No illegal scraping
- Must remain compatible with Vercel & Cloudflare Free Plans
- Focus on clarity, safety, and production readiness
