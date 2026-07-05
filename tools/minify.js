const fs = require("fs-extra");
const path = require("path");
const glob = require("fast-glob");
const { minify } = require("html-minifier-terser");
const CleanCSS = require("clean-css");
const terser = require("terser");

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");

const COPY_EXTENSIONS = new Set([
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
    ".woff", ".woff2", ".ttf", ".eot",
    ".pdf", ".mp3", ".mp4", ".webm", ".wav",
    ".txt", ".xml"
]);

function escapeHtml(str) {
    return str
        .replace(/&(?!(?:amp|lt|gt|quot|apos|#39|#x27);)/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function protectCodeBlocks(html) {
    const blocks = [];

    html = html.replace(
        /<pre\b[^>]*>\s*<code\b[^>]*>[\s\S]*?<\/code>\s*<\/pre>/gi,
        block => {
            const fixed = block.replace(
                /(<code\b[^>]*>)([\s\S]*?)(<\/code>)/i,
                (_, open, code, close) => {
                    return open + escapeHtml(code) + close;
                }
            );

            const token = `___CODEBLOCK_${blocks.length}___`;
            blocks.push(fixed);
            return token;
        }
    );

    return { html, blocks };
}

function restoreCodeBlocks(html, blocks) {
    blocks.forEach((block, i) => {
        html = html.replace(`___CODEBLOCK_${i}___`, block);
    });

    return html;
}

async function build() {

    fs.removeSync(DIST);
    fs.ensureDirSync(DIST);

    const files = await glob("**/*", {
        cwd: SRC,
        onlyFiles: true
    });

    for (const relative of files) {

        const src = path.join(SRC, relative);
        const dest = path.join(DIST, relative);

        await fs.ensureDir(path.dirname(dest));

        const ext = path.extname(relative).toLowerCase();

        switch (ext) {

            case ".html": {

                let html = await fs.readFile(src, "utf8");

                const protectedBlocks = protectCodeBlocks(html);

                html = restoreCodeBlocks(
                    await minify(protectedBlocks.html, {
                        collapseWhitespace: true,
                        removeComments: true,
                        minifyCSS: true,
                        minifyJS: true
                    }),
                    protectedBlocks.blocks
                );

                await fs.writeFile(dest, html);

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

                const js = await fs.readFile(src, "utf8");

                const result = await terser.minify(js, {
                    compress: {
                        drop_console: true
                    },
                    mangle: true
                });

                await fs.writeFile(dest, result.code);

                console.log("JS   ", relative);

                break;
            }

            case ".json": {

                const json = JSON.parse(await fs.readFile(src, "utf8"));

                await fs.writeFile(dest, JSON.stringify(json));

                console.log("JSON ", relative);

                break;
            }

            default:

                if (COPY_EXTENSIONS.has(ext)) {
                    await fs.copy(src, dest);
                    console.log("COPY ", relative);
                }
        }
    }

    console.log("\n✅ Build complete.");
}

build().catch(err => {
    console.error(err);
    process.exit(1);
});