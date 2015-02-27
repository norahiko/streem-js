#!/usr/bin/env node
"use strict";

var fs = require("fs");

exports.environment = require("./environment");
exports.lexer = require("./lexer");
exports.parser = require("./parser");
exports.runtime = require("./runtime");
exports.vm = require("./vm");

function main() {
    var argv = require("minimist")(process.argv);

    if(argv.h || argv.help) {
        console.log("usage: streem-js [source]");
        return;
    }

    if(argv._.length < 3) {
        var src = readInputSync();
        var filename = "<stdin>";
    } else {
        filename = process.argv[2];
        src = fs.readFileSync(process.argv[2]).toString();
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

if(module === process.mainModule) {
    main();
}
