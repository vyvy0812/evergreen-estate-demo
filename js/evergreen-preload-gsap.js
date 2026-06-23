/**
 * Evergreen preload — octagon hole (body scrim) + optional “CodePen” magnetic cursor
 * (https://codepen.io/nikhil-ladhani-nl/pen/bGpWmXd — cursor snaps / morphs toward targets).
 *
 * Bricks:
 * - data-evergreen-preload, data-evergreen-preload-reveal (required)
 * - data-evergreen-preload-magnetic="1" — enable magnetic cursor during preload
 * - data-evergreen-preload-magnetic-target — each hotspot (wrap text in a child, or use data-evergreen-preload-magnetic-label on inner node)
 * - data-evergreen-preload-bg, data-evergreen-preload-logo (optional)
 *
 * Timing attrs: data-evergreen-preload-zoom-dur (default 0.95), hole-end-scale, logo-fade-*, reveal-*, remove-delay
 */
(function () {
	'use strict';

	if (typeof gsap === 'undefined') {
		return;
	}

	var SVG_NS = 'http://www.w3.org/2000/svg';

	function readNum(el, name, fallback) {
		var v = parseFloat(el.getAttribute(name));
		if (isNaN(v)) {
			return fallback;
		}
		return v;
	}

	function isMagneticOn(root) {
		var v = (root.getAttribute('data-evergreen-preload-magnetic') || '').trim().toLowerCase();
		return v === '1' || v === 'true' || v === 'yes' || v === 'on';
	}

	function octagonPointsAroundOrigin(radius) {
		var pts = [];
		var k;
		for (k = 0; k < 8; k++) {
			var a = -Math.PI / 8 + k * (Math.PI / 4);
			pts.push(Math.cos(a) * radius + ',' + Math.sin(a) * radius);
		}
		return pts.join(' ');
	}

	function defaultHoleEndScale(vw, vh, baseR) {
		var halfDiag = Math.hypot(vw, vh) / 2;
		return (halfDiag / baseR) * 1.12;
	}

	/** CodePen-style magnetic cursor (GSAP 3). Returns teardown. */
	function bindMagneticPreload(root) {
		var cursor = document.createElement('div');
		cursor.className = 'evergreen-preload-magnetic-cursor';
		cursor.setAttribute('aria-hidden', 'true');
		root.appendChild(cursor);

		gsap.set(cursor, {
			position: 'fixed',
			left: 0,
			top: 0,
			width: 12,
			height: 12,
			xPercent: -50,
			yPercent: -50,
			pointerEvents: 'none',
			force3D: true,
		});

		var targets = root.querySelectorAll('[data-evergreen-preload-magnetic-target]');
		if (!targets.length) {
			if (cursor.parentNode) {
				cursor.parentNode.removeChild(cursor);
			}
			return function () {};
		}

		root.classList.add('evergreen-preload-magnetic-active');

		function labelEl(single) {
			return (
				single.querySelector('[data-evergreen-preload-magnetic-label]') ||
				single.querySelector('.evergreen-preload-magnetic-label') ||
				single.firstElementChild
			);
		}

		function onMove(e) {
			var cx = e.clientX;
			var cy = e.clientY;
			var i;
			for (i = 0; i < targets.length; i++) {
				var single = targets[i];
				var rect = single.getBoundingClientRect();
				var triggerDistance = rect.width;
				var tcx = rect.left + rect.width / 2;
				var tcy = rect.top + rect.height / 2;
				var dx = tcx - cx;
				var dy = tcy - cy;
				var angle = Math.atan2(dx, dy);
				var hyp = Math.sqrt(dx * dx + dy * dy);
				var label = labelEl(single);

				if (hyp < triggerDistance) {
					gsap.to(cursor, {
						duration: 0.2,
						left: tcx - (Math.sin(angle) * hyp) / 2,
						top: tcy - (Math.cos(angle) * hyp) / 2,
						width: single.clientWidth,
						height: single.clientHeight,
						xPercent: -50,
						yPercent: -50,
						overwrite: 'auto',
					});
					if (label) {
						gsap.to(label, {
							duration: 0.2,
							x: -(Math.sin(angle) * hyp) / 2,
							y: -(Math.cos(angle) * hyp) / 2,
							overwrite: 'auto',
						});
					}
				} else {
					gsap.to(cursor, {
						duration: 0.2,
						left: cx,
						top: cy,
						width: 12,
						height: 12,
						xPercent: -50,
						yPercent: -50,
						overwrite: 'auto',
					});
					if (label) {
						gsap.to(label, { duration: 0.2, x: 0, y: 0, overwrite: 'auto' });
					}
				}
			}
		}

		document.addEventListener('mousemove', onMove, false);

		var done = false;
		return function teardownMagnetic() {
			if (done) {
				return;
			}
			done = true;
			document.removeEventListener('mousemove', onMove, false);
			if (root.classList) {
				root.classList.remove('evergreen-preload-magnetic-active');
			}
			if (cursor.parentNode) {
				cursor.parentNode.removeChild(cursor);
			}
		};
	}

	function initEvergreenPreload() {
		var root = document.querySelector('[data-evergreen-preload]');
		if (!root || root.getAttribute('data-evergreen-preload-done') === '1') {
			return;
		}

		var reveals = document.querySelectorAll('[data-evergreen-preload-reveal]');
		if (!reveals.length) {
			return;
		}

		root.setAttribute('data-evergreen-preload-done', '1');
		document.body.classList.add('evergreen-preload-active');

		var magneticTeardown = function () {};
		if (isMagneticOn(root)) {
			magneticTeardown = bindMagneticPreload(root);
		}

		if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			magneticTeardown();
			gsap.set(reveals, { autoAlpha: 1 });
			root.remove();
			document.body.classList.remove('evergreen-preload-active');
			return;
		}

		var vw = Math.max(1, window.innerWidth);
		var vh = Math.max(1, window.innerHeight);
		var cx = vw / 2;
		var cy = vh / 2;
		var baseR = Math.max(64, Math.min(vw, vh) * 0.22);

		var zDur = readNum(root, 'data-evergreen-preload-zoom-dur', 3.5);
		var rDur = readNum(root, 'data-evergreen-preload-reveal-dur', 1);
		var stagger = readNum(root, 'data-evergreen-preload-reveal-stagger', 0.12);
		var removeDelay = readNum(root, 'data-evergreen-preload-remove-delay', 0.08);
		var logoFadeAt = readNum(root, 'data-evergreen-preload-logo-fade-at', 0.45);
		var logoFadeDur = readNum(root, 'data-evergreen-preload-logo-fade-dur', 0.38);
		if (logoFadeAt < 0) {
			logoFadeAt = 0;
		}
		if (logoFadeAt > 0.98) {
			logoFadeAt = 0.98;
		}

		var endScale = readNum(root, 'data-evergreen-preload-hole-end-scale', NaN);
		if (isNaN(endScale) || endScale <= 0) {
			endScale = defaultHoleEndScale(vw, vh, baseR);
		}

		var maskId = 'eg-preload-mask-' + Math.random().toString(36).slice(2, 10);
		var svg = document.createElementNS(SVG_NS, 'svg');
		svg.setAttribute('width', '0');
		svg.setAttribute('height', '0');
		svg.setAttribute('aria-hidden', 'true');
		svg.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;pointer-events:none;';

		var defs = document.createElementNS(SVG_NS, 'defs');
		var mask = document.createElementNS(SVG_NS, 'mask');
		mask.setAttribute('id', maskId);
		mask.setAttribute('maskUnits', 'userSpaceOnUse');
		mask.setAttribute('maskContentUnits', 'userSpaceOnUse');
		mask.setAttribute('x', '0');
		mask.setAttribute('y', '0');
		mask.setAttribute('width', String(vw));
		mask.setAttribute('height', String(vh));

		var mrect = document.createElementNS(SVG_NS, 'rect');
		mrect.setAttribute('x', '0');
		mrect.setAttribute('y', '0');
		mrect.setAttribute('width', String(vw));
		mrect.setAttribute('height', String(vh));
		mrect.setAttribute('fill', 'white');

		var holeG = document.createElementNS(SVG_NS, 'g');
		var poly = document.createElementNS(SVG_NS, 'polygon');
		poly.setAttribute('points', octagonPointsAroundOrigin(baseR));
		poly.setAttribute('fill', 'black');

		holeG.appendChild(poly);
		mask.appendChild(mrect);
		mask.appendChild(holeG);
		defs.appendChild(mask);
		svg.appendChild(defs);
		document.body.appendChild(svg);

		var scrim = document.createElement('div');
		scrim.className = 'evergreen-preload-scrim';
		scrim.setAttribute('data-evergreen-preload-scrim', '');
		scrim.style.webkitMask = 'url(#' + maskId + ')';
		scrim.style.mask = 'url(#' + maskId + ')';

		var bg = root.querySelector('[data-evergreen-preload-bg]');
		if (bg && bg.parentNode) {
			bg.classList.add('evergreen-preload-bg');
			document.body.appendChild(bg);
		}
		document.body.appendChild(scrim);

		var logoNodes = root.querySelectorAll('[data-evergreen-preload-logo]');
		if (!logoNodes.length) {
			logoNodes = root.querySelectorAll(':scope > *:not([data-evergreen-preload-bg])');
		}

		var logoWrap = document.createElement('div');
		logoWrap.className = 'evergreen-preload-logo-wrap';
		logoWrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;pointer-events:none;';
		logoWrap.style.webkitMask = 'url(#' + maskId + ')';
		logoWrap.style.mask = 'url(#' + maskId + ')';
		Array.from(logoNodes).forEach(function (node) {
			logoWrap.appendChild(node);
		});
		document.body.appendChild(logoWrap);

		gsap.set(reveals, { autoAlpha: 0 });

		var startScale = 0.002;
		holeG.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') scale(' + startScale + ')');

		var state = { s: startScale };

		var logoDur = readNum(root, 'data-evergreen-preload-logo-dur', 2);
		if (logoDur < 0) { logoDur = 0; }

		var tMaskEnd = logoDur + zDur;
		var tl = gsap.timeline({
			onComplete: function () {
				document.body.classList.remove('evergreen-preload-active');
				if (svg.parentNode) {
					svg.parentNode.removeChild(svg);
				}
				if (typeof ScrollTrigger !== 'undefined') {
					ScrollTrigger.refresh();
				}
			},
		});

		tl.to(state, {
			s: endScale,
			duration: zDur,
			ease: 'power4.inOut',
			onUpdate: function () {
				holeG.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') scale(' + state.s + ')');
			},
		}, logoDur);

		tl.call(
			function () {
				magneticTeardown();

				var nodesToHideAndRemove = [
					logoWrap,
					scrim,
					bg,
					root,
					svg
				].filter(function(n) { return n && n.parentNode; });

				nodesToHideAndRemove.forEach(function(node) {
					node.style.transition = 'opacity 0.8s cubic-bezier(.4,0,.2,1)';
					node.style.opacity = '0';
				});

				setTimeout(function() {
					nodesToHideAndRemove.forEach(function(node) {
						if (node.parentNode) {
							node.parentNode.removeChild(node);
						}
					});
				}, 1000);
			},
			null,
			tMaskEnd
		);

		tl.to(
			reveals,
			{
				autoAlpha: 1,
				duration: rDur,
				stagger: stagger,
				ease: 'power2.out',
			},
			tMaskEnd
		);

		document.dispatchEvent(new CustomEvent('evergreen-preload-done'));
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initEvergreenPreload);
	} else {
		initEvergreenPreload();
	}
})();
