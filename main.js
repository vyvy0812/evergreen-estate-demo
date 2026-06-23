/* ─────────────────────────────────────────────
   EVERGREEN ESTATE — MAIN JS
   GSAP ScrollTrigger Pinned Sections & Reveal
   2 Chapters Demo
───────────────────────────────────────────── */

// 1. REGISTER PLUGINS
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* ══════════════════════════════════════════════
   2. PARTICLES CANVAS
   (Maintained from original implementation)
══════════════════════════════════════════════ */
(function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx    = canvas.getContext('2d');
  let W, H, pts = [];

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 120; i++) {
    pts.push({
      x: Math.random() * (W || 1200),
      y: Math.random() * (H || 800),
      r: Math.random() * 1.2 + 0.2,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      a:  Math.random() * 0.5 + 0.1,
    });
  }

  (function draw() {
    ctx.clearRect(0, 0, W, H);
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,169,110,${p.a})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    });
    requestAnimationFrame(draw);
  })();
})();

/* ══════════════════════════════════════════════
   3. HERO ENTRANCE ANIMATION (On Load)
══════════════════════════════════════════════ */
const heroTl = gsap.timeline({ delay: 0.4 });

heroTl.fromTo('#oct-outer',
  { strokeDasharray: 2000, strokeDashoffset: 2000 },
  { strokeDashoffset: 0, duration: 2.2, ease: 'power2.out' }, 0);

heroTl.fromTo('#oct-inner',
  { strokeDasharray: 1800, strokeDashoffset: 1800 },
  { strokeDashoffset: 0, duration: 2.2, ease: 'power2.out' }, 0.3);

heroTl.fromTo('.deco-line',
  { scaleX: 0, transformOrigin: 'center' },
  { scaleX: 1, duration: 1.2, ease: 'power2.out' }, 0.8);

heroTl.fromTo('.slide-counter',
  { opacity: 0, y: 10 },
  { opacity: 1, y: 0,  duration: 0.8, ease: 'power3.out' }, 1.1);

heroTl.fromTo('.hero-line',
  { opacity: 0, y: 32, filter: 'blur(12px)' },
  { opacity: 1, y: 0,  filter: 'blur(0px)', duration: 1.2,
    stagger: 0.2, ease: 'power3.out' }, 1.3);

heroTl.fromTo('.progress-bar-wrap',
  { opacity: 0, y: -10 },
  { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 1.6);

/* Floating octagon animation (Runs independently to avoid scroll trigger conflicts) */
gsap.to('#octagon-container', {
  y: -12, duration: 3.5, ease: 'sine.inOut', repeat: -1, yoyo: true,
});

/* ══════════════════════════════════════════════
   4. SCROLLTRIGGER: GLOBAL PROGRESS BAR & NAV
══════════════════════════════════════════════ */
// Progress bar fill & dot tracked along total page height
gsap.to('#progress-fill', {
  width: '100%',
  ease: 'none',
  scrollTrigger: {
    trigger: 'body',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
  }
});

gsap.to('#progress-dot', {
  left: '100%',
  ease: 'none',
  scrollTrigger: {
    trigger: 'body',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
  }
});

// Navbar background style transition
ScrollTrigger.create({
  start: 'top -50px',
  onEnter: () => document.getElementById('navbar').classList.add('scrolled'),
  onLeaveBack: () => document.getElementById('navbar').classList.remove('scrolled'),
});

/* ══════════════════════════════════════════════
   5. SCROLLTRIGGER: CHAPTER 1 PINNING & PARALLAX
══════════════════════════════════════════════ */
const ch1ScrollTl = gsap.timeline({
  scrollTrigger: {
    trigger: '#hero',
    start: 'top top',
    end: '+=100%',
    pin: true,
    scrub: true,
  }
});

// Fade and shift elements as user scrolls down Chapter 1
ch1ScrollTl.to('#hero-center', {
  opacity: 0,
  y: -60,
  ease: 'power1.inOut'
}, 0);

ch1ScrollTl.to('.deco-line-top', {
  y: -40,
  opacity: 0,
  ease: 'power1.inOut'
}, 0);

ch1ScrollTl.to('.deco-line-bottom', {
  y: 40,
  opacity: 0,
  ease: 'power1.inOut'
}, 0);

/* ══════════════════════════════════════════════
   6. SCROLLTRIGGER: CHAPTER 2 REVEAL & CLIP PATH
══════════════════════════════════════════════ */
const ch2ScrollTl = gsap.timeline({
  scrollTrigger: {
    trigger: '#reveal-section',
    start: 'top top',
    end: '+=150%',
    pin: true,
    scrub: true,
    onUpdate: (self) => {
      const img = document.getElementById('reveal-image');
      const txt = document.getElementById('reveal-content');
      if (self.progress >= 0.95) {
        img.style.filter = 'none';
        txt.style.filter = 'none';
      }
    }
  }
});

// Animate clip-path to open up the octagon mask into fullscreen
ch2ScrollTl.to('#reveal-clip', {
  clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 100% 100%, 100% 100%, 0% 100%, 0% 100%, 0% 0%)',
  ease: 'power2.inOut'
}, 0);

// Fade out dark overlay to reveal clear image
ch2ScrollTl.to('#reveal-overlay', {
  opacity: 0,
  ease: 'power1.inOut'
}, 0);

// Scale image down slightly and transition filter blur from 20px to 0px
ch2ScrollTl.fromTo('#reveal-image', {
  filter: 'blur(20px)',
  scale: 1.05
}, {
  filter: 'blur(0px)',
  scale: 1.0,
  ease: 'power1.inOut'
}, 0);

// Fade in subtitle content overlay with blur transition 10px -> 0px
ch2ScrollTl.fromTo('#reveal-content', {
  opacity: 0,
  filter: 'blur(10px)',
  y: 30
}, {
  opacity: 1,
  filter: 'blur(0px)',
  y: 0,
  ease: 'power2.out'
}, 0.3);

// Fade in chapter label towards the end of the scroll trigger
ch2ScrollTl.to('#chapter-label', {
  opacity: 1,
  ease: 'power2.out'
}, 0.7);

/* ══════════════════════════════════════════════
   7. BACK TO TOP (Contact Button Action)
══════════════════════════════════════════════ */
document.getElementById('btn-contact').addEventListener('click', () => {
  gsap.to(window, {
    scrollTo: 0,
    duration: 1.5,
    ease: 'power3.inOut'
  });
});

// Reset scroll positions on reload
window.addEventListener('beforeunload', () => {
  window.scrollTo(0, 0);
});
