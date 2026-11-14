
# Notebook Buddy

A free, self-paced study hub with structured notes, quizzes, and hands-on labs.

🔗 **Live site:** https://namrata2709.github.io/ResourcesV2/

## What's here

- **AWS** — certification notes (Cloud Practitioner, Solutions Architect), hands-on labs, and practice quizzes
- **DSA** — data structures & algorithms notes with interactive visualizations
- **Quiz** — self-test practice questions across subjects, with Study Mode and timed mode
- **Revision** — a filtered view of your bookmarked/highlighted content for focused review
- **Gallery** — browsable image/diagram grid with filters, favorites, and download
- **Calendar** — a read-only view of which days you studied
- **Settings** — profile, appearance, accessibility, and reading preferences
- **Export** — download notes/quizzes/revision material as DOCX, PPTX, or EPUB

## Tech

A React + Vite single-page app (`web/`), served as a static site with no
backend — everything you do (progress, favorites, highlights, settings)
lives in your browser's `localStorage`, nowhere else. Content is authored
in Markdown and compiled by a Python pipeline (see `python/`) into the
data the React app renders. Deployed to GitHub Pages (see
`.github/workflows/`).

## License

Content is licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) — see [LICENSE.md](LICENSE.md).
Free to share and adapt for educational use, with attribution, non-commercially.

## Contact

Questions or commercial licensing: awslecturenotes@gmail.com
Issues: https://github.com/namrata2709/ResourcesV2/issues
