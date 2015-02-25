"use strict";

exports.environment = require("./environment");
exports.lexer = require("./lexer");
exports.parser = require("./parser");
exports.runtime = require("./runtime");
exports.vm = require("./vm");

function main() {
    var argv = require("minimist")(process.argv);
    console.log(argv);

}

if(module === process.mainModule) {
    main();
}
