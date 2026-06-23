/**
 * Octagon Expand — Tự động hóa hiệu ứng bát giác bung tỏa cho MỌI .eve-section-title.
 *
 * Chiến lược:
 *  1. Quét tất cả `.eve-section-title` (trừ phần tử đầu tiên vì Hero đã xử lý riêng).
 *  2. Với mỗi chapter section:
 *     - Tìm `nextElementSibling` và trích xuất ảnh nền (data-src hoặc src).
 *     - Tạo khối expanding-bg với clip-path bát giác.
 *     - Tạo ScrollTrigger pin + animation bung bát giác.
 *  3. Khi bát giác bung đủ to → section tiếp theo trượt lên đè vào (giống Hero).
 *
 * Dependencies: gsap, ScrollTrigger (đã load trước).
 */
(function () {
	'use strict';

	if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
		return;
	}

	function applyOctagonClip(wrapper, r) {
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
		wrapper.style.clipPath = 'polygon(' + p1 + ', ' + p2 + ', ' + p3 + ', ' + p4 + ', ' + p5 + ', ' + p6 + ', ' + p7 + ', ' + p8 + ')';
	}

	function extractBgUrl(sibling) {
		if (!sibling) return '';
		var img = sibling.querySelector('img[data-src], img[src]');
		if (!img) return '';
		var url = img.getAttribute('data-src') || img.getAttribute('src') || '';
		if (url.indexOf('data:image') !== -1) {
			url = '';
		}
		return url;
	}

	function initChapterOctagonExpand(chapterSec, index) {
		if (chapterSec.getAttribute('data-octagon-expand-initialized') === '1') {
			return;
		}
		chapterSec.setAttribute('data-octagon-expand-initialized', '1');

		var sibling = chapterSec.nextElementSibling;
		var bgUrl   = extractBgUrl(sibling);

		// Use exactly the same classes as Hero to inherit CSS from style.css
		var octWrapper = document.createElement('div');
		octWrapper.className = 'homepage-octagon-wrapper';
		octWrapper.id = 'chapterOctagonWrapper-' + index;

		var expandingBg = document.createElement('div');
		expandingBg.className = 'homepage-expanding-bg';
		if (bgUrl) {
			expandingBg.style.backgroundImage = 'url("' + bgUrl + '")';
		}
		expandingBg.style.width = '100vw';
		expandingBg.style.height = '100vh';

		chapterSec.style.position = 'relative';
		chapterSec.style.zIndex   = '10'; // Nằm trên section1 (z-index: 1)
		chapterSec.style.overflow = 'hidden'; // Ngăn chặn wrapper 150vmax tràn xuống section bên dưới
		chapterSec.style.height = '100vh';
		chapterSec.style.maxHeight = '100vh';

		if (sibling) {
			sibling.style.position = 'relative';
			sibling.style.setProperty('z-index', '99', 'important');

			var siblingImg = sibling.querySelector('img[data-src], img[src]');
			if (siblingImg) {
				siblingImg.style.setProperty('display', 'none', 'important');
			}
		}

		// Intro elements to fade out. For Chapter, it's the inner content wrapper and indicator
		var indicator  = chapterSec.querySelector('.oo-root.octagon-keep-indicator');
		var introText  = chapterSec.querySelector('.brxe-netcpy'); // the main content wrapper

		octWrapper.appendChild(expandingBg);
		chapterSec.appendChild(octWrapper); // Append at the end, exactly like Hero

		applyOctagonClip(octWrapper, 0);

		var lengthVh = 2.8; // Exactly like Hero (280vh)
		var pinDuration = Math.round(window.innerHeight * lengthVh);

		if (sibling) {
			var safeMarginUpdate = function() {
				var maxPull = window.innerHeight * 1.5;
				var safePull = Math.max(0, Math.min(maxPull, sibling.offsetHeight - window.innerHeight * 0.1));
				sibling.style.marginTop = -safePull + 'px';
			};
			safeMarginUpdate();
			window.addEventListener('resize', safeMarginUpdate);
			if (typeof ResizeObserver !== 'undefined') {
				new ResizeObserver(safeMarginUpdate).observe(sibling);
			}

			sibling.style.setProperty('background-color', 'transparent', 'important');
			sibling.style.setProperty('background', 'transparent', 'important');
		}

		ScrollTrigger.create({
			trigger: chapterSec,
			refreshPriority: 8 - index,
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

				// Fade out intro text & outline (10% → 20%) - same as Hero
				if (progress >= 0.20) {
					if (introText) introText.style.opacity = 0;
					if (indicator) indicator.style.opacity = 0;
				} else if (progress > 0.10) {
					var fadeProg = (progress - 0.10) / 0.10;
					if (introText) introText.style.opacity = (1 - fadeProg);
					if (indicator) indicator.style.opacity = (1 - fadeProg);
				} else {
					if (introText) introText.style.opacity = 1;
					if (indicator) indicator.style.opacity = 1;
				}

				// Octagon Expansion (10% → 50%) - same as Hero
				var r = 0;
				if (progress > 0.10) {
					var clipProg = Math.min(1, (progress - 0.10) / 0.40);
					r = clipProg * 100;
				}
				applyOctagonClip(octWrapper, r);

				// Image Scaling (25% → 75%) - same as Hero
				var scaleProg = 0;
				if (progress > 0.75) {
					scaleProg = 1;
				} else if (progress > 0.25) {
					scaleProg = (progress - 0.25) / 0.50;
				}
				var easeScale = scaleProg < 0.5 ? 2 * scaleProg * scaleProg : 1 - Math.pow(-2 * scaleProg + 2, 2) / 2;
				var currentScale = 0.8 + (0.2 * easeScale);
				expandingBg.style.transform = 'translate(-50%, -50%) scale(' + currentScale + ')';

				// Blur & fade background image
				if (progress >= 0.85) {
					var fadeProg = Math.min(1, (progress - 0.85) / 0.15);
					expandingBg.style.opacity = 1 - fadeProg;
					expandingBg.style.filter = 'blur(25px) brightness(0.4)';
					octWrapper.style.backgroundColor = '#23110a';
				} else if (progress >= 0.50) {
					var blurProg = (progress - 0.50) / 0.35;
					expandingBg.style.filter = 'blur(' + (blurProg * 25) + 'px) brightness(' + (1 - blurProg * 0.6) + ')';
					expandingBg.style.opacity = 1;
					octWrapper.style.backgroundColor = '#23110a';
				} else {
					expandingBg.style.filter = 'blur(0px) brightness(1)';
					expandingBg.style.opacity = 1;
					octWrapper.style.backgroundColor = 'transparent';
				}
			}
		});
	}

	function initAllChapterOctagonExpands() {
		var allChapterSecs = document.querySelectorAll('.eve-section-title');
		if (!allChapterSecs.length) {
			return;
		}

		allChapterSecs.forEach(function (sec, i) {
			if (i === 0) return; // Skip Hero
			if (sec.textContent && sec.textContent.toUpperCase().indexOf('TIN TỨC') !== -1) return; // Skip Tin tức nổi bật
			initChapterOctagonExpand(sec, i);
		});

		setTimeout(function () {
			if (typeof ScrollTrigger !== 'undefined') {
				if (typeof ScrollTrigger.sort === 'function') {
					ScrollTrigger.sort();
				}
				ScrollTrigger.refresh(true);
			}
		}, 150);
	}

	document.addEventListener('evergreen-preload-done', function () {
		setTimeout(function () {
			initAllChapterOctagonExpands();
		}, 3600);
	});
})();
