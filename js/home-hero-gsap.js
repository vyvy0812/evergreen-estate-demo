/**
 * Hero GSAP — line mask + blur (homepage).
 * `querySelectorAll('[data-hero-anim]')` theo thứ tự DOM; mỗi phần tử bắt đầu cách nhau 0.2s.
 * Bricks — custom attribute:
 * - data-hero-anim="heading" | "location" | "description"
 */
(function () {
	'use strict';

	/**
	 * Tách nội dung text thành từng dòng theo bố cục hiện tại, bọc mask overflow.
	 * @param {HTMLElement} el
	 * @returns {HTMLElement[]} Các node .hero-line-inner để animate
	 */
	function splitIntoLineMasks(el) {
		if (!el || el.querySelector('.hero-line-mask')) {
			return Array.from(el.querySelectorAll('.hero-line-inner'));
		}

		const plain = el.textContent.replace(/\s+/g, ' ').trim();
		if (!plain) {
			return [];
		}

		const words = plain.split(' ');
		el.textContent = '';

		const wordSpans = [];
		words.forEach(function (word, i) {
			const span = document.createElement('span');
			span.textContent = word + (i < words.length - 1 ? '\u00A0' : '');
			span.style.display = 'inline-block';
			el.appendChild(span);
			wordSpans.push(span);
		});

		const lineGroups = [];
		let current = [];
		let lastTop = null;

		wordSpans.forEach(function (span) {
			const top = span.offsetTop;
			if (lastTop !== null && top !== lastTop) {
				lineGroups.push(current);
				current = [];
			}
			current.push(span.textContent.replace(/\u00A0/g, ' ').trim());
			lastTop = top;
		});
		if (current.length) {
			lineGroups.push(current);
		}

		el.textContent = '';
		const inners = [];

		lineGroups.forEach(function (group) {
			const lineText = group.join(' ').replace(/\s+/g, ' ').trim();
			if (!lineText) {
				return;
			}

			const mask = document.createElement('span');
			mask.className = 'hero-line-mask';
			mask.style.display = 'block';
			mask.style.overflow = 'hidden';

			const inner = document.createElement('span');
			inner.className = 'hero-line-inner';
			inner.style.display = 'inline-block';
			inner.textContent = lineText;

			mask.appendChild(inner);
			el.appendChild(mask);
			inners.push(inner);
		});

		return inners;
	}

	/**
	 * Animate mask từng dòng (reveal từ dưới lên).
	 * @param {HTMLElement} el
	 * @param {object} opts
	 * @param {number} [opts.duration]
	 * @param {number} [opts.stagger]
	 * @param {string} [opts.ease]
	 * @param {number} [opts.delay] — delay trong timeline cha
	 * @returns {gsap.core.Tween | gsap.core.Timeline}
	 */
	function animateLineMask(el, opts) {
		opts = opts || {};
		var duration = opts.duration != null ? opts.duration : 1;
		var stagger = opts.stagger != null ? opts.stagger : 0.08;
		var ease = opts.ease || 'power4.out';
		var delay = opts.delay != null ? opts.delay : 0;

		var inners = splitIntoLineMasks(el);
		if (!inners.length) {
			return gsap.timeline();
		}

		gsap.set(inners, { yPercent: 100 });

		return gsap.to(inners, {
			yPercent: 0,
			duration: duration,
			ease: ease,
			stagger: stagger,
			delay: delay,
		});
	}

	/**
	 * Blur nhẹ + fade (cho tên địa danh).
	 */
	function animateBlurReveal(el, opts) {
		opts = opts || {};
		var duration = opts.duration != null ? opts.duration : 0.6;
		var delay = opts.delay != null ? opts.delay : 0;

		if (!el) {
			return gsap.timeline();
		}

		gsap.set(el, {
			opacity: 0,
			filter: 'blur(10px)',
			willChange: 'opacity, filter',
		});

		return gsap.to(el, {
			opacity: 1,
			filter: 'blur(0px)',
			duration: duration,
			ease: 'power2.out',
			delay: delay,
			onComplete: function () {
				gsap.set(el, { clearProps: 'willChange' });
			},
		});
	}

	/**
	 * Chạy tất cả `[data-hero-anim]` theo thứ tự DOM; mỗi phần tử lệch nhau 0.2s.
	 */
	function initHomeHeroAnimations() {
		if (typeof gsap === 'undefined') {
			return;
		}

		var elements = document.querySelectorAll('[data-hero-anim]');
		if (!elements.length) {
			return;
		}

		var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
		var step = 0.2;

		elements.forEach(function (el, index) {
			var role = el.getAttribute('data-hero-anim');
			var delay = index * step;

			if (role === 'heading') {
				tl.add(
					animateLineMask(el, {
						duration: 1.8,
						stagger: 0.06,
						ease: 'power4.out',
						delay: delay,
					}),
					0
				);
			} else if (role === 'location') {
				tl.add(
					animateBlurReveal(el, {
						duration: 0.6,
						delay: delay,
					}),
					0
				);
			} else if (role === 'description') {
				tl.add(
					animateLineMask(el, {
						duration: 1,
						stagger: 0.06,
						ease: 'power4.out',
						delay: delay,
					}),
					0
				);
			}
		});
	}

	function initHomepageOctagonAnimation() {
		if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
			return;
		}

		// Guard: only run once
		if (document.getElementById('homepageOctagonWrapper')) {
			return;
		}

		var section1 = document.querySelector('section.brxe-epozwv.eve-section-title');
		if (!section1) {
			return;
		}

		// Find the background image URL from the second section's image
		var section2Img = document.querySelector('#brxe-fhkljb');
		var bgUrl = '';
		if (section2Img) {
			bgUrl = section2Img.getAttribute('data-src') || section2Img.currentSrc || section2Img.src || '';
		}

		// Fallback to Bricks inline background-image style
		if (!bgUrl || bgUrl.indexOf('data:image') !== -1) {
			var inlineStyle = section1.getAttribute('style') || '';
			var bgMatch = inlineStyle.match(/background-image:\s*url\(["']?([^"')]+)["']?\)/i);
			if (bgMatch) {
				bgUrl = bgMatch[1];
			}
		}

		// Create expanding octagon wrapper in Section 1
		var octWrapper = document.createElement('div');
		octWrapper.className = 'homepage-octagon-wrapper';
		octWrapper.id = 'homepageOctagonWrapper';

		var expandingBg = document.createElement('div');
		expandingBg.className = 'homepage-expanding-bg';
		expandingBg.id = 'homepageExpandingBg';
		if (bgUrl && bgUrl.indexOf('data:image') === -1) {
			expandingBg.style.backgroundImage = 'url("' + bgUrl + '")';
		}
		// Make it exactly viewport size so scaling it makes it visibly smaller than the screen
		expandingBg.style.width = '100vw';
		expandingBg.style.height = '100vh';

		// Ensure section1 stays behind section2
		section1.style.position = 'relative';
		section1.style.zIndex = '1';
		section1.style.overflow = 'hidden'; // Ngăn chặn wrapper 150vmax tràn xuống che section bên dưới
		section1.style.height = '100vh';
		section1.style.maxHeight = '100vh';

		var section2 = document.querySelector('#brxe-lfnwiw');

		if (section2) {
			// Ensure it sits above the expanding background and section1
			section2.style.position = 'relative';
			section2.style.setProperty('z-index', '99', 'important');

			// Hide the section2 image to avoid it sliding over the octagon
			var sec2Img = section2.querySelector('#brxe-fhkljb');
			if (sec2Img) {
				sec2Img.style.setProperty('display', 'none', 'important');
			}
		}

		// Intro elements that sit above the expanding bg (z-index: 3)
		var introText = section1.querySelector('.brxe-hnapdz');
		var octagonOutline = section1.querySelector('.oo-root.octagon-keep-indicator');
		var extraSvg1 = section1.querySelector('svg.brxe-qgdhaz');
		var extraSvg2 = section1.querySelector('.oo-stage > svg');

		octWrapper.appendChild(expandingBg);
		section1.appendChild(octWrapper);




		function updateOctagon(r) {
			var c1 = 0.9238795;
			var c2 = 0.3826834;
			var p1 = (50 + r * c1) + '% ' + (50 - r * c2) + '%';
			var p2 = (50 + r * c2) + '% ' + (50 - r * c1) + '%';
			var p3 = (50 - r * c2) + '% ' + (50 - r * c1) + '%';
			var p4 = (50 - r * c1) + '% ' + (50 - r * c2) + '%';
			var p5 = (50 - r * c1) + '% ' + (50 + r * c2) + '%';
			var p6 = (50 - r * c2) + '% ' + (50 + r * c1) + '%';
			var p7 = (50 + r * c2) + '% ' + (50 + r * c1) + '%';
			var p8 = (50 + r * c1) + '% ' + (50 + r * c2) + '%';
			octWrapper.style.clipPath = 'polygon(' + p1 + ', ' + p2 + ', ' + p3 + ', ' + p4 + ', ' + p5 + ', ' + p6 + ', ' + p7 + ', ' + p8 + ')';
		}

		updateOctagon(0);

		var lengthVh = 2.8;

		var pinDuration = Math.round(window.innerHeight * lengthVh);

		if (section2) {
			var safeMarginUpdate2 = function() {
				var maxPull = window.innerHeight * 1.5;
				var safePull = Math.max(0, Math.min(maxPull, section2.offsetHeight - window.innerHeight * 0.1));
				section2.style.marginTop = -safePull + 'px';
			};
			safeMarginUpdate2();
			window.addEventListener('resize', safeMarginUpdate2);
			if (typeof ResizeObserver !== 'undefined') {
				new ResizeObserver(safeMarginUpdate2).observe(section2);
			}

			// Set solid background to ensure no transparent gaps when section1 scrolls away
			section2.style.backgroundColor = 'transparent'; // Let the user's CSS handle this
		}

		var tl = gsap.timeline({
			scrollTrigger: {
				trigger: section1,
				refreshPriority: 10,
				start: 'top top',
				end: function() {
					return '+=' + pinDuration;
				},
				pin: true,
				pinSpacing: true,
				anticipatePin: 1,
				invalidateOnRefresh: true,
				onUpdate: function(self) {
					var progress = self.progress;

					// Fade out intro text & outline & SVGs (10% → 20%)
					if (progress >= 0.20) {
						if (introText) introText.style.opacity = 0;
						if (octagonOutline) octagonOutline.style.opacity = 0;
						if (extraSvg1) extraSvg1.style.opacity = 0;
						if (extraSvg2) extraSvg2.style.opacity = 0;
					} else if (progress > 0.10) {
						var fadeProg = (progress - 0.10) / 0.10;
						if (introText) introText.style.opacity = (1 - fadeProg);
						if (octagonOutline) octagonOutline.style.opacity = (1 - fadeProg);
						if (extraSvg1) extraSvg1.style.opacity = (1 - fadeProg);
						if (extraSvg2) extraSvg2.style.opacity = (1 - fadeProg);
					} else {
						if (introText) introText.style.opacity = 1;
						if (octagonOutline) octagonOutline.style.opacity = 1;
						if (extraSvg1) extraSvg1.style.opacity = 1;
						if (extraSvg2) extraSvg2.style.opacity = 1;
					}

					// Octagon Expansion (10% → 50%)
					var r = 0;
					if (progress > 0.10) {
						var clipProg = Math.min(1, (progress - 0.10) / 0.40);
						r = clipProg * 100;
					}
					updateOctagon(r);

					// Image Scaling (25% → 75%)
					var scaleProg = 0;
					if (progress > 0.75) {
						scaleProg = 1;
					} else if (progress > 0.25) {
						scaleProg = (progress - 0.25) / 0.50;
					}
					var easeScale = scaleProg < 0.5 ? 2 * scaleProg * scaleProg : 1 - Math.pow(-2 * scaleProg + 2, 2) / 2;
					var currentScale = 0.8 + (0.2 * easeScale);
					expandingBg.style.transform = 'translate(-50%, -50%) scale(' + currentScale + ')';

					// Blur & fade background image (50% → 85%)
					if (progress >= 0.85) {
						var fadeProg = Math.min(1, (progress - 0.85) / 0.15);
						expandingBg.style.opacity = 1 - fadeProg;
						expandingBg.style.filter = 'blur(25px) brightness(0.55)';
						octWrapper.style.backgroundColor = '#23110a';
					} else if (progress >= 0.50) {
						var blurProg = Math.min(1, (progress - 0.50) / 0.35);
						var blurVal = Math.round(blurProg * 25);
						var bright = (1 - blurProg * 0.45).toFixed(2);
						expandingBg.style.opacity = 1;
						expandingBg.style.filter = 'blur(' + blurVal + 'px) brightness(' + bright + ')';
						octWrapper.style.backgroundColor = '#23110a';
					} else {
						expandingBg.style.opacity = '1';
						expandingBg.style.filter = 'none';
						octWrapper.style.backgroundColor = 'transparent';
					}
				}
			}
		});

		// Force ScrollTrigger to sort and refresh so that independent-scroll-gsap.js 
		// recalculates its triggers correctly after section2 is pushed down and margin is applied.
		setTimeout(function() {
			if (typeof ScrollTrigger !== 'undefined') {
				if (typeof ScrollTrigger.sort === 'function') {
					ScrollTrigger.sort();
				}
				ScrollTrigger.refresh(true); // force full refresh
			}
		}, 100);
	}

	document.addEventListener('evergreen-preload-done', () => {
		setTimeout(() => {
			initHomeHeroAnimations();
			initHomepageOctagonAnimation();
		}, 3500);
	});

	// if (document.readyState === 'loading') {
	// 	document.addEventListener('DOMContentLoaded', initHomeHeroAnimations);
	// } else {
	// 	initHomeHeroAnimations();
	// }
})();
