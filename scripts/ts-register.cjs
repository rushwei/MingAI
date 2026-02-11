const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');

function resolveAlias(request) {
    if (request === 'server-only') {
        return path.join(projectRoot, 'scripts', 'server-only-stub.js');
    }

    if (!request.startsWith('@/')) return null;

    const target = path.join(srcRoot, request.slice(2));
    const candidates = [
        target,
        `${target}.ts`,
        `${target}.tsx`,
        `${target}.js`,
        `${target}.jsx`,
        path.join(target, 'index.ts'),
        path.join(target, 'index.tsx'),
        path.join(target, 'index.js'),
        path.join(target, 'index.jsx'),
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
    const resolved = resolveAlias(request);
    if (resolved) {
        return originalResolveFilename.call(this, resolved, parent, isMain, options);
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
};

function compileTs(module, filename) {
    const source = fs.readFileSync(filename, 'utf8');
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2019,
            jsx: ts.JsxEmit.ReactJSX,
            esModuleInterop: true,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
        },
        fileName: filename,
    });
    module._compile(outputText, filename);
}

Module._extensions['.ts'] = compileTs;
Module._extensions['.tsx'] = compileTs;
