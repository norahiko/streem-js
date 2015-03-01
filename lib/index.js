#!/usr/bin/env node
"use strict";

var fs = require("fs");

exports.compiler = require("./compiler");
exports.environment = require("./environment");
exports.lexer = require("./lexer");
exports.parser = require("./parser");
exports.runtime = require("./runtime");
exports.vm = require("./vm");

if(module === process.mainModule) {
    main();
}

function main() {
    var argv = require("minimist")(process.argv);
    if(argv.h || argv.help) {
        console.log("usage: streem-js [source]");
        return;
    }

    if(argv.c) {
        compile(argv);
    } else {
        run(argv);
    }
}

function compile(argv) {
    if(2 < argv._.length) {
        var filename = argv._[2];
        var src = fs.readFileSync(filename).toString();
    } else if(argv.c === true) {
        filename = "<stdin>";
        src = readInputSync();
    } else {
        filename = argv.c;
        src = fs.readFileSync(filename).toString();
    }

    var outfile = argv.out || argv.o;
    var output = exports.compiler.compile(filename, src);
    if(outfile) {
        fs.writeFileSync(outfile, output);
    } else {
        process.stdout.write(output);
    }

    // copy ./runtime.js to current directory
    var p = require.resolve("./runtime.js");
    fs.createReadStream(p).pipe(fs.createWriteStream(exports.compiler.runtimeFilename));
}

function run(argv) {
    if(2 < argv._.length) {
        var filename = argv._[2];
        var src = fs.readFileSync(filename).toString();
    } else {
        filename = "<stdin>";
        src = readInputSync();
    }


    var res = exports.vm.run(filename, src);
    if(res.err !== null) {
        process.exit(1);
    }
}

function readInputSync() {
    var fd = 0;
    var input = "";
    var buf = new Buffer(8 * 1024);
    while(true) {
        var readBytes = fs.readSync(fd, buf, 0, buf.length, null);
        if(readBytes === 0) {
            break;
        }
        input += buf.slice(0, readBytes).toString();
    }
    return input;
}
