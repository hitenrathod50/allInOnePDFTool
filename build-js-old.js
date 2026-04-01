const { minify } = require("terser");
const fs = require("fs-extra");
const { glob } = require("glob");
const path = require("path");
const CleanCSS = require("clean-css");

const jsInputDir = "src/js";
const jsOutputDir = "public/js";

const cssInputDir = "src/css";
const cssOutputDir = "public/css";

async function minifyJS() {
    await fs.ensureDir(jsOutputDir);

    const files = await glob(`${jsInputDir}/*.js`);

    for (const file of files) {
        const code = await fs.readFile(file, "utf8");

        const result = await minify(code, {
            compress: {
                drop_console: true,
                drop_debugger: true
            },
            mangle: true,
        });

        const fileName = path.basename(file);
        const outputPath = path.join(jsOutputDir, fileName);

        await fs.writeFile(outputPath, result.code);
        console.log(`JS Minified: ${fileName}`);
    }
}

async function minifyCSS() {
    await fs.ensureDir(cssOutputDir);

    const files = await glob(`${cssInputDir}/*.css`);

    for (const file of files) {
        const css = await fs.readFile(file, "utf8");
        const minified = new CleanCSS().minify(css);

        const fileName = path.basename(file);
        const outputPath = path.join(cssOutputDir, fileName);

        await fs.writeFile(outputPath, minified.styles);
        console.log(`CSS Minified: ${fileName}`);
    }
}

async function build() {
    await minifyJS();
    await minifyCSS();
    console.log("✅ All files minified successfully");
}

build();