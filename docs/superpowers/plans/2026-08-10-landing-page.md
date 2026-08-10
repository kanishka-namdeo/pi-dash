# PiDash Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dark-themed, responsive marketing landing page for PiDash with waitlist signup via Google Forms.

**Architecture:** Static Astro 5.2+ site with Tailwind CSS v4. Nine section components assembled into a single page. Google Forms integration via POST to `/formResponse` endpoint. Deploy to Netlify (zero-config static).

**Tech Stack:** Astro 5.2+, Tailwind CSS v4, Geist font, Google Forms

## Global Constraints

- Astro version: 5.2+ (required for official Tailwind v4 support)
- Tailwind setup: `astro add tailwind` (CSS-first config, no tailwind.config.js)
- Font: Geist or Outfit (NOT Inter)
- Hero layout: Split screen (left content, right visual) — NOT centered
- Hero visual: Real screenshot or generated image — NOT div-based fake mockup
- Google Forms: POST to `/formResponse` endpoint, "Collect email addresses" OFF
- Deployment: Netlify (zero-config static)
- Color palette: `#0a0a0a` background, `#00d9ff` cyan accent, `#8b5cf6` purple secondary
- Responsive breakpoints: Mobile < 640px, Tablet 640–1024px, Desktop > 1024px
- Lighthouse target: 95+ on all metrics

---

## File Structure

```
landing/
├── src/
│   ├── components/
│   │   ├── Hero.astro              # Split-screen hero with waitlist form
│   │   ├── ProblemSolution.astro   # Two-column problem/solution layout
│   │   ├── Features.astro          # 2x2 grid of features
│   │   ├── HowItWorks.astro        # 3-step horizontal flow
│   │   ├── Showcase.astro          # Large dashboard screenshot
│   │   ├── SocialProof.astro       # Testimonial + stats + trust signals
│   │   ├── FAQ.astro               # Accordion FAQ
│   │   ├── FinalCTA.astro          # Repeated waitlist CTA
│   │   └── Footer.astro            # Logo + links + copyright
│   ├── layouts/
│   │   └── Layout.astro            # Base HTML structure + global styles
│   ├── pages/
│   │   └── index.astro             # Assembles all components
│   └── styles/
│       └── global.css              # Tailwind imports + custom theme
├── public/
│   └── logo.svg                    # PiDash logo (created in Pencil)
├── astro.config.mjs                # Astro config with Tailwind v4 plugin
├── package.json                    # Dependencies
└── README.md                       # Setup + deployment instructions
```

---

### Task 1: Project Setup

**Files:**
- Create: `landing/package.json`
- Create: `landing/astro.config.mjs`
- Create: `landing/src/styles/global.css`
- Create: `landing/README.md`

**Interfaces:**
- Produces: Astro project with Tailwind v4 configured

- [ ] **Step 1: Create project directory and initialize**

```bash
mkdir landing
cd landing
npm init -y
```

- [ ] **Step 2: Install Astro and Tailwind**

```bash
npm install astro
npx astro add tailwind
```

This creates `astro.config.mjs` and installs `tailwindcss` + `@tailwindcss/vite`.

- [ ] **Step 3: Verify astro.config.mjs**

```javascript
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
```

- [ ] **Step 4: Create global.css with Tailwind import**

```css
/* landing/src/styles/global.css */
@import "tailwindcss";

/* Custom theme variables */
:root {
  --color-bg: #0a0a0a;
  --color-accent: #00d9ff;
  --color-accent-secondary: #8b5cf6;
  --color-text: #e5e5e5;
  --color-muted: #6b6b6b;
}

/* Base styles */
body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: 'Geist', sans-serif;
}
```

- [ ] **Step 5: Create README.md**

```markdown
# PiDash Landing Page

Marketing landing page for PiDash — an Electron desktop app for monitoring AI coding agents.

## Setup

```bash
cd landing
npm install
npm run dev
```

Open http://localhost:4321

## Build

```bash
npm run build
```

Output in `dist/` directory.

## Deploy

Static site — deploy `dist/` to Netlify, Vercel, or Cloudflare Pages.

## Tech Stack

- Astro 5.2+
- Tailwind CSS v4
- Geist font
- Google Forms (waitlist)
```

- [ ] **Step 6: Test dev server**

```bash
npm run dev
```

Expected: Server starts at http://localhost:4321, shows default Astro welcome page.

- [ ] **Step 7: Commit**

```bash
cd ..
git add landing/
git commit -m "feat: initialize landing page with Astro + Tailwind v4"
```

---

### Task 2: Base Layout

**Files:**
- Create: `landing/src/layouts/Layout.astro`
- Modify: `landing/src/pages/index.astro` (create placeholder)

**Interfaces:**
- Consumes: Global styles from `src/styles/global.css`
- Produces: Base HTML layout with font loading

- [ ] **Step 1: Create Layout.astro**

```astro
---
// landing/src/layouts/Layout.astro
import '../styles/global.css';

interface Props {
  title: string;
  description?: string;
}

const { title, description = 'Monitor all your AI coding agents in one place' } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <title>{title}</title>
    
    <!-- Geist font -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />
  </head>
  <body class="bg-[#0a0a0a] text-[#e5e5e5] font-geist antialiased">
    <slot />
  </body>
</html>
```

- [ ] **Step 2: Create placeholder index.astro**

```astro
---
// landing/src/pages/index.astro
import Layout from '../layouts/Layout.astro';
---

<Layout title="PiDash — Monitor All Your AI Agents">
  <main>
    <h1>PiDash</h1>
    <p>Landing page coming soon</p>
  </main>
</Layout>
```

- [ ] **Step 3: Test layout**

```bash
cd landing
npm run dev
```

Expected: Page loads with dark background (#0a0a0a), light text (#e5e5e5), Geist font.

- [ ] **Step 4: Commit**

```bash
cd ..
git add landing/src/
git commit -m "feat: add base layout with Geist font and dark theme"
```

---

### Task 3: Hero Component

**Files:**
- Create: `landing/src/components/Hero.astro`
- Modify: `landing/src/pages/index.astro`

**Interfaces:**
- Consumes: Layout from `Layout.astro`
- Produces: Split-screen hero with headline, subheadline, email form, and visual placeholder

- [ ] **Step 1: Create Hero.astro**

```astro
---
// landing/src/components/Hero.astro
---

<section class="min-h-[100dvh] flex items-center justify-center px-6 py-24">
  <div class="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
    <!-- Left: Content -->
    <div class="space-y-8">
      <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-none">
        Monitor all your AI coding agents in one place
      </h1>
      
      <p class="text-lg md:text-xl text-[#e5e5e5]/80 max-w-[65ch] leading-relaxed">
        PiDash gives you a unified dashboard to track, manage, and control your entire fleet of AI coding agents.
      </p>
      
      <!-- Waitlist form -->
      <form 
        action="https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse" 
        method="POST"
        target="_blank"
        class="flex flex-col sm:flex-row gap-4"
      >
        <input 
          type="email" 
          name="entry.EMAIL_ENTRY_ID" 
          placeholder="Enter your email"
          required
          class="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]"
        />
        <button 
          type="submit"
          class="px-8 py-3 bg-[#00d9ff] text-[#0a0a0a] font-semibold rounded-lg hover:bg-[#00d9ff]/90 transition-colors whitespace-nowrap"
        >
          Join the waitlist
        </button>
      </form>
    </div>
    
    <!-- Right: Visual placeholder -->
    <div class="aspect-video bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
      <p class="text-white/40 text-sm">Dashboard screenshot placeholder</p>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add Hero to index.astro**

```astro
---
// landing/src/pages/index.astro
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
---

<Layout title="PiDash — Monitor All Your AI Agents">
  <main>
    <Hero />
  </main>
</Layout>
```

- [ ] **Step 3: Test hero**

```bash
cd landing
npm run dev
```

Expected: Split-screen hero with headline on left, placeholder on right, email form below subheadline.

- [ ] **Step 4: Commit**

```bash
cd ..
git add landing/src/
git commit -m "feat: add hero component with split layout and waitlist form"
```

---

### Task 4: Problem/Solution Component

**Files:**
- Create: `landing/src/components/ProblemSolution.astro`
- Modify: `landing/src/pages/index.astro`

**Interfaces:**
- Consumes: Layout
- Produces: Two-column section with problem on left, solution on right

- [ ] **Step 1: Create ProblemSolution.astro**

```astro
---
// landing/src/components/ProblemSolution.astro
---

<section class="px-6 py-24 bg-white/[0.02]">
  <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
    <!-- Problem -->
    <div class="space-y-6">
      <h2 class="text-3xl md:text-4xl font-bold tracking-tight">
        The problem
      </h2>
      <div class="space-y-4 text-lg text-[#e5e5e5]/70">
        <p>Switching between 5 terminals.</p>
        <p>Checking 3 different dashboards.</p>
        <p>Losing track of which agent is doing what.</p>
      </div>
    </div>
    
    <!-- Solution -->
    <div class="space-y-6">
      <h2 class="text-3xl md:text-4xl font-bold tracking-tight text-[#00d9ff]">
        The solution
      </h2>
      <p class="text-lg text-[#e5e5e5]/70 leading-relaxed">
        PiDash brings everything into one view. See every agent's status, output, and activity in real-time — no more context-switching.
      </p>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add to index.astro**

```astro
---
// landing/src/pages/index.astro
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import ProblemSolution from '../components/ProblemSolution.astro';
---

<Layout title="PiDash — Monitor All Your AI Agents">
  <main>
    <Hero />
    <ProblemSolution />
  </main>
</Layout>
```

- [ ] **Step 3: Test**

```bash
cd landing
npm run dev
```

Expected: Two-column section below hero with problem on left, solution on right.

- [ ] **Step 4: Commit**

```bash
cd ..
git add landing/src/
git commit -m "feat: add problem/solution component"
```

---

### Task 5: Features Component

**Files:**
- Create: `landing/src/components/Features.astro`
- Modify: `landing/src/pages/index.astro`

**Interfaces:**
- Consumes: Layout
- Produces: 2x2 grid of features with icons

- [ ] **Step 1: Create Features.astro**

```astro
---
// landing/src/components/Features.astro
---

<section class="px-6 py-24">
  <div class="max-w-7xl mx-auto">
    <h2 class="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center">
      Everything you need to manage your agents
    </h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Feature 1 -->
      <div class="p-8 bg-white/5 border border-white/10 rounded-lg space-y-3">
        <div class="w-12 h-12 bg-[#00d9ff]/10 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-[#00d9ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 class="text-xl font-semibold">Multi-Agent Monitoring</h3>
        <p class="text-[#e5e5e5]/70">
          Track all your AI agents from a single dashboard. See status, current task, and resource usage at a glance.
        </p>
      </div>
      
      <!-- Feature 2 -->
      <div class="p-8 bg-white/5 border border-white/10 rounded-lg space-y-3">
        <div class="w-12 h-12 bg-[#00d9ff]/10 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-[#00d9ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 class="text-xl font-semibold">Real-Time Terminal Output</h3>
        <p class="text-[#e5e5e5]/70">
          Live terminal streams from every agent. Watch your agents work, intervene when needed, or let them run.
        </p>
      </div>
      
      <!-- Feature 3 -->
      <div class="p-8 bg-white/5 border border-white/10 rounded-lg space-y-3">
        <div class="w-12 h-12 bg-[#00d9ff]/10 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-[#00d9ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 class="text-xl font-semibold">GitHub Integration</h3>
        <p class="text-[#e5e5e5]/70">
          See which branches each agent is working on, review PRs, and track commit history — all in one place.
        </p>
      </div>
      
      <!-- Feature 4 -->
      <div class="p-8 bg-white/5 border border-white/10 rounded-lg space-y-3">
        <div class="w-12 h-12 bg-[#00d9ff]/10 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-[#00d9ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <h3 class="text-xl font-semibold">Smart Notifications</h3>
        <p class="text-[#e5e5e5]/70">
          Get alerted when agents complete tasks, hit errors, or need your input. Never miss a critical moment.
        </p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add to index.astro**

```astro
---
// landing/src/pages/index.astro
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import ProblemSolution from '../components/ProblemSolution.astro';
import Features from '../components/Features.astro';
---

<Layout title="PiDash — Monitor All Your AI Agents">
  <main>
    <Hero />
    <ProblemSolution />
    <Features />
  </main>
</Layout>
```

- [ ] **Step 3: Test**

```bash
cd landing
npm run dev
```

Expected: 2x2 grid of feature cards with icons below problem/solution section.

- [ ] **Step 4: Commit**

```bash
cd ..
git add landing/src/
git commit -m "feat: add features component with 2x2 grid"
```

---

### Task 6: How It Works Component

**Files:**
- Create: `landing/src/components/HowItWorks.astro`
- Modify: `landing/src/pages/index.astro`

**Interfaces:**
- Consumes: Layout
- Produces: 3-step horizontal flow (vertical on mobile)

- [ ] **Step 1: Create HowItWorks.astro**

```astro
---
// landing/src/components/HowItWorks.astro
---

<section class="px-6 py-24 bg-white/[0.02]">
  <div class="max-w-7xl mx-auto">
    <h2 class="text-3xl md:text-4xl font-bold tracking-tight mb-16 text-center">
      Get started in 3 steps
    </h2>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Step 1 -->
      <div class="text-center space-y-4">
        <div class="w-16 h-16 bg-[#00d9ff]/10 rounded-full flex items-center justify-center mx-auto">
          <span class="text-2xl font-bold text-[#00d9ff]">1</span>
        </div>
        <h3 class="text-xl font-semibold">Install PiDash</h3>
        <p class="text-[#e5e5e5]/70">
          Download for Windows, Mac, or Linux. One-time setup, no cloud account required.
        </p>
      </div>
      
      <!-- Step 2 -->
      <div class="text-center space-y-4">
        <div class="w-16 h-16 bg-[#00d9ff]/10 rounded-full flex items-center justify-center mx-auto">
          <span class="text-2xl font-bold text-[#00d9ff]">2</span>
        </div>
        <h3 class="text-xl font-semibold">Add Your Agents</h3>
        <p class="text-[#e5e5e5]/70">
          PiDash auto-scans your system for installed AI agents, or add them manually. Supports Cursor, OMP, Claude Code, and more.
        </p>
      </div>
      
      <!-- Step 3 -->
      <div class="text-center space-y-4">
        <div class="w-16 h-16 bg-[#00d9ff]/10 rounded-full flex items-center justify-center mx-auto">
          <span class="text-2xl font-bold text-[#00d9ff]">3</span>
        </div>
        <h3 class="text-xl font-semibold">Monitor & Control</h3>
        <p class="text-[#e5e5e5]/70">
          Open the dashboard and see all your agents in action. Switch between agents, view terminal output, and manage tasks.
        </p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add to index.astro**

```astro
---
// landing/src/pages/index.astro
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import ProblemSolution from '../components/ProblemSolution.astro';
import Features from '../components/Features.astro';
import HowItWorks from '../components/HowItWorks.astro';
---

<Layout title="PiDash — Monitor All Your AI Agents">
  <main>
    <Hero />
    <ProblemSolution />
    <Features />
    <HowItWorks />
  </main>
</Layout>
```

- [ ] **Step 3: Test**

```bash
cd landing
npm run dev
```

Expected: 3-step flow with numbered circles, horizontal on desktop, vertical on mobile.

- [ ] **Step 4: Commit**

```bash
cd ..
git add landing/src/
git commit -m "feat: add how-it-works component with 3-step flow"
```

---

### Task 7: Showcase Component

**Files:**
- Create: `landing/src/components/Showcase.astro`
- Modify: `landing/src/pages/index.astro`

**Interfaces:**
- Consumes: Layout
- Produces: Large dashboard screenshot section

- [ ] **Step 1: Create Showcase.astro**

```astro
---
// landing/src/components/Showcase.astro
---

<section class="px-6 py-24">
  <div class="max-w-7xl mx-auto">
    <h2 class="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center">
      See PiDash in action
    </h2>
    
    <!-- Dashboard screenshot placeholder -->
    <div class="aspect-video bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
      <p class="text-white/40 text-sm">Dashboard screenshot (create in Pencil or capture from app)</p>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add to index.astro**

```astro
---
// landing/src/pages/index.astro
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import ProblemSolution from '../components/ProblemSolution.astro';
import Features from '../components/Features.astro';
import HowItWorks from '../components/HowItWorks.astro';
import Showcase from '../components/Showcase.astro';
---

<Layout title="PiDash — Monitor All Your AI Agents">
  <main>
    <Hero />

- [ ] **Step 2: Add to index.astro**

```astro
---
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import ProblemSolution from '../components/ProblemSolution.astro';
import Features from '../components/Features.astro';
import HowItWorks from '../components/HowItWorks.astro';
import Showcase from '../components/Showcase.astro';
---

<Layout title="PiDash — Monitor All Your AI Agents">
  <main>
    <Hero />
    <ProblemSolution />
    <Features />
    <HowItWorks />
    <Showcase />
  </main>
</Layout>
```

- [ ] **Step 3: Commit**

```bash
git add landing/src/
git commit -m "feat: add showcase component"
```

---

### Task 8: SocialProof Component

**Files:**
- Create: `landing/src/components/SocialProof.astro`
- Modify: `landing/src/pages/index.astro`

- [ ] **Step 1: Create SocialProof.astro**

```astro
---
// landing/src/components/SocialProof.astro
---

<section class="px-6 py-24 bg-white/[0.02]">
  <div class="max-w-7xl mx-auto space-y-16">
    <!-- Testimonial -->
    <blockquote class="max-w-3xl mx-auto text-center">
      <p class="text-xl md:text-2xl italic text-[#e5e5e5]/90 leading-relaxed">
        "PiDash saved me hours of context-switching. I can finally see what all my agents are doing without losing my flow."
      </p>
      <footer class="mt-4 text-[#e5e5e5]/50">— Early user</footer>
    </blockquote>
    
    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto text-center">
      <div>
        <p class="text-3xl font-bold text-[#00d9ff]">3+</p>
        <p class="text-[#e5e5e5]/70 mt-1">AI agents managed per developer</p>
      </div>
      <div>
        <p class="text-3xl font-bold text-[#00d9ff]">10+</p>
        <p class="text-[#e5e5e5]/70 mt-1">Popular AI coding agents supported</p>
      </div>
    </div>
    
    <!-- Trust signals -->
    <div class="flex flex-wrap justify-center gap-6 text-sm text-[#e5e5e5]/50">
      <span>Open source</span>
      <span>•</span>
      <span>Privacy-first</span>
      <span>•</span>
      <span>Your data stays on your machine</span>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add to index.astro and commit**

```bash
git add landing/src/
git commit -m "feat: add social proof component"
```

---

### Task 9: FAQ Component

**Files:**
- Create: `landing/src/components/FAQ.astro`
- Modify: `landing/src/pages/index.astro`

- [ ] **Step 1: Create FAQ.astro**

```astro
---
// landing/src/components/FAQ.astro
const faqs = [
  {
    q: "What AI agents does PiDash support?",
    a: "PiDash auto-detects Cursor, OMP, Claude Code, Codex, and more. You can also add custom agents by path."
  },
  {
    q: "Is PiDash free?",
    a: "PiDash is open source and free to use. We may add premium features in the future, but the core dashboard will always be free."
  },
  {
    q: "Does PiDash send my data to the cloud?",
    a: "No. PiDash runs locally on your machine. Your agent data, terminal output, and configuration stay on your computer."
  },
  {
    q: "Can I use PiDash with my team?",
    a: "Yes. PiDash supports team collaboration features like shared agent configurations and centralized monitoring (coming soon)."
  },
  {
    q: "What platforms are supported?",
    a: "Windows, macOS, and Linux. PiDash is built with Electron for cross-platform compatibility."
  }
];
---

<section class="px-6 py-24">
  <div class="max-w-3xl mx-auto">
    <h2 class="text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center">
      Frequently asked questions
    </h2>
    
    <div class="space-y-6">
      {faqs.map((faq) => (
        <details class="group bg-white/5 border border-white/10 rounded-lg">
          <summary class="flex items-center justify-between p-6 cursor-pointer font-semibold list-none">
            {faq.q}
            <svg class="w-5 h-5 text-[#00d9ff] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <p class="px-6 pb-6 text-[#e5e5e5]/70">{faq.a}</p>
        </details>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add to index.astro and commit**

```bash
git add landing/src/
git commit -m "feat: add FAQ component with accordion"
```

---

### Task 10: FinalCTA Component

**Files:**
- Create: `landing/src/components/FinalCTA.astro`
- Modify: `landing/src/pages/index.astro`

- [ ] **Step 1: Create FinalCTA.astro**

```astro
---
// landing/src/components/FinalCTA.astro
---

<section class="px-6 py-24 bg-white/[0.02]">
  <div class="max-w-3xl mx-auto text-center space-y-8">
    <h2 class="text-3xl md:text-4xl font-bold tracking-tight">
      Ready to take control of your AI agent fleet?
    </h2>
    <p class="text-lg text-[#e5e5e5]/70">
      Join the waitlist and be the first to try PiDash.
    </p>
    
    <form 
      action="https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse" 
      method="POST"
      target="_blank"
      class="flex flex-col sm:flex-row gap-4 max-w-md mx-auto"
    >
      <input 
        type="email" 
        name="entry.EMAIL_ENTRY_ID" 
        placeholder="Enter your email"
        required
        class="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]"
      />
      <button 
        type="submit"
        class="px-8 py-3 bg-[#00d9ff] text-[#0a0a0a] font-semibold rounded-lg hover:bg-[#00d9ff]/90 transition-colors whitespace-nowrap"
      >
        Join the waitlist
      </button>
    </form>
  </div>
</section>
```

- [ ] **Step 2: Add to index.astro and commit**

```bash
git add landing/src/
git commit -m "feat: add final CTA component with waitlist form"
```

---

### Task 11: Footer Component

**Files:**
- Create: `landing/src/components/Footer.astro`
- Modify: `landing/src/pages/index.astro`

- [ ] **Step 1: Create Footer.astro**

```astro
---
// landing/src/components/Footer.astro
---

<footer class="px-6 py-12 border-t border-white/10">
  <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
    <!-- Logo -->
    <div class="flex items-center gap-2">
      <span class="text-xl font-bold">
        <span class="text-[#00d9ff]">Pi</span>Dash
      </span>
    </div>
    
    <!-- Links -->
    <nav class="flex gap-6 text-sm text-[#e5e5e5]/50">
      <a href="https://github.com" class="hover:text-white transition-colors">GitHub</a>
      <a href="https://twitter.com" class="hover:text-white transition-colors">Twitter</a>
      <a href="/docs" class="hover:text-white transition-colors">Docs</a>
      <a href="/privacy" class="hover:text-white transition-colors">Privacy</a>
    </nav>
    
    <!-- Copyright -->
    <p class="text-sm text-[#e5e5e5]/30">
      &copy; 2026 PiDash. All rights reserved.
    </p>
  </div>
</footer>
```

- [ ] **Step 2: Add to index.astro and commit**

```bash
git add landing/src/
git commit -m "feat: add footer component"
```

---

### Task 12: Assemble Full Page

**Files:**
- Modify: `landing/src/pages/index.astro`

- [ ] **Step 1: Write final index.astro with all components**

```astro
---
// landing/src/pages/index.astro
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import ProblemSolution from '../components/ProblemSolution.astro';
import Features from '../components/Features.astro';
import HowItWorks from '../components/HowItWorks.astro';
import Showcase from '../components/Showcase.astro';
import SocialProof from '../components/SocialProof.astro';
import FAQ from '../components/FAQ.astro';
import FinalCTA from '../components/FinalCTA.astro';
import Footer from '../components/Footer.astro';
---

<Layout title="PiDash — Monitor All Your AI Agents">
  <main>
    <Hero />
    <ProblemSolution />
    <Features />
    <HowItWorks />
    <Showcase />
    <SocialProof />
    <FAQ />
    <FinalCTA />
  </main>
  <Footer />
</Layout>
```

- [ ] **Step 2: Test full page**

```bash
cd landing
npm run dev
```

Expected: All 9 sections render in order, responsive at all breakpoints.

- [ ] **Step 3: Commit**

```bash
git add landing/src/pages/index.astro
git commit -m "feat: assemble full landing page with all 9 sections"
```

---

### Task 13: Google Forms Integration

**Files:**
- Modify: `landing/src/components/Hero.astro`
- Modify: `landing/src/components/FinalCTA.astro`

- [ ] **Step 1: Create Google Form**

1. Go to https://forms.google.com
2. Create a new form with one question: "Email address" (short answer)
3. Turn OFF "Collect email addresses" in Settings → Responses
4. Click Send → click the link icon → copy the form URL
5. Note the form ID from the URL (between `/d/e/` and `/viewform`)
6. Inspect the live form to find the `entry.XXXXXX` ID for the email field

- [ ] **Step 2: Replace placeholders in Hero.astro and FinalCTA.astro**

Replace `YOUR_FORM_ID` with the actual form ID and `entry.EMAIL_ENTRY_ID` with the actual entry ID from Step 1.

- [ ] **Step 3: Test form submission**

Submit a test email. Verify it appears in the Google Form responses sheet.

- [ ] **Step 4: Commit**

```bash
git add landing/src/components/Hero.astro landing/src/components/FinalCTA.astro
git commit -m "feat: wire up Google Forms waitlist integration"
```

---

### Task 14: Logo Creation (Pencil MCP)

**Files:**
- Create: `landing/public/logo.svg`

- [ ] **Step 1: Create logos in Pencil**

Use Pencil MCP to create three logo variations:
1. Monogram: `[PD]` with cyan accent
2. Icon: Dashboard grid (4 squares, one highlighted)
3. Wordmark: "PiDash" with "Pi" in cyan

- [ ] **Step 2: Export SVGs to `landing/public/`**

- [ ] **Step 3: Use wordmark in Footer and Hero**

- [ ] **Step 4: Commit**

```bash
git add landing/public/
git commit -m "feat: add PiDash logo assets created in Pencil"
```

---

### Task 15: SEO & Meta Tags

**Files:**
- Modify: `landing/src/layouts/Layout.astro`

- [ ] **Step 1: Add Open Graph and structured data**

```astro
---
// Add to Layout.astro <head>
const ogImage = '/og-image.png';
---

<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:type" content="website" />
<meta property="og:image" content={ogImage} />
<meta name="twitter:card" content="summary_large_image" />
<link rel="icon" type="image/svg+xml" href="/logo.svg" />
```

- [ ] **Step 2: Commit**

```bash
git add landing/src/layouts/Layout.astro
git commit -m "feat: add SEO meta tags and Open Graph"
```

---

### Task 16: Build & Deploy

**Files:**
- Create: `landing/netlify.toml` (optional)

- [ ] **Step 1: Build for production**

```bash
cd landing
npm run build
```

Expected: Output in `dist/` directory, all assets optimized.

- [ ] **Step 2: Test production build locally**

```bash
npx serve dist
```

Expected: Site loads correctly from static build.

- [ ] **Step 3: Deploy to Netlify**

Option A: Drag and drop `dist/` folder at https://app.netlify.com/drop
Option B: Connect GitHub repo for auto-deploys

- [ ] **Step 4: Run Lighthouse audit**

Target: 95+ on Performance, Accessibility, Best Practices, SEO.

- [ ] **Step 5: Final commit**

```bash
git add landing/
git commit -m "feat: landing page complete — ready for deployment"
```