# Evergreen Estate Scroll Animation Demo

A fully local, self-contained offline-ready clone of the premium interactive webpage for **Evergreen Estate** (`https://os6.letweb.net/evergreen-estate/`). 

## Live Demo & Repository
- **GitHub Repository**: [https://github.com/vyvy0812/evergreen-estate-demo](https://github.com/vyvy0812/evergreen-estate-demo)
- **Live Demo Link (GitHub Pages)**: [https://vyvy0812.github.io/evergreen-estate-demo/](https://vyvy0812.github.io/evergreen-estate-demo/)

## Project Structure

- `index.html` - The patched, offline-compatible main HTML file.
- `css/` - Contains all 9 layout and design stylesheets, including core framework assets and splide layout styling.
- `js/` - Contains 14 JavaScript files, including GSAP (3.12.5), ScrollTrigger, Lenis smooth scrolling, Splide, and the custom snapping & parallax scroll engine.
- `images/` - Contains all background textures, inline images, masks, and decorative SVG elements.
- `fonts/` - Contains custom web typography files (including `SFUFutura.woff2` variations and Google Fonts `Pinyon Script`).

## Local Development & Testing

To run the project locally, start any simple HTTP server in the root directory.

### Using Python:
```bash
python -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000) in your browser.

## Key Features & Visual Effects

1. **Octagon Vector Drawing**: Outer and inner octagon strokes fade and trace out dynamically on page load.
2. **Horizontal Section Snapping**: Chapters trigger horizontal snapping transitions tied to GSAP scroll timelines.
3. **Parallax Image Reveal**: ScrollTrigger mask reveals image elements using SVG polygon clip-paths.
4. **Smooth Scroll integration**: Lenis library hooks into ScrollTrigger for smooth kinetic scrolling transitions.
5. **Background Particles**: Background canvas animates gold particle dots reacting to section transitions.
