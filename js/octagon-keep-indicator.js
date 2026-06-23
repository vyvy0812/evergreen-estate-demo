/**
 * [octagon_keep_indicator] → [data-octagon-keep-indicator]
 */
(function () {
	'use strict';

	const SVG_NS = 'http://www.w3.org/2000/svg';
	// const CORNERS = [
	// 	{ x: 133, y: 10 },
	// 	{ x: 247, y: 10 },
	// 	{ x: 345, y: 80 },
	// 	{ x: 345, y: 260 },
	// 	{ x: 247, y: 330 },
	// 	{ x: 133, y: 330 },
	// 	{ x: 35, y: 260 },
	// 	{ x: 35, y: 80 },
	// ];

	const CORNERS = [
		{ x: 304.298, y: 67.626 },
		{ x: 637.599, y: 68.207 },
		{ x: 872.867, y: 304.298 },
		{ x: 872.286, y: 637.599 },
		{ x: 636.195, y: 872.867 },
		{ x: 302.893, y: 872.286 },
		{ x: 67.625, y: 636.195 },
		{ x: 68.207, y: 302.894 },
	];

	const LABELS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
	const SIDE_DUR = 0.5;
	const STAGGER = 0.22;
	const EASE = 'power1.inOut';
	const GOLD = '#c8a05a';
	/** Dashed look for layer 2; trim is driven by `maskLine` (same dashoffset as `el`). */
	const SIDE2_DASH_LEN = 3;
	const SIDE2_GAP_LEN = 3;
	const MASK_LINE_STROKE = 22;
	const VIEWPORT_IO = { threshold: 0.15, rootMargin: '0px 0px -8% 0px' };
	const AUTOPLAY_DELAY_MS = 500;

	/** @type {Map<Element, { inView: boolean, timer: ReturnType<typeof setTimeout> | null, play: () => void }>} */
	const autoplayTargets = new Map();
	let scrollDir = 'down';
	let lastScrollY = window.scrollY;
	let viewportObserver = null;
	let scrollEngineReady = false;
	let scrollRafPending = false;

	function prefersReducedMotion() {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function clearAutoplayTimer(ctx) {
		if (ctx.timer) {
			clearTimeout(ctx.timer);
			ctx.timer = null;
		}
	}

	function unregisterAutoplay(root) {
		const ctx = autoplayTargets.get(root);
		if (ctx) {
			clearAutoplayTimer(ctx);
		}
		autoplayTargets.delete(root);
		viewportObserver?.unobserve(root);
		if (!autoplayTargets.size && viewportObserver) {
			viewportObserver.disconnect();
			viewportObserver = null;
		}
	}

	function scheduleAutoplay(root) {
		const ctx = autoplayTargets.get(root);
		if (!ctx || ctx.timer) {
			return;
		}
		if (!ctx.inView || scrollDir !== 'down') {
			return;
		}

		ctx.timer = setTimeout(() => {
			ctx.timer = null;
			if (!autoplayTargets.has(root) || !ctx.inView || scrollDir !== 'down') {
				return;
			}
			ctx.play();
			unregisterAutoplay(root);
		}, AUTOPLAY_DELAY_MS);
	}

	function syncAutoplayTargets() {
		autoplayTargets.forEach((ctx, root) => {
			if (scrollDir === 'up') {
				clearAutoplayTimer(ctx);
			} else if (ctx.inView) {
				scheduleAutoplay(root);
			}
		});
	}

	function ensureAutoplayEngine() {
		if (scrollEngineReady) {
			return;
		}
		scrollEngineReady = true;

		window.addEventListener(
			'scroll',
			() => {
				const y = window.scrollY;
				if (y > lastScrollY) {
					scrollDir = 'down';
				} else if (y < lastScrollY) {
					scrollDir = 'up';
				}
				lastScrollY = y;

				if (!autoplayTargets.size || scrollRafPending) {
					return;
				}
				scrollRafPending = true;
				requestAnimationFrame(() => {
					scrollRafPending = false;
					syncAutoplayTargets();
				});
			},
			{ passive: true }
		);

		if (!('IntersectionObserver' in window)) {
			return;
		}

		viewportObserver = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				const ctx = autoplayTargets.get(entry.target);
				if (!ctx) {
					continue;
				}
				ctx.inView = entry.isIntersecting;
				if (entry.isIntersecting && scrollDir === 'down') {
					scheduleAutoplay(entry.target);
				} else if (scrollDir === 'up') {
					clearAutoplayTimer(ctx);
				}
			}
		}, VIEWPORT_IO);
	}

	function registerAutoplay(root, play) {
		ensureAutoplayEngine();

		if (prefersReducedMotion()) {
			play();
			return;
		}

		autoplayTargets.set(root, { inView: false, timer: null, play });

		if (viewportObserver) {
			viewportObserver.observe(root);
			return;
		}

		play();
	}

	function initRoot(root) {
		if (root.dataset.octagonKeepReady === '1') {
			return;
		}
		if (typeof gsap === 'undefined') {
			return;
		}

		root.dataset.octagonKeepReady = '1';

		const sidesGroup = root.querySelector('[data-oo-sides]');
		const sidesGroup2 = root.querySelector('[data-oo-sides-2]');
		const stepRow = root.querySelector('[data-oo-steps]');
		const dot = root.querySelector('[data-oo-dot]');
		const controls = root.querySelector('[data-oo-controls]');

		if (!sidesGroup || !sidesGroup2 || !dot) {
			return;
		}

		let lines = [];
		let stepBtns = [];
		let tl = null;

		function setStepState(activeIdx) {
			if (!stepBtns.length) {
				return;
			}
			stepBtns.forEach((btn, i) => {
				btn.className =
					i < activeIdx ? 'sbtn done' : i === activeIdx ? 'sbtn active' : 'sbtn';
			});
		}

		const maskPrefix =
			root.getAttribute('data-oo-mask-prefix') ||
			('oo' + Math.random().toString(36).slice(2, 10));
		root.setAttribute('data-oo-mask-prefix', maskPrefix);

		function buildSides() {
			sidesGroup.replaceChildren();
			sidesGroup2.replaceChildren();

			const svg = sidesGroup.ownerSVGElement;
			if (!svg) {
				lines = [];
				return;
			}
			let defs = svg.querySelector('defs');
			if (!defs) {
				defs = document.createElementNS(SVG_NS, 'defs');
				svg.insertBefore(defs, svg.firstChild);
			}

			svg.querySelectorAll(`mask[id^="${maskPrefix}-s"]`).forEach((n) => n.remove());

			lines = CORNERS.map((a, i) => {
				const b = CORNERS[(i + 1) % CORNERS.length];
				const len = Math.hypot(b.x - a.x, b.y - a.y);
				const el = document.createElementNS(SVG_NS, 'line');
				el.setAttribute('x1', a.x);
				el.setAttribute('y1', a.y);
				el.setAttribute('x2', b.x);
				el.setAttribute('y2', b.y);
				el.setAttribute('stroke', GOLD);
				el.setAttribute('stroke-width', '1');
				el.setAttribute('stroke-linecap', 'butt');
				el.style.strokeDasharray = String(len);
				el.style.strokeDashoffset = String(len);
				el.style.opacity = '0.9';
				sidesGroup.appendChild(el);

				const maskId = `${maskPrefix}-s${i}`;
				const mask = document.createElementNS(SVG_NS, 'mask');
				mask.setAttribute('id', maskId);
				mask.setAttribute('maskUnits', 'userSpaceOnUse');
				mask.setAttribute('maskContentUnits', 'userSpaceOnUse');
				mask.setAttribute('x', '0');
				mask.setAttribute('y', '0');
				mask.setAttribute('width', '940');
				mask.setAttribute('height', '940');

				const maskLine = document.createElementNS(SVG_NS, 'line');
				maskLine.setAttribute('x1', a.x);
				maskLine.setAttribute('y1', a.y);
				maskLine.setAttribute('x2', b.x);
				maskLine.setAttribute('y2', b.y);
				maskLine.setAttribute('stroke', '#fff');
				maskLine.setAttribute('stroke-width', String(MASK_LINE_STROKE));
				maskLine.setAttribute('stroke-linecap', 'butt');
				maskLine.style.strokeDasharray = String(len);
				maskLine.style.strokeDashoffset = String(len);
				mask.appendChild(maskLine);
				defs.appendChild(mask);

				const el2 = document.createElementNS(SVG_NS, 'line');
				el2.setAttribute('x1', a.x);
				el2.setAttribute('y1', a.y);
				el2.setAttribute('x2', b.x);
				el2.setAttribute('y2', b.y);
				el2.setAttribute('stroke', 'white');
				el2.setAttribute('stroke-width', '16');
				el2.setAttribute('stroke-linecap', 'butt');
				el2.setAttribute('mask', `url(#${maskId})`);
				el2.style.strokeDasharray = `${SIDE2_DASH_LEN} ${SIDE2_GAP_LEN}`;
				el2.style.strokeDashoffset = '0';
				el2.style.opacity = '0.1';

				sidesGroup2.appendChild(el2);
				return { el, el2, maskLine, len, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
			});
		}

		function buildStepBtns() {
			if (!stepRow) {
				return;
			}
			stepRow.replaceChildren();
			stepBtns = lines.map((_, i) => {
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = 'sbtn';
				btn.textContent = 'Cạnh ' + LABELS[i];
				btn.addEventListener('click', () => playSingle(i));
				stepRow.appendChild(btn);
				return btn;
			});
		}

		function resetAnim() {
			tl?.kill();
			tl = null;
			lines.forEach(({ el, maskLine, len }) => {
				gsap.set(el, { strokeDashoffset: len });
				gsap.set(maskLine, { strokeDashoffset: len });
			});
			gsap.set(dot, { opacity: 0, attr: { cx: CORNERS[0].x, cy: CORNERS[0].y } });
			stepBtns.forEach((btn) => {
				btn.className = 'sbtn';
			});
		}

		function tweenSide(side, at) {
			tl.to(
				dot,
				{ attr: { cx: side.x2, cy: side.y2 }, duration: SIDE_DUR, ease: EASE },
				at
			);
			tl.to(side.el, { strokeDashoffset: 0, duration: SIDE_DUR, ease: EASE }, at);
			tl.to(side.maskLine, { strokeDashoffset: 0, duration: SIDE_DUR, ease: EASE }, at);
		}

		function applySideState(idx, done) {
			lines.forEach((line, i) => {
				gsap.set(line.el, { strokeDashoffset: i < idx || (i === idx && done) ? 0 : line.len });
				gsap.set(line.maskLine, {
					strokeDashoffset: i < idx || (i === idx && done) ? 0 : line.len,
				});
			});
			const side = lines[idx];
			if (done) {
				gsap.set(dot, { opacity: 1, attr: { cx: side.x2, cy: side.y2 } });
				if (stepBtns[idx]) {
					stepBtns[idx].className = 'sbtn done';
				}
				return;
			}
			gsap.set(dot, { opacity: 1, attr: { cx: side.x1, cy: side.y1 } });
		}

		function playSingle(idx, { instant = false } = {}) {
			if (tl && (tl.progress() >= 1 || tl.isActive())) {
				return;
			}

			tl?.kill();
			tl = null;
			setStepState(idx);

			if (instant) {
				applySideState(idx, true);
				return;
			}

			applySideState(idx, false);

			const side = lines[idx];
			tl = gsap.timeline({
				onComplete: () => {
					if (stepBtns[idx]) {
						stepBtns[idx].className = 'sbtn done';
					}
				},
			});
			tweenSide(side, 0);
		}

		function playAll() {
			tl?.kill();
			tl = null;
			stepBtns.forEach((btn) => {
				btn.className = 'sbtn';
			});

			lines.forEach(({ el, maskLine, len }) => {
				gsap.set(el, { strokeDashoffset: len });
				gsap.set(maskLine, { strokeDashoffset: len });
			});
			gsap.set(dot, { opacity: 1, attr: { cx: CORNERS[0].x, cy: CORNERS[0].y } });

			tl = gsap.timeline({
				onComplete: () => {
					stepBtns.forEach((btn) => {
						btn.className = 'sbtn done';
					});
				},
			});

			lines.forEach((side, i) => {
				tweenSide(side, i * STAGGER);
			});
		}

		buildSides();
		buildStepBtns();

		if (controls) {
			controls.querySelectorAll('[data-action]').forEach((btn) => {
				btn.addEventListener('click', () => {
					const action = btn.getAttribute('data-action');
					if (action === 'play-all') {
						playAll();
					} else if (action === 'reset') {
						resetAnim();
					}
				});
			});
		}

		const autoplay = root.dataset.autoplay;
		if (autoplay !== '' && autoplay != null) {
			const idx = parseInt(autoplay, 10);
			if (!Number.isNaN(idx) && idx >= 0 && idx < lines.length) {
				registerAutoplay(root, () =>
					playSingle(idx, { instant: prefersReducedMotion() })
				);
			}
		}
	}

	function boot() {
		document.querySelectorAll('[data-octagon-keep-indicator]').forEach(initRoot);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
