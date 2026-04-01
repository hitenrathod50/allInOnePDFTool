const { minify } = require("terser");
const fs = require("fs-extra");
const { glob } = require("glob");
const path = require("path");
const CleanCSS = require("clean-css");
const JavaScriptObfuscator = require("javascript-obfuscator");

// Paths
const jsInputDir = "src/js";
const jsOutputDir = "public/js";

const cssInputDir = "src/css";
const cssOutputDir = "public/css";

// ✅ JS Minify + Obfuscate
async function minifyJS() {
    await fs.ensureDir(jsOutputDir);

    const files = await glob(`${jsInputDir}/*.js`);

    for (const file of files) {
        try {
            const code = await fs.readFile(file, "utf8");

            // 🔹 Step 1: Minify
            const minified = await minify(code, {
                compress: {
                    drop_console: true,
                    drop_debugger: true,
                },
                mangle: true,
            });

            if (!minified.code) {
                console.error(`❌ Failed to minify: ${file}`);
                continue;
            }

            // 🔹 Step 2: Light Obfuscation (size-friendly)
            const obfuscated = JavaScriptObfuscator.obfuscate(minified.code, {
                compact: true,

                // ⚠️ Keep size small
                controlFlowFlattening: false,
                deadCodeInjection: false,
                stringArray: true,
                stringArrayEncoding: [], // avoid base64
                stringArrayThreshold: 0.5,

                identifierNamesGenerator: "hexadecimal",
                renameGlobals: false,
                selfDefending: false,
            });

            const fileName = path.basename(file);
            const outputPath = path.join(jsOutputDir, fileName);

            await fs.writeFile(outputPath, obfuscated.getObfuscatedCode());

            console.log(`✅ JS Processed: ${fileName}`);
        } catch (err) {
            console.error(`❌ Error processing JS file: ${file}`, err);
        }
    }
}

// ✅ CSS Minify
async function minifyCSS() {
    await fs.ensureDir(cssOutputDir);

    const files = await glob(`${cssInputDir}/*.css`);

    for (const file of files) {
        try {
            const css = await fs.readFile(file, "utf8");
            const minified = new CleanCSS().minify(css);

            const fileName = path.basename(file);
            const outputPath = path.join(cssOutputDir, fileName);

            await fs.writeFile(outputPath, minified.styles);

            console.log(`✅ CSS Minified: ${fileName}`);
        } catch (err) {
            console.error(`❌ Error processing CSS file: ${file}`, err);
        }
    }
}

// 🚀 Build Runner
async function build() {
    console.log("🚀 Starting build...\n");

    await minifyJS();
    await minifyCSS();

    console.log("\n🎉 Build completed successfully!");
}

// Run
build();