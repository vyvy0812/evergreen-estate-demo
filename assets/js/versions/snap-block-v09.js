	// Vy them - Start (v9)
	function initSnapScrolling() {
		if (isCoarsePointerDevice()) return;

		var sections = gsap.utils.toArray('[data-scroll-snap-section]');
		if (!sections.length) return;

		var scrollFn = ScrollTrigger.getScrollFunc(window);

		console.log('[SnapScroll v9] scrollFn() init =', scrollFn());

		var snapStarts = sections.map(function (sec) {
			var st = ScrollTrigger.create({ trigger: sec, start: 'top top' });
			var pos = st.start;
			st.kill(false);
			return typeof pos === 'number' && pos >= 0 ? pos : 0;
		});

		var allSTs = ScrollTrigger.getAll();
		var docH = document.documentElement.scrollHeight;
		var snapEnds = snapStarts.map(function (start, i) {
			var rangeEnd = i < snapStarts.length - 1 ? snapStarts[i + 1] : docH;
			var maxEnd = rangeEnd;
			allSTs.forEach(function (st) {
				if (st.pin && typeof st.start === 'number' && typeof st.end === 'number') {
					if (st.start >= start && st.start < rangeEnd && st.end > maxEnd) {
						maxEnd = st.end;
					}
				}
			});
			return maxEnd;
		});

		console.log('[SnapScroll v9] starts:', JSON.stringify(snapStarts));
		console.log('[SnapScroll v9] ends:  ', JSON.stringify(snapEnds));

		var dbgTimer = setInterval(function () {
			console.log('[v9 pos]', Math.round(scrollFn()));
		}, 2000);
		setTimeout(function () { clearInterval(dbgTimer); }, 40000);

		function getVisualY() {
			var y = scrollFn();
			if (typeof y === 'number' && y >= 0) return y;
			var sec = sections[0];
			var docTop = 0; var el = sec;
			while (el) { docTop += el.offsetTop; el = el.offsetParent; }
			return Math.max(0, docTop - sec.getBoundingClientRect().top);
		}

		function getCurrentIdx(y) {
			var mid = y + window.innerHeight * 0.5;
			var idx = 0;
			for (var i = 0; i < snapStarts.length; i++) {
				if (snapStarts[i] <= mid) idx = i;
			}
			return idx;
		}

		var snapTween = null;
		var scrollBlockMs = 0;
		var snapBlockMs = 0;
		var wheelAccum = 0;
		var lastWheelTime = 0;
		var BACK_THRESH = 50;

		function doSnap(fromY, targetY) {
			if (snapTween) { snapTween.kill(); snapTween = null; }
			scrollBlockMs = Date.now() + 900;
			snapBlockMs = scrollBlockMs + 700;
			var proxy = { y: fromY };
			snapTween = gsap.to(proxy, {
				y: targetY,
				duration: 0.78,
				ease: 'power2.inOut',
				onUpdate: function () { scrollFn(proxy.y); },
				onComplete: function () {
					snapTween = null;
					console.log('[SnapScroll v9] landed', Math.round(scrollFn()));
				},
			});
		}

		window.addEventListener('wheel', function (e) {
			var now = Date.now();

			if (now < scrollBlockMs) {
				e.preventDefault();
				e.stopImmediatePropagation();
				return;
			}

			if (now - lastWheelTime > 80) wheelAccum = 0;
			lastWheelTime = now;
			wheelAccum += e.deltaY;
			if (Math.abs(wheelAccum) < 40) return;

			var winH = window.innerHeight;
			var y = getVisualY();
			var idx = getCurrentIdx(y);
			var targetIdx = idx;
			var shouldSnap = false;

			if (e.deltaY > 0) {
				if (y + winH >= snapEnds[idx] - 20 && idx < sections.length - 1) {
					targetIdx = idx + 1; shouldSnap = true;
				} else {
					wheelAccum = 0;
					return;
				}
			} else {
				if (y < snapStarts[idx] - BACK_THRESH && idx > 0) {
					targetIdx = idx - 1; shouldSnap = true;
				} else {
					wheelAccum = 0;
					return;
				}
			}

			if (now < snapBlockMs || !shouldSnap) {
				wheelAccum = 0;
				return;
			}

			e.preventDefault();
			e.stopImmediatePropagation();
			wheelAccum = 0;

			console.log('[SnapScroll v9]', idx + '->' + targetIdx,
				'y=' + Math.round(y), 'end=' + Math.round(snapEnds[idx]),
				'target=' + Math.round(snapStarts[targetIdx]));

			doSnap(y, snapStarts[targetIdx]);

		}, { passive: false, capture: true });
	}
	// Vy them - End (v9)
