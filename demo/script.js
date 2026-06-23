// ============================================================
// Lenis Smooth Scroll Setup
// ============================================================
const lenis = new Lenis({
    duration: 1.4,          // Độ dài của inertia (s) — càng cao càng mượt/chậm
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Expo ease out
    orientation: 'vertical',
    smoothWheel: true,
});

// Kết nối Lenis với GSAP ticker để chúng chạy cùng nhau
gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// ============================================================
// Main Animation Timeline
// ============================================================
window.addEventListener("load", () => {
    // Delay 1.5s for video recording to catch the start
    setTimeout(() => {
        const tl = gsap.timeline();

        // 1. Heading 1
        tl.to('.heading-text', {
            y: '0%',
            duration: 1.8,
            ease: 'power4.out',
            stagger: 0.15
        }, 0); 

        // 2. "Lạng Sơn" Location
        gsap.set('.location', { filter: 'blur(10px)', opacity: 0 });
        tl.to('.location', {
            filter: 'blur(0px)',
            opacity: 1,
            duration: 0.6
        }, 0.6); 

        // 3. Description
        tl.to('.desc-text', {
            y: '0%',
            duration: 1,
            ease: 'power4.out',
            stagger: 0.15
        }, 0.6); 

        // 4. Line gradient ngang và shape hình bát giác
        gsap.set('.large-octagon-frame, .horizontal-gradient-line', { filter: 'blur(15px)', opacity: 0 });
        tl.to('.large-octagon-frame, .horizontal-gradient-line', {
            filter: 'blur(0px)',
            opacity: 1,
            duration: 0.6
        }, 1.6); 

        // 5. Header navigation
        gsap.set('.header', { y: '-100%', opacity: 0 });
        tl.to('.header', {
            y: '0%',
            opacity: 1,
            duration: 1,
            ease: 'power3.out'
        }, 1.6);
        
        // ====================================================================
        // ScrollTrigger Reveal Animation (hoạt động cùng Lenis)
        // ====================================================================
        gsap.registerPlugin(ScrollTrigger);

        // Quan trọng: Kết nối ScrollTrigger với Lenis để scrub chạy mượt
        lenis.on('scroll', ScrollTrigger.update);

        const revealTl = gsap.timeline({
            scrollTrigger: {
                trigger: ".animation-container",
                start: "top top",
                end: "+=200%", // 200% scroll distance for the effect
                pin: true,     // Pin the hero section during animation
                scrub: 1,      // Smooth scrubbing
            }
        });

        // 1. Reveal the small octagon mask
        revealTl.to(".reveal-wrapper", {
            width: "150px",
            height: "150px",
            duration: 1,
            ease: "power2.out"
        });

        // 2. Expand it massively to cover the whole screen
        revealTl.to(".reveal-wrapper", {
            width: "350vmax",
            height: "350vmax",
            duration: 3,
            ease: "power2.inOut"
        });

    }, 1500); 
});
