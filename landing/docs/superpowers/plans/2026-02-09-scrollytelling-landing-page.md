# Scrollytelling Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the PiDash Astro landing page into a cinematic scrollytelling experience with pinned hero, horizontal-scrolling features, sticky-stack how-it-works, and scroll-reveal animations.

**Architecture:** GSAP-native approach with Lenis smooth scrolling. Each component has its own `<script>` tag with `gsap.context()` scoping. Global initialization in ScrollSetup.astro. All animations gated behind `prefers-reduced-motion` check.

**Tech Stack:** Astro 7, Tailwind v4, GSAP 3.12+ with ScrollTrigger, Lenis 1.x

## Global Constraints

- **Bundle size:** ~150KB total addition (Lenis 30KB + GSAP 120KB)
- **Browser support:** All modern browsers (Chrome, Firefox, Safari, Edge)
- **Reduced motion:** All animations must respect `prefers-reduced-motion: reduce`
- **Mobile fallback:** Horizontal features and sticky-stack disable on viewport < 768px
- **Performance:** Animate only `transform` and `opacity`, never `top/left/width/height`
- **Accessibility:** WCAG AA contrast ratios, keyboard navigation, screen reader support
- **Image format:** WebP for all screenshots
- **Icon library:** Use inline SVG icons (already in codebase pattern)

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: None
- Produces: `gsap` and `lenis` packages available for import

- [ ] **Step 1: Install GSAP and Lenis**

Run:
```bash
npm install gsap lenis
```

Expected: Packages added to `package.json` dependencies, `node_modules` updated.

- [ ] **Step 2: Verify installation**

Run:
```bash
npm list gsap lenis
```

Expected: Output shows `gsap@3.x.x` and `lenis@1.x.x` installed.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install gsap and lenis for scrollytelling"
```

---

### Task 2: Create Global Scroll Setup

**Files:**
- Create: `src/components/ScrollSetup.astro`
- Modify: `src/layouts/Layout.astro`

**Interfaces:**
- Consumes: None
- Produces: Global Lenis + GSAP initialization, available to all components

- [ ] **Step 1: Create ScrollSetup.astro**

Create `src/components/ScrollSetup.astro`:

```astro
---
// landing/src/components/ScrollSetup.astro
---

<script>
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import Lenis from 'lenis';

  // Check reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!prefersReducedMotion) {
    gsap.registerPlugin(ScrollTrigger);
    
    // Initialize Lenis smooth scrolling
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    
    // Sync Lenis with GSAP
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0); // Canonical sync, no lag
    
    // Expose for cleanup in other components
    window.__lenisInstance = lenis;
  }
  
  // Cleanup on Astro view transition
  document.addEventListener('astro:after-swap', () => {
    if (window.__lenisInstance) {
      window.__lenisInstance.destroy();
      window.__lenisInstance = null;
    }
    ScrollTrigger.getAll().forEach(t => t.kill());
  });
</script>
```

- [ ] **Step 2: Update Layout.astro to include ScrollSetup**

Read `src/layouts/Layout.astro` and add the import and component:

```astro
---
import ScrollSetup from '../components/ScrollSetup.astro';
// ... existing imports
---

<!DOCTYPE html>
<html lang="en">
<head>
  <!-- ... existing head content ... -->
</head>
<body>
  <ScrollSetup />
  <slot />
</body>
</html>
```

- [ ] **Step 3: Verify no build errors**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ScrollSetup.astro src/layouts/Layout.astro
git commit -m "feat: add global scroll setup with Lenis and GSAP"
```

---

### Task 3: Implement Hero Pinned Parallax

**Files:**
- Modify: `src/components/Hero.astro`

**Interfaces:**
- Consumes: GSAP, ScrollTrigger (from Task 2)
- Produces: Pinned hero with parallax dashboard screenshot, headline scale/fade, subtext fade, CTA fade

- [ ] **Step 1: Add IDs to Hero elements**

Read `src/components/Hero.astro` and add IDs to target elements:

```astro
<section id="hero" class="min-h-[100dvh] flex items-center justify-center px-6 py-24">
  <div class="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
    <!-- Left: Content -->
    <div class="space-y-8">
      <img id="hero-logo" src="/logo-wordmark.svg" alt="PiDash" width="160" height="38" />
      <h1 id="hero-headline" class="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-none">
        Monitor all your AI coding agents in one place
      </h1>
      
      <p id="hero-subtext" class="text-lg md:text-xl text-[#e5e5e5]/80 max-w-[65ch] leading-relaxed">
        PiDash gives you a unified dashboard to track, manage, and control your entire fleet of AI coding agents.
      </p>
      
      <form id="hero-cta" action="https://docs.google.com/forms/d/e/YOUR_FORM_ID/formResponse" method="POST" target="_blank" class="flex flex-col sm:flex-row gap-4">
        <input type="email" name="entry.EMAIL_ENTRY_ID" placeholder="Enter your email" required class="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#00d9ff]" />
        <button type="submit" class="px-8 py-3 bg-[#00d9ff] text-[#0a0a0a] font-semibold rounded-lg hover:bg-[#00d9ff]/90 transition-colors whitespace-nowrap">
          Join the waitlist
        </button>
      </form>
    </div>
    
    <!-- Right: Dashboard screenshot -->
    <div id="hero-screenshot" class="relative aspect-video rounded-lg overflow-hidden border border-white/10 shadow-2xl shadow-[#00d9ff]/10">
      <img src="/screenshots/dashboard.webp" alt="PiDash dashboard showing agent fleet, terminal output, and GitHub integration" class="w-full h-full object-cover" loading="eager" />
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add ScrollTrigger animation script**

Add `<script>` tag at the end of `Hero.astro`:

```astro
<script>
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!prefersReducedMotion) {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '#hero',
          start: 'top top',
          end: '+=100%',
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        }
      });
      
      // Parallax: dashboard moves up at 0.5x speed
      tl.to('#hero-screenshot', {
        y: '-50%',
        ease: 'none',
      }, 0);
      
      // Headline: scale down + fade
      tl.to('#hero-headline', {
        scale: 0.85,
        opacity: 0.3,
        ease: 'none',
      }, 0);
      
      // Subtext: fade out
        opacity: 0,
        ease: 'none',
      }, 0);
      
      // CTA: fade to 0.5
      tl.to('#hero-cta', {
        opacity: 0.5,
        ease: 'none',
      }, 0);
    }, '#hero');
    
    document.addEventListener('astro:after-swap', () => ctx.revert());
  }
</script>
```

- [ ] **Step 3: Test in browser**

Run:
```bash
npm run dev
```

Open browser, scroll through hero section. Verify:
- Hero pins for 100vh of scroll
- Dashboard screenshot parallaxes upward
- Headline scales down and fades
- Subtext fades out
- CTA fades to 0.5 opacity

- [ ] **Step 4: Test reduced motion**

In OS settings, enable "Reduce motion". Reload page. Verify:
- No pinning
- No parallax
- No opacity/scale changes
- Hero scrolls normally

- [ ] **Step 5: Commit**

```bash
git add src/components/Hero.astro
git commit -m "feat: implement pinned hero with parallax"
```

---

### Task 4: Implement Features Horizontal Scroll Hijack

**Files:**
- Modify: `src/components/Features.astro`

**Interfaces:**
- Consumes: GSAP, ScrollTrigger (from Task 2)
- Produces: Horizontal-scrolling feature cards with progress indicator

- [ ] **Step 1: Replace Features.astro with horizontal scroll structure**

Replace entire `src/components/Features.astro` with:

```astro
---
// landing/src/components/Features.astro
---

<section id="features" class="overflow-hidden">
  <div id="features-track" class="flex w-full">
    <!-- Feature 1: AI Agent Monitoring -->
    <div class="min-w-[100vw] flex items-center justify-center px-6">
      <div class="max-w-4xl text-center space-y-8">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 class="text-4xl font-bold">AI Agent Monitoring</h2>
        <p class="text-xl text-gray-400 max-w-2xl mx-auto">
          Track every agent's activity in real-time. See what they're working on, what they've completed, and where they're stuck.
        </p>
        <div class="relative aspect-video max-w-3xl mx-auto rounded-lg overflow-hidden border border-white/10">
          <img src="/features/monitoring.webp" alt="AI Agent Monitoring" loading="lazy" />
        </div>
      </div>
    </div>
    
    <!-- Feature 2: Cross-Repo Visibility -->
    <div class="min-w-[100vw] flex items-center justify-center px-6">
      <div class="max-w-4xl text-center space-y-8">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        </div>
        <h2 class="text-4xl font-bold">Cross-Repo Visibility</h2>
        <p class="text-xl text-gray-400 max-w-2xl mx-auto">
          See which branches each agent is working on, review PRs, and track commit history across all your repositories.
        </p>
        <div class="relative aspect-video max-w-3xl mx-auto rounded-lg overflow-hidden border border-white/10">
          <img src="/screenshots/github.webp" alt="Cross-Repo Visibility" loading="lazy" />
        </div>
      </div>
    </div>
    
    <!-- Feature 3: Smart Alerts -->
    <div class="min-w-[100vw] flex items-center justify-center px-6">
      <div class="max-w-4xl text-center space-y-8">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <h2 class="text-4xl font-bold">Smart Alerts</h2>
        <p class="text-xl text-gray-400 max-w-2xl mx-auto">
          Get notified when agents complete tasks, hit errors, or need your input. Never miss a critical moment.
        </p>
        <div class="relative aspect-video max-w-3xl mx-auto rounded-lg overflow-hidden border border-white/10">
          <img src="/screenshots/notifications.webp" alt="Smart Alerts" loading="lazy" />
        </div>
      </div>
    </div>
    
    <!-- Feature 4: Team Collaboration -->
    <div class="min-w-[100vw] flex items-center justify-center px-6">
      <div class="max-w-4xl text-center space-y-8">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 class="text-4xl font-bold">Team Collaboration</h2>
        <p class="text-xl text-gray-400 max-w-2xl mx-auto">
          Share agent fleets with your team. Coordinate work, avoid conflicts, and build together.
        </p>
        <div class="relative aspect-video max-w-3xl mx-auto rounded-lg overflow-hidden border border-white/10">
          <img src="/screenshots/team.webp" alt="Team Collaboration" loading="lazy" />
        </div>
      </div>
    </div>
  </div>
  
  <!-- Progress Indicator -->
  <div class="absolute bottom-8 left-0 right-0 flex justify-center gap-3">
    <div class="feature-dot w-3 h-3 rounded-full bg-gray-600 transition-colors active:bg-cyan-400"></div>
    <div class="feature-dot w-3 h-3 rounded-full bg-gray-600 transition-colors active:bg-cyan-400"></div>
    <div class="feature-dot w-3 h-3 rounded-full bg-gray-600 transition-colors active:bg-cyan-400"></div>
    <div class="feature-dot w-3 h-3 rounded-full bg-gray-600 transition-colors active:bg-cyan-400"></div>
  </div>
</section>

<script>
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Disable on mobile
  if (!prefersReducedMotion && window.innerWidth >= 768) {
    const ctx = gsap.context(() => {
      const track = document.querySelector('#features-track');
      const cards = document.querySelectorAll('#features-track > *');
      const trackWidth = track.scrollWidth - window.innerWidth;
      
      gsap.to(track, {
        x: () => -trackWidth,
        ease: 'none',
        scrollTrigger: {
          trigger: '#features',
          start: 'top top',
          end: () => `+=${trackWidth}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const progress = self.progress;
            const activeCard = Math.floor(progress * cards.length);
            document.querySelectorAll('.feature-dot').forEach((dot, i) => {
              dot.classList.toggle('active', i === activeCard);
            });
          }
        }
      });
    }, '#features');
    
    document.addEventListener('astro:after-swap', () => ctx.revert());
  }
</script>
```

- [ ] **Step 2: Test in browser (desktop)**

Run:
```bash
npm run dev
```

Open browser at desktop width (≥768px), scroll through features section. Verify:
- Section pins to viewport
- Cards pan horizontally as you scroll
- Progress indicator dots highlight active card
- Each card is 100vw wide

- [ ] **Step 3: Test mobile fallback**

Resize browser to mobile width (<768px). Reload page. Verify:
- No horizontal pan
- Cards stack vertically
- Normal scroll behavior

- [ ] **Step 4: Commit**

```bash
git add src/components/Features.astro
git commit -m "feat: implement horizontal scroll hijack for features"
```

---

### Task 5: Implement HowItWorks Sticky-Stack

**Files:**
- Modify: `src/components/HowItWorks.astro`

**Interfaces:**
- Consumes: GSAP, ScrollTrigger (from Task 2)
- Produces: Sticky-stack steps with scale/fade transforms

- [ ] **Step 1: Replace HowItWorks.astro with sticky-stack structure**

Replace entire `src/components/HowItWorks.astro` with:

```astro
---
// landing/src/components/HowItWorks.astro
---

<section id="how-it-works" class="relative">
  <!-- Step 1 -->
  <div class="how-step min-h-[100dvh] flex items-center justify-center px-6 sticky top-0">
    <div class="max-w-4xl text-center space-y-8">
      <div class="w-20 h-20 mx-auto rounded-full bg-[#00d9ff]/10 flex items-center justify-center">
        <span class="text-3xl font-bold text-[#00d9ff]">1</span>
      </div>
      <h3 class="text-3xl md:text-4xl font-bold">Install PiDash</h3>
      <p class="text-xl text-[#e5e5e5]/70 max-w-2xl mx-auto">
        Download for Windows, Mac, or Linux. One-time setup, no cloud account required.
      </p>
    </div>
  </div>
  
  <!-- Step 2 -->
  <div class="how-step min-h-[100dvh] flex items-center justify-center px-6 sticky top-0">
    <div class="max-w-4xl text-center space-y-8">
      <div class="w-20 h-20 mx-auto rounded-full bg-[#00d9ff]/10 flex items-center justify-center">
        <span class="text-3xl font-bold text-[#00d9ff]">2</span>
      </div>
      <h3 class="text-3xl md:text-4xl font-bold">Add Your Agents</h3>
      <p class="text-xl text-[#e5e5e5]/70 max-w-2xl mx-auto">
        PiDash auto-scans your system for installed AI agents, or add them manually.
      </p>
      <div class="relative aspect-video max-w-3xl mx-auto rounded-lg overflow-hidden border border-white/10">
        <img src="/screenshots/results.webp" alt="Agent detection results" loading="lazy" />
      </div>
    </div>
  </div>
  
  <!-- Step 3 -->
  <div class="how-step min-h-[100dvh] flex items-center justify-center px-6">
    <div class="max-w-4xl text-center space-y-8">
      <div class="w-20 h-20 mx-auto rounded-full bg-[#00d9ff]/10 flex items-center justify-center">
        <span class="text-3xl font-bold text-[#00d9ff]">3</span>
      </div>
      <h3 class="text-3xl md:text-4xl font-bold">Monitor & Control</h3>
      <p class="text-xl text-[#e5e5e5]/70 max-w-2xl mx-auto">
        Open the dashboard and see all your agents in action. Switch between agents, view terminal output, and manage tasks.
      </p>
    </div>
  </div>
</section>

<script>
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!prefersReducedMotion) {
    const ctx = gsap.context(() => {
      const steps = gsap.utils.toArray('.how-step');
      
      steps.forEach((step, i) => {
        if (i === steps.length - 1) return; // Last step doesn't pin
        
        ScrollTrigger.create({
          trigger: step,
          start: 'top top',
          endTrigger: steps[steps.length - 1],
          end: 'top top',
          pin: true,
          pinSpacing: false,
        });
        
        gsap.to(step, {
          scale: 0.92,
          opacity: 0.55,
          ease: 'none',
          scrollTrigger: {
            trigger: steps[i + 1],
            start: 'top bottom',
            end: 'top top',
            scrub: true,
          }
        });
      });
    }, '#how-it-works');
    
    document.addEventListener('astro:after-swap', () => ctx.revert());
  }
</script>
```

- [ ] **Step 2: Test in browser**

Run:
```bash
npm run dev
```

Open browser, scroll through how-it-works section. Verify:
- Step 1 pins, Step 2 slides up and covers it
- Step 1 scales to 0.92 and fades to 0.55 opacity
- Step 2 pins, Step 3 slides up and covers it
- Step 2 scales to 0.92 and fades to 0.55 opacity
- Step 3 scrolls away normally

- [ ] **Step 3: Test reduced motion**

Enable "Reduce motion" in OS settings. Reload page. Verify:
- No sticky positioning
- No scale/fade transforms
- Steps stack vertically with normal scroll

- [ ] **Step 4: Commit**

```bash
git add src/components/HowItWorks.astro
git commit -m "feat: implement sticky-stack for how-it-works"
```

---

### Task 6: Implement Scroll-Reveal on Secondary Sections

**Files:**
- Modify: `src/components/ProblemSolution.astro`
- Modify: `src/components/Showcase.astro`
- Modify: `src/components/SocialProof.astro`
- Modify: `src/components/FAQ.astro`
- Modify: `src/components/FinalCTA.astro`

**Interfaces:**
- Consumes: GSAP, ScrollTrigger (from Task 2)
- Produces: Scroll-reveal stagger animation on all 5 sections

- [ ] **Step 1: Add scroll-reveal to ProblemSolution.astro**

Read `src/components/ProblemSolution.astro` and add `.reveal-item` class to animatable elements, then add `<script>` tag:

```astro
<script>
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!prefersReducedMotion) {
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray('#problem-solution .reveal-item');
      
      gsap.from(items, {
        opacity: 0,
        y: 40,
        duration: 0.8,
        stagger: 0.06,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#problem-solution',
          start: 'top 70%',
          toggleActions: 'play none none none',
        }
      });
    }, '#problem-solution');
    
    document.addEventListener('astro:after-swap', () => ctx.revert());
  }
</script>
```

Add `id="problem-solution"` to the section element and `.reveal-item` class to headline, problem description, and solution description.

- [ ] **Step 2: Add scroll-reveal to Showcase.astro**

Read `src/components/Showcase.astro` and add `.reveal-item` class to animatable elements, then add `<script>` tag:

```astro
<script>
  import gsap from  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!prefersReducedMotion) {
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray('#showcase .reveal-item');
      
      gsap.from(items, {
        opacity: 0,
        y: 40,
        duration: 0.8,
        stagger: 0.06,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#showcase',
          start: 'top 70%',
          toggleActions: 'play none none none',
        }
      });
    }, '#showcase');
    
    document.addEventListener('astro:after-swap', () => ctx.revert());
  }
</script>
```

Add `id="showcase"` to the section element and `.reveal-item` class to headline and all screenshot cards.

- [ ] **Step 3: Add scroll-reveal to SocialProof.astro**

Read `src/components/SocialProof.astro` and add `.reveal-item` class to animatable elements, then add `<script>` tag:

```astro
<script>
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!prefersReducedMotion) {
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray('#social-proof .reveal-item');
      
      gsap.from(items, {
        opacity: 0,
        y: 40,
        duration: 0.8,
        stagger: 0.06,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#social-proof',
          start: 'top 70%',
          toggleActions: 'play none none none',
        }
      });
    }, '#social-proof');
    
    document.addEventListener('astro:after-swap', () => ctx.revert());
  }
</script>
```

Add `id="social-proof"` to the section element and `.reveal-item` class to headline and logo wall.

- [ ] **Step 4: Add scroll-reveal to FAQ.astro**

Read `src/components/FAQ.astro` and add `.reveal-item` class to animatable elements, then add `<script>` tag:

```astro
<script>
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!prefersReducedMotion) {
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray('#faq .reveal-item');
      
      gsap.from(items, {
        opacity: 0,
        y: 40,
        duration: 0.8,
        stagger: 0.06,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#faq',
          start: 'top 70%',
          toggleActions: 'play none none none',
        }
      });
    }, '#faq');
    
    document.addEventListener('astro:after-swap', () => ctx.revert());
  }
</script>
```

Add `id="faq"` to the section element and `.reveal-item` class to headline and all accordion items.

- [ ] **Step 5: Add scroll-reveal to FinalCTA.astro**

Read `src/components/FinalCTA.astro` and add `.reveal-item` class to animatable elements, then add `<script>` tag:

```astro
<script>
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!prefersReducedMotion) {
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray('#final-cta .reveal-item');
      
      gsap.from(items, {
        opacity: 0,
        y: 40,
        duration: 0.8,
        stagger: 0.06,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '#final-cta',
          start: 'top 70%',
          toggleActions: 'play none none none',
        }
      });
    }, '#final-cta');
    
    document.addEventListener('astro:after-swap', () => ctx.revert());
  }
</script>
```

Add `id="final-cta"` to the section element and `.reveal-item` class to headline, subtext, and CTA button.

- [ ] **Step 6: Test all scroll-reveal sections**

Run:
```bash
npm run dev
```

Open browser, scroll through each section. Verify:
- Elements fade in from opacity 0 to 1
- Elements translate upward from y: 40px to y: 0
- Stagger delay of 0.06s between items
- Animation triggers when section is 30% visible

- [ ] **Step 7: Commit**

```bash
git add src/components/ProblemSolution.astro src/components/Showcase.astro src/components/SocialProof.astro src/components/FAQ.astro src/components/FinalCTA.astro
git commit -m "feat: add scroll-reveal to all secondary sections"
```

---

### Task 7: Create Missing Screenshot Assets

**Files:**
- Create: `public/features/monitoring.webp`
- Create: `public/screenshots/notifications.webp`
- Create: `public/screenshots/team.webp`

**Interfaces:**
- Consumes: None
- Produces: Screenshot assets for features section

- [ ] **Step 1: Create monitoring screenshot**

Take a screenshot of the PiDash agent monitoring dashboard. Save as `public/features/monitoring.webp` with dimensions 1200x675px (16:9 aspect ratio).

If PiDash is not yet built, create a placeholder image with the correct dimensions and a label "AI Agent Monitoring Screenshot".

- [ ] **Step 2: Create notifications screenshot**

Take a screenshot of the PiDash notification settings or alerts panel. Save as `public/screenshots/notifications.webp` with dimensions 1200x675px.

If not available, create a placeholder.

- [ ] **Step 3: Create team screenshot**

Take a screenshot of the PiDash team collaboration features. Save as `public/screenshots/team.webp` with dimensions 1200x675px.

If not available, create a placeholder.

- [ ] **Step 4: Verify all images are WebP format**

Run:
```bash
file public/features/monitoring.webp public/screenshots/notifications.webp public/screenshots/team.webp
```

Expected: All files are WebP format.

- [ ] **Step 5: Commit**

```bash
git add public/features/monitoring.webp public/screenshots/notifications.webp public/screenshots/team.webp
git commit -m "feat: add missing screenshot assets"
```

---

### Task 8: Final Testing and Verification

**Files:**
- None (testing only)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Verified scrollytelling implementation

- [ ] **Step 1: Test reduced motion**

In OS settings, enable "Reduce motion". Reload page. Verify:
- No animations play
- Lenis smooth scrolling is disabled
- Page renders as static layout
- All sections scroll normally

- [ ] **Step 2: Test mobile fallbacks**

Resize browser to mobile width (<768px). Verify:
- Features section stacks vertically (no horizontal pan)
- HowItWorks section stacks vertically (no sticky-stack)
- Scroll-reveal still works (or is disabled if reduced motion)

- [ ] **Step 3: Test keyboard navigation**

Tab through the page. Verify:
- All CTAs are focusable
- Focus states are visible (cyan ring)
- Tab order follows visual order

- [ ] **Step 4: Test cross-browser**

Open page in Chrome, Firefox, Safari. Verify:
- All animations work correctly
- No console errors
- Performance is smooth (60fps)

- [ ] **Step 5: Run Lighthouse audit**

Run:
```bash
npm run build
npm run preview
```

Open Chrome DevTools, run Lighthouse audit. Verify:
- Performance score > 90
- Accessibility score > 90
- Best Practices score > 90
- SEO score > 90

- [ ] **Step 6: Test resize behavior**

Resize browser window dynamically. Verify:
- ScrollTrigger recalculates correctly
- No layout breaks
- Animations continue to work

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "feat: complete scrollytelling landing page implementation"
```

---

## Summary

**Total tasks:** 8  
**Estimated time:** 12-16 hours  
**Deliverables:**
- Pinned hero with parallax
- Horizontal-scrolling features with progress indicator
- Sticky-stack how-it-works
- Scroll-reveal on all secondary sections
- Lenis smooth scrolling
- Full reduced-motion support
- Mobile fallbacks
- Missing screenshot assets

**Testing checklist:**
- [ ] Reduced motion works
- [ ] Mobile fallbacks work
- [ ] Keyboard navigation works
- [ ] Cross-browser compatibility
- [ ] Lighthouse scores > 90
- [ ] Resize behavior works
