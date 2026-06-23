	// Vy them - Start (v10)
	function initSnapScrolling() {
		if (isCoarsePointerDevice()) return;

		var sections = gsap.utils.toArray('[data-scroll-snap-section]');
		if (!sections.length) return;

		var scrollFn = ScrollTrigger.getScrollFunc(window);

		console.log('[SnapScroll v10] scrollFn() init =', scrollFn());

		// ─── Snap STARTS ─────────────────────────────────────────────
		var snapStarts = sections.map(function (sec) {
			var st = ScrollTrigger.create({ trigger: sec, start: 'top top' });
			var pos = st.start;
			st.kill(false);
			return typeof pos === 'number' && pos >= 0 ? pos : 0;
		});

		// ─── Snap ENDS ────────────────────────────────────────────────
		var allSTs = ScrollTrigger.getAll();
		var docH   = document.documentElement.scrollHeight;
		var snapEnds = snapStarts.map(function (start, i) {
			var rangeEnd = i < snapStarts.length - 1 ? snapStarts[i + 1] : docH;
			var maxEnd   = rangeEnd;
			allSTs.forEach(function (st) {
				if (st.pin && typeof st.start === 'number' && typeof st.end === 'number') {
					if (st.start >= start && st.start < rangeEnd && st.end > maxEnd) {
						maxEnd = st.end;
					}
				}
			});
			return maxEnd;
		});

		console.log('[SnapScroll v10] starts:', JSON.stringify(snapStarts));
		console.log('[SnapScroll v10] ends:  ', JSON.stringify(snapEnds));

		function getVisualY() {
			var y = scrollFn();
			if (typeof y === 'number' && y >= 0) return y;
			var sec = sections[0]; var docTop = 0; var el = sec;
			while (el) { docTop += el.offsetTop; el = el.offsetParent; }
			return Math.max(0, docTop - sec.getBoundingClientRect().top);
		}

		// Midpoint: "section nào đang ở giữa màn hình"
		function getCurrentIdx(y) {
			var mid = y + window.innerHeight * 0.5;
			var idx = 0;
			for (var i = 0; i < snapStarts.length; i++) {
				if (snapStarts[i] <= mid) idx = i;
			}
			return idx;
		}

		var snapTween     = null;
		var scrollBlockMs = 0;
		var snapBlockMs   = 0;

		// Backward snap: cần cuộn ít nhất 150px TRÊN ranh giới section
		// (tránh snap ngược khi ESS deceleration overshoots nhẹ gần boundary)
		var BACK_THRESH = 150;

		// Backward snap velocity gate: chỉ snap ngược khi đang di chuyển chậm
		// (tránh snap ngược khi user scroll nhanh)
		var BACK_MAX_V  = 30; // px/frame tại 60fps

		function doSnap(fromY, targetY) {
			if (snapTween) { snapTween.kill(); snapTween = null; }

			scrollBlockMs = Date.now() + 950;  // block ESS wheel events trong lúc snap
			snapBlockMs   = Date.now() + 1800; // cooldown 1.8s sau khi snap

			console.log('[SnapScroll v10]', Math.round(fromY), '->', Math.round(targetY));

			var proxy = { y: fromY };
			snapTween = gsap.to(proxy, {
				y: targetY,
				duration: 0.8,
				ease: 'power2.inOut',
				onUpdate:   function () { scrollFn(proxy.y); },
				onComplete: function () {
					snapTween = null;
					console.log('[SnapScroll v10] landed', Math.round(scrollFn()));
				},
			});
		}

		// Wheel: CHỈ block ESS trong lúc snap animation đang chạy
		window.addEventListener('wheel', function (e) {
			if (Date.now() < scrollBlockMs) {
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		}, { passive: false, capture: true });

		// rAF loop: poll vị trí 60fps, bắt boundary crossing
		// ESS dùng RAF animation (không fire wheel events trong lúc chạy),
		// nên chỉ rAF mới catch được crossing trong lúc momentum.
		var rafPrevY  = getVisualY();
		var startupMs = Date.now() + 1500; // đợi ESS ổn định sau page load

		(function rafCheck() {
			requestAnimationFrame(rafCheck);

			if (snapTween) return;          // snap animation đang chạy

			var now = Date.now();
			if (now < snapBlockMs) return;  // cooldown
			if (now < startupMs)  { rafPrevY = getVisualY(); return; }

			var y    = getVisualY();
			var dy   = y - rafPrevY;
			rafPrevY = y;

			if (Math.abs(dy) < 0.5) return; // không di chuyển

			var winH = window.innerHeight;
			var idx  = getCurrentIdx(y);

			if (dy > 0) {
				// ── Cuộn XUỐNG: snap ngay khi viewport bottom vượt section end ──
				// Không có velocity gate → snap luôn luôn khi chạm ranh giới,
				// dù user scroll nhanh hay chậm.
				if (y + winH >= snapEnds[idx] - 5 && idx < sections.length - 1) {
					doSnap(y, snapStarts[idx + 1]);
				}
			} else {
				// ── Cuộn LÊN: snap ngược chỉ khi chậm + đủ xa boundary ──────
				var absV = -dy; // dy < 0 nên absV = -dy > 0
				if (absV < BACK_MAX_V && y < snapStarts[idx] - BACK_THRESH && idx > 0) {
					doSnap(y, snapStarts[idx - 1]);
				}
			}
		})();
	}
	// Vy them - End (v10)
