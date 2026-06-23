document.addEventListener('DOMContentLoaded', () => {
    setRootVariables();

	setTimeout(() => {
		document.documentElement.style.opacity = 1;
        document.documentElement.style.background = '#23110a';
	}, 888);

	setTimeout(() => {
		initItemViewportReveal();
	}, 1000);

	headerAppearAnimation();
});

function initItemViewportReveal() {
	const STAGGER_MS = 120;
	const items = document.querySelectorAll('.brxe-vspcfz:not(.fadeBlurIn)');
	if (!items.length) return;

	const observer = new IntersectionObserver(
		(entries) => {
			const entering = entries
				.filter((e) => e.isIntersecting && !e.target.classList.contains('item-visible'))
				.map((e) => e.target);

			entering.forEach((item, i) => {
				observer.unobserve(item);
				setTimeout(() => item.classList.add('fadeBlurIn'), i * STAGGER_MS + 120);
			});
		},
		{ threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
	);

	items.forEach((item) => observer.observe(item));
}

function headerAppearAnimation() {
	const timeout = document.body.classList.contains('home') ? 4000 : 500;
	setTimeout(() => {
		document.querySelector('#brx-header').style.opacity = 1;
		document.querySelector('#brx-header').style.transform = 'translateY(0)';
	}, timeout);
}

function setRootVariables() {
	const root = document.documentElement;
    const offset = 266;

	root.style.setProperty('--container-left-margin', `-${offset}px`);
}
