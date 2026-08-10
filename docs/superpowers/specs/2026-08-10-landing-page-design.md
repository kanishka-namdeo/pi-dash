# PiDash Landing Page Design Spec

**Date:** 2026-08-10  
**Status:** Draft  
**Author:** PiDash Team

## Overview

A marketing landing page for PiDash, an Electron desktop app for monitoring and managing AI coding agents. The page targets both individual developers and team leads/engineering managers. Primary conversion goal: waitlist signup via Google Forms.

## Audience

- **Individual developers** — solo devs using AI coding agents who want a unified dashboard
- **Team leads / engineering managers** — people managing a team of developers using AI agents

## Value Proposition

**"Monitor all your AI agents in one place"** — centralization, visibility, and control for your fleet of AI coding agents.

## Visual Style

**Aesthetic:** Dark & technical — terminal vibes, developer-focused

### Color Palette

- **Background:** `#0a0a0a` (near-black)
- **Primary accent:** `#00d9ff` (cyan/electric blue — terminal feel)
- **Secondary accent:** `#8b5cf6` (purple — hover states, gradients)
- **Text:** `#e5e5e5` (light gray)
- **Muted:** `#6b6b6b` (dim gray for secondary text)

### Typography

- **Headlines:** Geist or Outfit (geometric sans-serif, bold). NOT Inter (discouraged as default).
- **Body:** Geist or Outfit, regular weight
- **Code/accents:** Geist Mono or JetBrains Mono

### Logo Concepts

Create all three logo variations in Pencil during implementation:

1. **Monogram:** "PD" in a terminal-style bracket `[PD]` with cyan accent — use as favicon and footer logo
2. **Icon:** Dashboard grid icon with 4 squares, one highlighted in cyan — use as app icon and social media avatar
3. **Wordmark:** "PiDash" with "Pi" in cyan, "Dash" in white — use in hero and header

### Section 1: Hero

- **Layout:** Split screen — left-aligned content, right-aligned visual (NOT centered hero)
- **Headline (left):** "Monitor all your AI coding agents in one place" (max 2 lines, text-4xl md:text-5xl lg:text-6xl)
- **Subheadline (left):** "PiDash gives you a unified dashboard to track, manage, and control your entire fleet of AI coding agents." (max 20 words)
- **CTA (left):** Email input + "Join the waitlist" button (links to Google Form)
- **Visual (right):** Real dashboard screenshot or generated image showing agent cards with status indicators. NOT a div-based fake mockup. Create in Pencil or capture from actual app.

### Section 2: Problem/Solution

- **Problem:** "Switching between 5 terminals. Checking 3 different dashboards. Losing track of which agent is doing what."
- **Solution:** "PiDash brings everything into one view. See every agent's status, output, and activity in real-time — no more context-switching."
- **Layout:** Two-column — pain points on left, solution on right, with icons

### Section 3: Features

Four features in a 2x2 grid:

1. **Multi-Agent Monitoring** — "Track all your AI agents from a single dashboard. See status, current task, and resource usage at a glance."
2. **Real-Time Terminal Output** — "Live terminal streams from every agent. Watch your agents work, intervene when needed, or let them run."
3. **GitHub Integration** — "See which branches each agent is working on, review PRs, and track commit history — all in one place."
4. **Smart Notifications** — "Get alerted when agents complete tasks, hit errors, or need your input. Never miss a critical moment."

### Section 4: How It Works

Three-step flow:

1. **Install PiDash** — "Download for Windows, Mac, or Linux. One-time setup, no cloud account required."
2. **Add Your Agents** — "PiDash auto-scans your system for installed AI agents, or add them manually. Supports Cursor, OMP, Claude Code, and more."
3. **Monitor & Control** — "Open the dashboard and see all your agents in action. Switch between agents, view terminal output, and manage tasks."

### Section 5: Product Showcase

- Large screenshot or animated mockup of the PiDash dashboard
- Show: agent cards, terminal panel, GitHub integration, status indicators
- Optional: subtle animation showing agents switching or terminal output streaming

### Section 6: Social Proof

- **Early access testimonial:** Use placeholder quote for launch: "PiDash saved me hours of context-switching. I can finally see what all my agents are doing without losing my flow." — *Early user*. Replace with real testimonial once we have beta users.
- **Stats:** "Built for developers managing 3+ AI agents" / "Supports 10+ popular AI coding agents"
- **Trust signal:** "Open source. Privacy-first. Your data stays on your machine."

### Section 7: FAQ

1. **What AI agents does PiDash support?** — "PiDash auto-detects Cursor, OMP, Claude Code, Codex, and more. You can also add custom agents by path."
2. **Is PiDash free?** — "PiDash is open source and free to use. We may add premium features in the future, but the core dashboard will always be free."
3. **Does PiDash send my data to the cloud?** — "No. PiDash runs locally on your machine. Your agent data, terminal output, and configuration stay on your computer."
4. **Can I use PiDash with my team?** — "Yes. PiDash supports team collaboration features like shared agent configurations and centralized monitoring (coming soon)."
5. **What platforms are supported?** — "Windows, macOS, and Linux. PiDash is built with Electron for cross-platform compatibility."

### Section 8: Final CTA

- **Headline:** "Ready to take control of your AI agent fleet?"
- **Subheadline:** "Join the waitlist and be the first to try PiDash."
- **CTA:** Email input + "Join the waitlist" button (links to Google Form)

### Section 9: Footer

- Logo + tagline
- Links: GitHub, Twitter/X, Documentation, Privacy Policy
- Copyright notice

## Technical Architecture

### Stack

- **Framework:** Astro (static-first, minimal JS)
- **Styling:** Tailwind CSS v4
- **Components:** Astro components + optional React islands for interactive elements
- **Deployment:** Static export → Netlify, Vercel, or Cloudflare Pages

### Project Structure
- **Framework:** Astro 5.2+ (static-first, minimal JS, official Tailwind v4 support)
- **Styling:** Tailwind CSS v4 (CSS-first configuration, no tailwind.config.js needed)
- **Setup:** `astro add tailwind` (one-command setup) or manual Vite plugin config
- **Deployment:** Static export → Netlify (simplest, zero-config), Vercel, or Cloudflare Pages. All free for static sites.
│   ├── components/
│   │   ├── Hero.astro
│   │   ├── ProblemSolution.astro
│   │   ├── Features.astro
│   │   ├── HowItWorks.astro
│   │   ├── Showcase.astro
│   │   ├── SocialProof.astro
│   │   ├── FAQ.astro
│   │   ├── FinalCTA.astro
│   │   └── Footer.astro
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
├── public/
│   └── logo.svg
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

### Waitlist Form

- **Backend:** Google Forms (completely free, unlimited submissions)
- **Implementation:** Embed Google Form or link out from CTA buttons
- **Success state:** Redirect to Google Forms confirmation or show inline "Thanks! We'll notify you when PiDash launches."

### Responsive Design

- **Backend:** Google Forms (completely free, unlimited submissions)
- **Implementation:** Native HTML form that POSTs to Google Forms `/formResponse` endpoint. No iframe, no backend needed. Turn OFF "Collect email addresses" in Google Form settings to avoid submission rejection.
- **Success state:** Redirect to a thank-you page or show inline "Thanks! We'll notify you when PiDash launches."
  - Tablet: 640–1024px
  - Desktop: > 1024px
- **Layout adjustments:**
  - Hero: stack vertically on mobile, side-by-side on desktop
  - Features: 1-column on mobile, 2x2 grid on desktop
  - How it works: vertical flow on mobile, horizontal on desktop

### Performance

- Static HTML output (zero JS by default)
- Tailwind purges unused styles
- Images optimized (WebP format, lazy loading)
- **Lighthouse target:** 95+ on all metrics (Performance, Accessibility, Best Practices, SEO)

## Error Handling & Edge Cases

- **Form submission:** Google Forms handles validation (email format). On success, redirect to thank-you state or show inline success message.
- **Image loading:** Lazy load the dashboard mockup. Show placeholder/skeleton while loading.
- **SEO:** Meta tags for title, description, OG image. Structured data for software application.

## Testing & Verification

- **Visual testing:** Manual browser testing at all breakpoints (mobile, tablet, desktop)
- **Lighthouse:** Target 95+ on Performance, Accessibility, Best Practices, SEO
- **Form test:** Submit test email via Google Forms, confirm it appears in responses sheet
- **Cross-browser:** Chrome, Firefox, Safari, Edge (latest versions)

## Deliverables

1. **Landing page** — fully responsive, deployed to production host
2. **Logo assets** — monogram, icon, and wordmark in SVG format (created in Pencil)
3. **Google Form** — configured for waitlist signup, linked from CTAs
4. **Documentation** — README with deployment instructions

## Out of Scope

- Blog or documentation site (separate project)
- User authentication or accounts
- Analytics integration (can add later)
- Multi-language support
- Dark/light mode toggle (dark only for launch)

## Future Enhancements

- Animated dashboard demo (video or interactive)
- Customer testimonials carousel (once we have real users)
- Pricing page (if we add premium features)
- Integration with actual PiDash app for live data
