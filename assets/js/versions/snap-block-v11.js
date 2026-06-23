	// Vy them - Start (v11)
	function initSnapScrolling() {
		if (isCoarsePointerDevice()) return;

		var sections = gsap.utils.toArray('[data-scroll-snap-section]');
		if (!sections.length) return;

		var scrollFn = ScrollTrigger.getScrollFunc(window);

		console.log('[Snap v11] init y=', scrollFn());

		// ─── Tính vị trí đầu / cuối mỗi section ──────────────────────
		var snapStarts = sections.map(function (sec) {
			var st = ScrollTrigger.create({ trigger: sec, start: 'top top' });
			var pos = st.start;
			st.kill(false);
			return typeof pos === 'number' && pos >= 0 ? pos : 0;
		});

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

		console.log('[Snap v11] starts:', JSON.stringify(snapStarts));
		console.log('[Snap v11] ends:  ', JSON.stringify(snapEnds));

		function getY() {
			var y = scrollFn();
			return (typeof y === 'number' && y >= 0) ? y : 0;
		}

		// ─── snap animation ───────────────────────────────────────────
		var snapTween     = null;
		var snapCoolMs    = 0; // không snap mới trong cooldown
		var lastTargetY   = -9999;

		function doSnap(fromY, targetY) {
			// Không snap đến cùng vị trí trong 3 giây
			if (Math.abs(targetY - lastTargetY) < 10) return;

			if (snapTween) { snapTween.kill(); snapTween = null; }
			snapCoolMs  = Date.now() + 2200;
			lastTargetY = targetY;

			console.log('[Snap v11]', Math.round(fromY), '->', Math.round(targetY));
			var proxy = { y: fromY };
			snapTween = gsap.to(proxy, {
				y: targetY, duration: 0.85, ease: 'power2.inOut',
				onUpdate:   function () { scrollFn(proxy.y); },
				onComplete: function () {
					snapTween = null;
					lastTargetY = getY();
					console.log('[Snap v11] landed', Math.round(lastTargetY));
				},
			});
		}

		// Block ESS wheel events chỉ trong lúc snap animation đang chạy
		var blockWheelMs = 0;
		window.addEventListener('wheel', function (e) {
			if (Date.now() < blockWheelMs) {
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		}, { passive: false, capture: true });

		// ─── "Snap after stop" logic ──────────────────────────────────
		// Chiến lược: để ESS cuộn tự do. Sau khi user DỪNG cuộn
		// (velocity ≈ 0), kiểm tra xem viewport có đang "treo giữa 2 section"
		// không. Nếu có → snap về section boundary gần nhất.
		// → Không ping-pong vì snap chỉ fire khi user đứng yên.

		var rafY       = getY();
		var lastMoveMs = Date.now();
		var STOP_WAIT  = 180; // ms sau khi dừng mới snap
		var startupMs  = Date.now() + 2000;

		function findSnapTarget(y) {
			var winH = window.innerHeight;
			// Forward: viewport bottom đã qua section end → snap đến section tiếp theo
			for (var i = 0; i < snapStarts.length - 1; i++) {
				if (y + winH > snapEnds[i] && y < snapStarts[i + 1]) {
					return snapStarts[i + 1];
				}
			}
			// Backward: viewport top nằm trước section start → snap đến section đó
			for (var j = snapStarts.length - 1; j > 0; j--) {
				if (y < snapStarts[j] && y + winH > snapStarts[j]) {
					// Viewport một phần nằm trong section j, top chưa tới
					return snapStarts[j];
				}
			}
			return null;
		}

		(function rafCheck() {
			requestAnimationFrame(rafCheck);

			var now = Date.now();
			if (now < startupMs) { rafY = getY(); return; }
			if (snapTween) { rafY = getY(); return; }
			if (now < snapCoolMs) { rafY = getY(); return; }

			var y  = getY();
			var dy = y - rafY;
			rafY   = y;

			if (Math.abs(dy) > 0.5) {
				// User đang cuộn: cập nhật timer
				lastMoveMs = now;
				return;
			}

			// User đã dừng cuộn: kiểm tra sau STOP_WAIT ms
			if (now - lastMoveMs < STOP_WAIT) return;

			var target = findSnapTarget(y);
			if (target === null) return;
			if (Math.abs(target - y) < 3) return; // đã ở đúng vị trí

			// Block ESS trong lúc snap
			blockWheelMs = Date.now() + 950;
			doSnap(y, target);
		})();
	}
	// Vy them - End (v11)
