	// Snap scrolling - Start (v12)
	function initSnapScrolling() {
		if (isCoarsePointerDevice()) return;

		var sections = gsap.utils.toArray('[data-scroll-snap-section]');
		if (!sections.length) return;

		var scrollFn = ScrollTrigger.getScrollFunc(window);
		console.log('[Snap v12] init y=', scrollFn());

		// Section start positions
		var snapStarts = sections.map(function (sec) {
			var st = ScrollTrigger.create({ trigger: sec, start: 'top top' });
			var pos = st.start;
			st.kill(false);
			return typeof pos === 'number' && pos >= 0 ? pos : 0;
		});

		// Section end positions (accounting for pinned ScrollTriggers)
		var allSTs = ScrollTrigger.getAll();
		var docH   = document.documentElement.scrollHeight;
		var snapEnds = snapStarts.map(function (start, i) {
			var rangeEnd = i < snapStarts.length - 1 ? snapStarts[i + 1] : docH;
			var maxEnd   = rangeEnd;
			allSTs.forEach(function (st) {
				if (st.pin && typeof st.start === 'number' && typeof st.end === 'number') {
					if (st.start >= start && st.start < rangeEnd && st.end > maxEnd) maxEnd = st.end;
				}
			});
			return maxEnd;
		});

		console.log('[Snap v12] starts:', JSON.stringify(snapStarts));
		console.log('[Snap v12] ends:  ', JSON.stringify(snapEnds));

		function getY() {
			var y = scrollFn();
			return (typeof y === 'number' && y >= 0) ? y : 0;
		}

		// Midpoint-based section index detection
		function getSectionIdx(y) {
			var mid = y + window.innerHeight * 0.5;
			var idx = 0;
			for (var i = 0; i < snapStarts.length; i++) {
				if (snapStarts[i] <= mid) idx = i;
			}
			return idx;
		}

		// Snap animation state
		var snapTween    = null;
		var snapCoolMs   = 0;
		var wheelBlockMs = 0;

		// Anti-ping-pong: skip re-snap to same target within RESNAPGUARD ms
		var lastLandedY  = -9999;
		var lastLandedMs = 0;
		var RESNAPGUARD  = 5000;

		function doSnap(fromY, targetY) {
			if (snapTween) { snapTween.kill(); snapTween = null; }
			wheelBlockMs = Date.now() + 950;
			snapCoolMs   = Date.now() + 1800;
			console.log('[Snap v12]', Math.round(fromY), '->', Math.round(targetY));
			var proxy = { y: fromY };
			snapTween = gsap.to(proxy, {
				y: targetY, duration: 0.85, ease: 'power2.inOut',
				onUpdate: function () { scrollFn(proxy.y); },
				onComplete: function () {
					snapTween    = null;
					lastLandedY  = targetY;
					lastLandedMs = Date.now();
					console.log('[Snap v12] landed', Math.round(scrollFn()));
				},
			});
		}

		// Block ESS wheel events only during snap animation
		window.addEventListener('wheel', function (e) {
			if (Date.now() < wheelBlockMs) {
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		}, { passive: false, capture: true });

		// rAF detection loop: polls position at 60fps
		// Works during ESS smooth scroll momentum (ESS uses rAF, not wheel events)
		var rafY      = getY();
		var startupMs = Date.now() + 2500;

		// Backward snap: require 120px past boundary + slow velocity
		var BACK_THRESH = 120;
		var BACK_MAX_V  = 28;

		(function rafCheck() {
			requestAnimationFrame(rafCheck);

			var now = Date.now();
			if (now < startupMs)  { rafY = getY(); return; }
			if (snapTween)        { rafY = getY(); return; }
			if (now < snapCoolMs) { rafY = getY(); return; }

			var y    = getY();
			var dy   = y - rafY;
			rafY     = y;
			var absV = Math.abs(dy);

			if (absV < 1.5) return;

			var winH = window.innerHeight;
			var idx  = getSectionIdx(y);

			if (dy > 0) {
				// Forward: snap when viewport bottom passes section end
				if (y + winH >= snapEnds[idx] - 5 && idx < sections.length - 1) {
					var nextTarget = snapStarts[idx + 1];
					// Skip if we just landed at this target (prevents ping-pong)
					if (Math.abs(nextTarget - lastLandedY) < 10
						&& now - lastLandedMs < RESNAPGUARD) return;
					doSnap(y, nextTarget);
				}
			} else {
				// Backward: only snap when slow + far enough past boundary
				if (absV < BACK_MAX_V && y < snapStarts[idx] - BACK_THRESH && idx > 0) {
					var prevTarget = snapStarts[idx - 1];
					if (Math.abs(prevTarget - lastLandedY) < 10
						&& now - lastLandedMs < RESNAPGUARD) return;
					doSnap(y, prevTarget);
				}
			}
		})();
	}
	// Snap scrolling - End (v12)
