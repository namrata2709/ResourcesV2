# Learning Dashboard

A free, self-paced study hub with structured notes, quizzes, and hands-on labs.

🔗 **Live site:** https://namrata2709.github.io/Resources/

## What's here

- **AWS** — certification notes (Cloud Practitioner, Solutions Architect), hands-on labs, and practice quizzes
- **DSA** — data structures & algorithms notes with interactive visualizations
- **Quiz** — self-test practice questions across subjects

## Tech

Static site, no framework — vanilla HTML/CSS/JS, hosted on GitHub Pages.
A Node build step (`npm run build`, via `tools/minify.js`) minifies and
copies `src/` to `dist/` before every deploy (see `.github/workflows/`).
Content is authored in Markdown and compiled to HTML via Python scripts (see `python/`).

## License

Content is licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) — see [LICENSE.md](LICENSE.md).
Free to share and adapt for educational use, with attribution, non-commercially.

## Contact

Questions or commercial licensing: awslecturenotes@gmail.com
Issues: https://github.com/namrata2709/Resources/issues
