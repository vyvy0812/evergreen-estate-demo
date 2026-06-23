/**
 * Lenis smooth scroll + GSAP ScrollTrigger.
 *
 * Bật/tắt trong code (không cần data-attribute trên HTML):
 *   var LENIS_ENABLED = true;   // đổi thành false để tắt Lenis
 *
 * Runtime: window.EvergreenLenis.enable() | .disable() | .toggle()
 *
 * ScrollTrigger vẫn chạy khi Lenis tắt: native scroll bridge (ScrollTrigger.update)
 * + tắt CSS scroll-snap trên html (xem style.css .evergreen-lenis-inactive).
 */
(function () {
	'use strict';

	// ─── Bật/tắt Lenis tại đây ───────────────────────────────────────────────
	var LENIS_ENABLED = true;
	// Không chạy Lenis trên mobile (coarse pointer) — ScrollTrigger vẫn bình thường.
	var LENIS_SKIP_MOBILE = true;
	// Không chạy khi fullPage.js đang điều khiển homepage.
	var LENIS_SKIP_FULLPAGE = true;
	// Wheel: cao hơn = ít “trôi” (Framer không lerp wheel; ~0.22 là compromise).
	var LENIS_WHEEL_LERP = 0.5;
	// Programmatic scrollTo — khớp t.groovy SNAP_DURATION (850ms).
	var LENIS_SCROLL_TO_DURATION = 0.5;
	// ─────────────────────────────────────────────────────────────────────────

	function easeInOutCubic(t) {
		return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	}

	if (typeof Lenis === 'undefined' || typeof gsap === 'undefined') {
		return;
	}

	var lenisInstance = null;
	var lenisRaf = null;
	var lenisScrollHandler = null;
	var nativeScrollHandler = null;

	function isCoarsePointer() {
		return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
	}

	function isFullpageActive() {
		return document.body && document.body.dataset.homeFullpage === '1';
	}

	function shouldAutoStart() {
		if (!LENIS_ENABLED) {
			return false;
		}
		if (LENIS_SKIP_FULLPAGE && isFullpageActive()) {
			return false;
		}
		if (LENIS_SKIP_MOBILE && isCoarsePointer()) {
			return false;
		}
		return true;
	}

	function canBoot(options) {
		options = options || {};
		if (options.force) {
			return !(LENIS_SKIP_FULLPAGE && isFullpageActive());
		}
		if (!LENIS_ENABLED) {
			return false;
		}
		if (LENIS_SKIP_FULLPAGE && isFullpageActive()) {
			return false;
		}
		if (LENIS_SKIP_MOBILE && isCoarsePointer()) {
			return false;
		}
		return true;
	}

	function syncLenisDomState(active) {
		var root = document.documentElement;
		if (!root) {
			return;
		}
		root.classList.toggle('evergreen-lenis-active', active);
		root.classList.toggle('evergreen-lenis-inactive', !active);
		if (document.body) {
			document.body.classList.toggle('evergreen-lenis-active', active);
			document.body.classList.toggle('evergreen-lenis-inactive', !active);
		}
	}

	function refreshScrollTrigger() {
		if (typeof ScrollTrigger === 'undefined') {
			return;
		}
		if (typeof ScrollTrigger.sort === 'function') {
			ScrollTrigger.sort();
		}
		ScrollTrigger.refresh();
	}

	/**
	 * Khi Lenis tắt, ScrollTrigger snap vẫn cần update mỗi lần scroll (Lenis làm việc
	 * này qua lenis.on('scroll') khi bật). Không gắn bridge → snap GSAP không chạy.
	 */
	function enableNativeScrollTriggerBridge() {
		if (typeof ScrollTrigger === 'undefined') {
			return;
		}
		if (typeof ScrollTrigger.defaults === 'function') {
			ScrollTrigger.defaults({ ignoreMobileResize: true });
		}
		gsap.ticker.lagSmoothing(500, 33);
		if (!nativeScrollHandler) {
			nativeScrollHandler = function () {
				ScrollTrigger.update();
			};
			window.addEventListener('scroll', nativeScrollHandler, { passive: true });
		}
	}

	function disableNativeScrollTriggerBridge() {
		if (nativeScrollHandler) {
			window.removeEventListener('scroll', nativeScrollHandler);
			nativeScrollHandler = null;
		}
	}

	function setupLenisScrollerProxy(lenis) {
		if (typeof ScrollTrigger === 'undefined') {
			return;
		}
		var scroller = document.documentElement;
		ScrollTrigger.scrollerProxy(scroller, {
			scrollTop: function (value) {
				if (arguments.length) {
					lenis.scrollTo(value, { immediate: true });
				}
				return lenis.scroll;
			},
			getBoundingClientRect: function () {
				return {
					top: 0,
					left: 0,
					width: window.innerWidth,
					height: window.innerHeight,
				};
			},
		});
	}

	function clearLenisScrollerProxy() {
		if (typeof ScrollTrigger === 'undefined') {
			return;
		}
		ScrollTrigger.scrollerProxy(document.documentElement, {});
	}

	function initWithoutLenis() {
		syncLenisDomState(false);
		enableNativeScrollTriggerBridge();
		refreshScrollTrigger();
		try {
			document.dispatchEvent(new CustomEvent('evergreen-scroll-native-ready'));
		} catch (e) {
			// ignored
		}
	}

	function teardownLenis() {
		if (!lenisInstance) {
			window.evergreenLenis = null;
			initWithoutLenis();
			return false;
		}

		if (lenisScrollHandler && typeof lenisInstance.off === 'function') {
			lenisInstance.off('scroll', lenisScrollHandler);
		}
		lenisScrollHandler = null;

		if (lenisRaf) {
			gsap.ticker.remove(lenisRaf);
			lenisRaf = null;
		}

		clearLenisScrollerProxy();

		if (typeof lenisInstance.destroy === 'function') {
			lenisInstance.destroy();
		}

		lenisInstance = null;
		window.evergreenLenis = null;

		disableNativeScrollTriggerBridge();
		initWithoutLenis();

		try {
			document.dispatchEvent(new CustomEvent('evergreen-lenis-disabled'));
		} catch (e) {
			// ignored
		}

		return true;
	}

	function createLenis() {
		return new Lenis({
			duration: 0.7,
			easing: easeInOutCubic,
			smoothWheel: true,
			wheelMultiplier: 1.2,
			touchMultiplier: 1.2,
			lerp: 0.15,
		});
	}

	/**
	 * @param {{ force?: boolean }} [options] force = bỏ qua LENIS_SKIP_MOBILE (vẫn không boot trên fullpage nếu LENIS_SKIP_FULLPAGE)
	 * @returns {boolean}
	 */
	function bootLenis(options) {
		options = options || {};

		if (lenisInstance) {
			return true;
		}

		if (!canBoot(options)) {
			return false;
		}

		disableNativeScrollTriggerBridge();

		var lenis = createLenis();
		lenisInstance = lenis;
		window.evergreenLenis = lenis;
		syncLenisDomState(true);

		if (typeof ScrollTrigger !== 'undefined') {
			setupLenisScrollerProxy(lenis);
			lenisScrollHandler = function () {
				ScrollTrigger.update();
			};
			lenis.on('scroll', lenisScrollHandler);
			if (typeof ScrollTrigger.defaults === 'function') {
				ScrollTrigger.defaults({ ignoreMobileResize: true });
			}
		}

		lenisRaf = function (time) {
			lenis.raf(time * 1000);
		};
		// Chạy trước tween GSAP (snap) để không bị lệch một frame → cảm giác khựng.
		gsap.ticker.add(lenisRaf, false, true);
		gsap.ticker.lagSmoothing(500, 33);

		refreshScrollTrigger();

		try {
			document.dispatchEvent(new CustomEvent('evergreen-lenis-ready', { detail: { lenis: lenis } }));
		} catch (e) {
			// ignored
		}

		return true;
	}

	/**
	 * @param {number} targetY
	 * @param {{ duration?: number, immediate?: boolean, lock?: boolean, behavior?: ScrollBehavior }} [opts]
	 */
	function scrollTo(target, opts) {
		opts = opts || {};
		
		if (lenisInstance) {
			lenisInstance.scrollTo(target, {
				duration: opts.duration != null ? opts.duration : LENIS_SCROLL_TO_DURATION,
				easing: opts.easing || easeInOutCubic,
				immediate: !!opts.immediate,
				lock: opts.lock !== false,
				force: !!opts.force,
				onComplete: opts.onComplete
			});
			return;
		}

		var y = 0;
		if (typeof target === 'number') {
			y = target;
		} else if (target && target.getBoundingClientRect) {
			y = target.getBoundingClientRect().top + (window.scrollY || document.documentElement.scrollTop);
		}

		window.scrollTo({
			top: y,
			left: 0,
			behavior: opts.immediate ? 'auto' : opts.behavior || 'auto',
		});
	}

	window.EvergreenLenis = {
		enable: bootLenis,
		disable: teardownLenis,
		toggle: function (options) {
			if (lenisInstance) {
				return teardownLenis();
			}
			return bootLenis(options);
		},
		isActive: function () {
			return !!lenisInstance;
		},
		/** Đổi LENIS_ENABLED và boot/teardown tương ứng. */
		setEnabled: function (on) {
			LENIS_ENABLED = !!on;
			if (LENIS_ENABLED) {
				return bootLenis({ force: true });
			}
			return teardownLenis();
		},
		isEnabled: function () {
			return LENIS_ENABLED;
		},
		scrollTo: scrollTo,
		refresh: refreshScrollTrigger,
	};

	if (shouldAutoStart()) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', function () {
				bootLenis();
			}, { once: true });
		} else {
			bootLenis();
		}
	} else if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initWithoutLenis, { once: true });
	} else {
		initWithoutLenis();
	}
})();
