# Scrollytelling Landing Page Design

**Date:** 2026-02-09  
**Status:** Approved for implementation  
**Scope:** Transform PiDash Astro landing page into heavy scrollytelling experience

---

## Overview

Convert the existing PiDash landing page (Astro 7 + Tailwind v4) into a cinematic scrollytelling experience using GSAP-native approach with Lenis smooth scrolling.

**Intensity:** Heavy scrollytelling  
**Stack:** Lenis + GSAP + ScrollTrigger  
**Bundle addition:** ~150KB (Lenis 30KB + GSAP 120KB)

---

## Section Treatments

### Big Three (Heavy Scrollytelling)

1. **Hero** - Pinned with parallax dashboard screenshot
2. **Features** - Horizontal scroll hijack (vertical scroll drives horizontal pan)
3. **HowItWorks** - Sticky-stack steps (cards stack on top of each other)

### Secondary Sections (Light Scrollytelling)

4. **ProblemSolution** - Scroll-reveal stagger
5. **Showcase** - Scroll-reveal stagger
6. **SocialProof** - Scroll-reveal stagger
7. **FAQ** - Scroll-reveal stagger
8. **FinalCTA** - Scroll-reveal stagger

---

## Architecture & Setup

### Dependencies

```bash
npm install gsap lenis
```

- **GSAP 3.12+** with ScrollTrigger plugin (~120KB)
- **Lenis 1.x** for smooth scrolling (~30KB)

### File Structure

```
landing/src/
  components/
    Hero.astro              → pinned hero with parallax
    Features.astro          → horizontal scroll hijack
    HowItWorks.astro        → sticky-stack steps
    ProblemSolution.astro   → scroll-reveal
    Showcase.astro          → scroll-reveal stagger
    SocialProof.astro       → scroll-reveal
    FAQ.astro               → scroll-reveal
    FinalCTA.astro          → scroll-reveal
    ScrollSetup.astro       → shared Lenis + GSAP initialization
  layouts/
    Layout.astro            → wraps ScrollSetup
```

### Global Initialization (ScrollSetup.astro)

Single component initializes Lenis and registers ScrollTrigger globally. Included once in the layout.

```astro
<!-- ScrollSetup.astro -->
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
  }
</script>
```

### Component Pattern

Each scrollytelling component follows this pattern:

```astro
<!-- Component.astro -->
<section id="component-root" class="...">
  <!-- HTML content -->
</section>

<script>
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (!prefersReducedMotion) {
    const ctx = gsap.context(() => {
      // ScrollTrigger animations scoped to this component
    }, '#component-root');
    
    // Cleanup on Astro view transition
    document.addEventListener('astro:before-swap', () => ctx.revert());
  }
</script>
```

### Key Architecture Decisions

1. **No ScrollSmoother** - Using Lenis, not GSAP's ScrollSmoother. They conflict.
2. **`gsap.ticker.lagSmoothing(0)`** - Canonical Lenis + GSAP sync. Prevents jitter.
3. **`gsap.context()` scoping** - Each component's animations are scoped to its root element. Prevents selector collisions.
4. **Reduced motion check** - All animations are gated behind `prefers-reduced-motion`. If enabled, the page renders statically with no JS animations.
5. **View transition cleanup** - `astro:before-swap` kills all ScrollTriggers before navigation. Prevents memory leaks and stale triggers.

---

## Hero Section (Pinned with Parallax)

### Behavior

The hero pins to the viewport for 100vh of scroll distance. As the user scrolls:
- The dashboard screenshot parallaxes upward at 0.5x speed (moves slower than scroll, creating depth)
- The headline scales from 1.0 → 0.85 and fades to 0.3 opacity
- The subtext fades to 0 opacity
- The CTA (email form) stays fixed, fades to 0.5 opacity at 80% scroll progress
- The logo wordmark stays fixed, no animation

### ScrollTrigger Config

```javascript
gsap.context(() => {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: '+=100%', // Pin for 100vh of scroll
      pin: true,
      scrub: 1, // Smooth scrub, 1 second catch-up
      invalidateOnRefresh: true, // Recalculate on resize
    }
  });
  
  // Parallax: dashboard moves up at 0.5x speed
  tl.to('#hero-screenshot', {
    y: '-50%', // Moves up 50% of its height
    ease: 'none',
  }, 0);
  
  // Headline: scale down + fade
  tl.to('#hero-headline', {
    scale: 0.85,
    opacity: 0.3,
    ease: 'none',
  }, 0);
  
  // Subtext: fade out
  tl.to('#hero-subtext', {
    opacity: 0,
    ease: 'none',
  }, 0);
  
  // CTA: fade to 0.5
  tl.to('#hero-cta', {
    opacity: 0.5,
    ease: 'none',
  }, 0);
}, '#hero');
```

### HTML Structure

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
      
      <form id="hero-cta" action="..." method="POST" target="_blank" class="flex flex-col sm:flex-row gap-4">
        <input type="email" name="entry.EMAIL_ENTRY_ID" placeholder="Enter your email" required class="..." />
        <button type="submit" class="...">Join the waitlist</button>
      </form>
    </div>
    
    <!-- Right: Dashboard screenshot -->
    <div id="hero-screenshot" class="relative aspect-video rounded-lg overflow-hidden border border-white/10 shadow-2xl shadow-[#00d9ff]/10">
      <img src="/screenshots/dashboard.webp" alt="PiDash dashboard" class="w-full h-full object-cover" loading="eager" />
    </div>
  </div>
</section>
```

### Key Details

1. **`pin: true`** - Hero stays fixed at `top: 0` for the duration of the scroll
2. **`scrub: 1`** - Animations are tied to scroll position, with 1 second of catch-up for smoothness
3. **`invalidateOnRefresh: true`** - Recalculates trigger positions on window resize
4. **Parallax ratio** - Screenshot moves at 0.5x speed (half the scroll distance). Creates subtle depth effect.
5. **Headline scale** - Scales to 0.85 (15% smaller) at the end. Not too dramatic, just enough to feel like it's receding.
6. **Opacity values** - Headline fades to 0.3 (still readable), subtext to 0 (gone), CTA to 0.5 (dimmed but visible). Guides the eye: screenshot becomes the focus.

### Reduced Motion Fallback

If `prefers-reduced-motion` is enabled:
- No pinning
- No parallax
- No opacity/scale changes
- Hero renders as a static section, scrolls normally

---

## Features Section (Horizontal Scroll Hijack)

### Behavior

The Features section transforms from a grid into a horizontal-scrolling carousel. As the user scrolls vertically:
- The section pins to the viewport
- A horizontal track containing 4 feature cards pans from left to right
- Each card is 100vw wide, centered in the viewport during its scroll segment
- A progress indicator at the bottom shows which feature is currently in view
- The section unpins after all 4 cards have scrolled past

### ScrollTrigger Config

```javascript
gsap.context(() => {
  const track = document.querySelector('#features-track');
  const cards = document.querySelectorAll('#features-track > *');
  const trackWidth = track.scrollWidth - window.innerWidth;
  
  gsap.to(track, {
    x: () => -trackWidth, // Scroll the full track width
    ease: 'none',
    scrollTrigger: {
      trigger: '#features',
      start: 'top top',
      end: () => `+=${trackWidth}`, // Scroll distance = track width
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
      // Progress indicator callback
      onUpdate: (self) => {
        const progress = self.progress;
        const activeCard = Math.floor(progress * cards.length);
        // Update progress indicator
        document.querySelectorAll('.feature-dot').forEach((dot, i) => {
          dot.classList.toggle('active', i === activeCard);
        });
      }
    }
  });
}, '#features');
```

### HTML Structure

```astro
<section id="features" class="overflow-hidden">
  <div id="features-track" class="flex w-full">
    <!-- Feature 1: AI Agent Monitoring -->
    <div class="min-w-[100vw] flex items-center justify-center px-6">
      <div class="max-w-4xl text-center space-y-8">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 flex items-center justify-center">
          <svg>...</svg> <!-- Monitor icon -->
        </div>
        <h2 class="text-4xl font-bold">AI Agent Monitoring</h2>
        <p class="text-xl text-gray-400 max-w-2xl mx-auto">
          Track every agent's activity in real-time. See what they're working on, 
          what they've completed, and where they're stuck.
        </p>
        <div class="relative aspect-video max-w-3xl mx-auto">
          <img src="/features/monitoring.webp" alt="AI Agent Monitoring" loading="lazy" />
        </div>
      </div>
    </div>
    
    <!-- Feature 2: Cross-Repo Visibility -->
    <div class="min-w-[100vw] flex items-center justify-center px-6">
      <!-- Same structure, different content -->
    </div>
    
    <!-- Feature 3: Smart Alerts -->
    <div class="min-w-[100vw] flex items-center justify-center px-6">
      <!-- Same structure, different content -->
    </div>
    
    <!-- Feature 4: Team Collaboration -->
    <div class="min-w-[100vw] flex items-center justify-center px-6">
      <!-- Same structure, different content -->
    </div>
  </div>
  
  <!-- Progress Indicator -->
  <div class="absolute bottom-8 left-0 right-0 flex justify-center gap-3">
    <div class="feature-dot w-3 h-3 rounded-full bg-gray-600 transition-colors"></div>
    <div class="feature-dot w-3 h-3 rounded-full bg-gray-600 transition-colors"></div>
    <div class="feature-dot w-3 h-3 rounded-full bg-gray-600 transition-colors"></div>
    <div class="feature-dot w-3 h-3 rounded-full bg-gray-600 transition-colors"></div>
  </div>
</section>
```

### Key Details

1. **`overflow-hidden` on section** - Prevents horizontal scrollbar from appearing during the pan
2. **`min-w-[100vw]` on cards** - Each card is exactly viewport width
3. **`trackWidth` calculation** - `track.scrollWidth - window.innerWidth` gives the exact distance to scroll
4. **Dynamic `end` value** - `+=${trackWidth}` means the scroll distance equals the track width. Each card gets equal scroll time.
5. **`scrub: 1`** - Smooth horizontal movement tied to scroll position
6. **Progress indicator** - 4 dots at the bottom, active dot highlights current card. Helps users understand they're in a multi-step section.

### Mobile Considerations

**Option A: Disable on mobile, stack vertically** (RECOMMENDED)

```javascript
if (window.innerWidth < 768) {
  // Don't pin, let cards stack naturally
  return;
}
```

Horizontal scroll hijack on touch devices often conflicts with native swipe gestures and feels janky. Stack vertically on mobile for better UX.

### Reduced Motion Fallback

If `prefers-reduced-motion` is enabled:
- No pinning
- No horizontal scroll
- Cards stack vertically in a standard grid
- Normal scroll behavior

---

## HowItWorks Section (Sticky-Stack)

### Behavior

The 3 steps stack on top of each other as you scroll. Each step pins at the viewport top, and the next step slides up over it:
- Step 1 pins, Step 2 slides up and covers it
- Step 2 pins, Step 3 slides up and covers it
- Step 3 does not pin (last item)

As each step is covered:
- It scales down to 0.92
- It fades to 0.55 opacity
- Creates a "stacking cards" effect

### ScrollTrigger Config

```javascript
gsap.context(() => {
  const steps = gsap.utils.toArray('.how-step');
  
  steps.forEach((step, i) => {
    if (i === steps.length - 1) return; // Last step doesn't pin
    
    ScrollTrigger.create({
      trigger: step,
      start: 'top top',
      endTrigger: steps[steps.length - 1],
      end: 'top top',
      pin: true,
      pinSpacing: false, // Steps overlap, no extra spacing
    });
    
    // Scale down and fade as next step covers it
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
```

### HTML Structure

```astro
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
```

### Key Details

1. **`sticky top-0`** on steps 1 and 2 - They stick to the viewport top while the next step scrolls over them
2. **`pinSpacing: false`** - Steps overlap without adding extra vertical space. Without this, each pinned step would add 100vh of spacing.
3. **`endTrigger: steps[steps.length - 1]`** - Step 1 stays pinned until Step 3 reaches the top. Step 2 stays pinned until Step 3 reaches the top.
4. **Scale + fade transform** - As the next step covers the current one, it scales to 0.92 and fades to 0.55. Creates the "stacking cards" visual.
5. **Last step doesn't pin** - Step 3 is the final step, so it doesn't need to stay pinned. It scrolls away normally.

### Reduced Motion Fallback

If `prefers-reduced-motion` is enabled:
- No sticky positioning
- No scale/fade transforms
- Steps stack vertically with normal scroll
- Each step is a full-height section, one after another

---

## Scroll-Reveal Sections

### Behavior

The remaining 5 sections (ProblemSolution, Showcase, SocialProof, FAQ, FinalCTA) use a lighter scroll-reveal animation. As each section enters the viewport:
- Child elements fade in from `opacity: 0` to `opacity: 1`
- They translate upward from `y: 40px` to `y: 0`
- Elements stagger with a 0.06s delay between each item
- Animation triggers once when the section is 30% visible

### ScrollTrigger Config

```javascript
gsap.context(() => {
  const items = gsap.utils.toArray('#component-root .reveal-item');
  
  gsap.from(items, {
    opacity: 0,
    y: 40,
    duration: 0.8,
    stagger: 0.06,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '#component-root',
      start: 'top 70%', // Trigger when section is 30% visible
      toggleActions: 'play none none none', // Play once on enter
    }
  });
}, '#component-root');
```

### HTML Structure Pattern

Each scroll-reveal component wraps animatable elements with a `.reveal-item` class:

```astro
<section id="showcase" class="px-6 py-24">
  <div class="max-w-7xl mx-auto">
    <h2 class="reveal-item text-3xl md:text-4xl font-bold tracking-tight mb-12 text-center">
      See PiDash in action
    </h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div class="reveal-item rounded-lg overflow-hidden border border-white/10">
        <img src="/screenshots/dashboard.webp" alt="Dashboard view" loading="lazy" />
      </div>
      <div class="reveal-item rounded-lg overflow-hidden border border-white/10">
        <img src="/screenshots/terminal.webp" alt="Terminal output" loading="lazy" />
      </div>
      <div class="reveal-item rounded-lg overflow-hidden border border-white/10">
        <img src="/screenshots/github.webp" alt="GitHub integration" loading="lazy" />
      </div>
      <div class="reveal-item rounded-lg overflow-hidden border border-white/10">
        <img src="/screenshots/settings.webp" alt="Settings panel" loading="lazy" />
      </div>
    </div>
  </div>
</section>
```

### Sections Using This Pattern

1. **ProblemSolution** - Headline, problem description, solution description (3 items)
2. **Showcase** - Headline + 4 screenshot cards (5 items)
3. **SocialProof** - Headline + logo wall (2 items, logos fade in as a group)
4. **FAQ** - Headline + accordion items (N items, staggered)
5. **FinalCTA** - Headline, subtext, CTA button (3 items)

### Key Details

1. **`start: 'top 70%'`** - Animation triggers when the section top is at 70% of the viewport height (30% visible). Feels natural.
2. **`toggleActions: 'play none none none'`** - Play on enter, do nothing on leave/enter-back. Animation plays once.
3. **`stagger: 0.06`** - 60ms delay between each item. Fast enough to feel smooth, slow enough to see the stagger.
4. **`y: 40`** - Elements start 40px below their final position. Subtle upward motion, not dramatic.
5. **`ease: 'power2.out'`** - Decelerating ease. Starts fast, slows down at the end. Feels natural.

### Reduced Motion Fallback

If `prefers-reduced-motion` is enabled:
- No fade-in animation
- No upward translation
- Elements render at full opacity, final position
- Static layout, no scroll-triggered motion

---

## Accessibility & Performance

### Reduced Motion Strategy

**Global check** in ScrollSetup.astro gates ALL animations:

```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  // Initialize Lenis + GSAP
}
```

If reduced motion is enabled:
- Lenis smooth scrolling is disabled (native scroll)
- All GSAP ScrollTrigger animations are skipped
- Page renders as a static layout with no motion
- Horizontal Features section falls back to vertical stack
- Sticky-stack HowItWorks falls back to normal vertical sections

**Per-component fallbacks:**
- Each component checks `prefersReducedMotion` before initializing animations
- CSS media queries provide fallback styles for mobile/reduced-motion

### Performance Guardrails

**1. `will-change` discipline**
- Only apply `will-change: transform` to elements that actually animate
- Hero screenshot, features track, howItWorks steps get it
- Scroll-reveal items do NOT get it (too many elements, would bloat compositor layers)

**2. Animate only `transform` and `opacity`**
- Never animate `top`, `left`, `width`, `height` (triggers layout recalculation)
- All GSAP animations use `x`, `y`, `scale`, `opacity` only

**3. Lenis + GSAP sync**
- `gsap.ticker.lagSmoothing(0)` - Canonical sync, prevents jitter
- `lenis.on('scroll', ScrollTrigger.update)` - Keeps ScrollTrigger in sync with smooth scroll

**4. ScrollTrigger optimization**
- `invalidateOnRefresh: true` - Recalculates on resize (important for responsive layouts)
- `pinSpacing: false` on sticky-stack - Prevents extra vertical space
- Horizontal pan uses `end: () => "+=${trackWidth}"` - Dynamic calculation, not hardcoded

**5. Image optimization**
- Hero screenshot: `loading="eager"` (above the fold)
- All other images: `loading="lazy"` (below the fold)
- Use WebP format for all screenshots (already in place)

**6. Bundle size**
- GSAP + ScrollTrigger: ~120KB
- Lenis: ~30KB
- Total addition: ~150KB
- Acceptable for a marketing page with heavy scrollytelling

### Browser Support

**GSAP 3.12+:**
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- IE11 not supported (but we don't care about IE11)

**Lenis:**
- Works in all modern browsers
- Falls back to native scroll if JS is disabled

**CSS features:**
- `min-h-[100dvh]` - Dynamic viewport height (iOS Safari fix)
- `aspect-video` - Modern browsers only (fallback: explicit height)
- `sticky` - All modern browsers

### Testing Checklist

Before shipping, verify:
- [ ] Reduced motion: disable in OS settings, confirm no animations play
- [ ] Mobile: horizontal features section stacks vertically
- [ ] Mobile: sticky-stack works (or falls back gracefully)
- [ ] Resize: scroll triggers recalculate correctly
- [ ] Performance: Lighthouse score > 90 on Performance
- [ ] Accessibility: keyboard navigation works (tab through CTAs)
- [ ] Cross-browser: test in Chrome, Firefox, Safari

---

## Summary

This design transforms the PiDash landing page into a cinematic scrollytelling experience with:

- **Pinned hero** with parallax dashboard screenshot
- **Horizontal-scrolling features** with progress indicator
- **Sticky-stack how-it-works** steps
- **Scroll-reveal** on all other sections
- **Lenis smooth scrolling** throughout
- **Full reduced-motion support**
- **Mobile-optimized** fallbacks

**Estimated implementation time:** 12-16 hours  
**Bundle addition:** ~150KB  
**Browser support:** All modern browsers
