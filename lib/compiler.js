const { getAST, getDependencier, transform } = require('./parser');
const path = require('path');
const fs = require('fs');

module.exports = class Compiler {
    constructor(options) {
        const { entry, output } = options;
        this.entry = entry;
        this.output = output;
        this.modules = [];
    }
    // 构建入口
    run() {
        const entryModule = this.buildModule(this.entry, true);
        // 循环处理依赖
        this.modules.push(entryModule);
        this.modules.map((_module) => {
            _module.dependencies.map((dependency) => {
                this.modules.push(this.buildModule(dependency, false));
            });
        });
        this.emitFiles();
    }
    // 需要获取 ast
    buildModule(filename, isEntry) {
        let ast;
        // 如果是入口模块，默认是绝对路径
        if (isEntry) {
            ast = getAST(filename);
        } else {
            // 相对路径转绝对路径 process.cwd()为根目录
            const absolutePath = path.join(process.cwd(), './src', filename);
            ast = getAST(absolutePath);
        }
        return {
            filename,
            dependencies: getDependencier(ast),
            source: transform(ast),
        };
    }
    emitFiles() {
        const outputPath = path.join(this.output.path, this.output.filename);
        let modules = '';
        this.modules.map((_module) => {
            modules += `'${_module.filename}': function(require, module, exports) { ${_module.source} },`;
        });
        const bundle = `(function(modules){
            function require(filename) {
                var fn = modules[filename];
                var module = { exports: {} };
                fn(require, module, module.exports);
                return module.exports;
            }
            require('${this.entry}')
        })({${modules}})`;

        fs.writeFileSync(outputPath, bundle, 'utf-8');
    }
};
