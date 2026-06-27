const fs = require("fs-extra");
const path = require("path");
const glob = require("fast-glob");
const { minify } = require("html-minifier-terser");
const CleanCSS = require("clean-css");
const terser = require("terser");

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

if (!fs.existsSync(SRC)) {
    console.error("❌ src folder not found.");
    process.exit(1);
}

const COPY_EXTENSIONS = new Set([
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
    ".woff", ".woff2", ".ttf", ".eot",
    ".pdf", ".mp3", ".mp4", ".webm", ".wav",
    ".txt", ".xml"
]);

async function build() {
    console.log("Cleaning dist...");
    fs.removeSync(DIST);
    fs.ensureDirSync(DIST);

    const files = await glob("**/*", {
        cwd: SRC,
        onlyFiles: true,
        dot: false
    });

    for (const relative of files) {
        const src = path.join(SRC, relative);
        const dest = path.join(DIST, relative);

        await fs.ensureDir(path.dirname(dest));

        const ext = path.extname(relative).toLowerCase();

        switch (ext) {

            case ".html": {
                const html = await fs.readFile(src, "utf8");

                const output = await minify(html, {
                    collapseWhitespace: true,
                    removeComments: true,
                    minifyCSS: true,
                    minifyJS: true
                });

                await fs.writeFile(dest, output);

                console.log("HTML ", relative);
                break;
            }

            case ".css": {
                const css = await fs.readFile(src, "utf8");

                const output = new CleanCSS({
                    level: 2
                }).minify(css).styles;

                await fs.writeFile(dest, output);

                console.log("CSS  ", relative);
                break;
            }

            case ".js": {
                console.log("Minifying JS:", relative);

                const js = await fs.readFile(src, "utf8");

                try {
                    const result = await terser.minify(js, {
                        compress: {
                            drop_console: true
                        },
                        mangle: true
                    });

                    await fs.writeFile(dest, result.code);

                    console.log("JS   ", relative);
                } catch (err) {
                    console.error("\nFailed:", relative);
                    throw err;
                }

                break;
            }

            case ".json": {
                const json = JSON.parse(await fs.readFile(src, "utf8"));

                await fs.writeFile(dest, JSON.stringify(json));

                console.log("JSON ", relative);
                break;
            }

            default: {
                if (COPY_EXTENSIONS.has(ext)) {
                    await fs.copy(src, dest);
                    console.log("COPY ", relative);
                }
            }
        }
    }

    console.log("\n✅ Build complete.");
}

build().catch(err => {
    console.error(err);
    process.exit(1);
});