//var vm = require("../lib/vm");
var assert = require("assert");
var fs = require("fs");
var child_process = require("child_process");

function runTest(src, expected, done) {
    var cmd = "node lib/index.js " + src;
    child_process.exec(cmd, function(err, out) {
        assert(err === null);
        assert.equal(out, expected);
        compileTest(src, expected, done);
    });
}

function compileTest(src, expected, done) {
    var cmd = "node lib/index.js -c " + src + " | node";
    child_process.exec(cmd, function(err, out) {
        assert(err === null);
        assert.equal(out, expected);
        done();
    });
}

describe("Run examples", function() {
    this.slow(400);

    it("closure.strm", function(done) {
        runTest("examples/closure.strm", "6\n7\n8\n9\n10\n11\n12\n13\n14\n", done);
    });

    it("skip.strm", function(done) {
        runTest("examples/skip.strm", "1\n3\n5\n7\n9\n11\n13\n15\n17\n19\n", done);
    });

    it("block.strm", function(done) {
        runTest("examples/block.strm", "bar\n", done);
    });

    it("emit.strm", function(done) {
        runTest("examples/emit.strm", "1\n-1\n2\n-2\n3\n-3\n4\n-4\n5\n-5\n", done);
    });

    it("write-file.strm", function(done) {
        runTest("examples/write-file.strm", "", done);
        var out = fs.readFileSync("test/out.txt").toString();
        var expected = "-\n--\n---\n----\n-----\n------\n-------\n--------\n---------\n----------\n";
        assert.equal(out, expected);
    });

    it("if.strm", function(done) {
        runTest("examples/if.strm", "true\n", done);
    });

    it("read-file.strm", function(done) {
        var expected = fs.readFileSync("README.md").toString().toUpperCase();
        runTest("examples/read-file.strm", expected, done);
    });

    it("fizzbuzz.strm", function(done) {
        var expected = "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n16\n17\nFizz\n19\nBuzz\nFizz\n22\n23\nFizz\nBuzz\n26\nFizz\n28\n29\nFizzBuzz\n31\n32\nFizz\n34\nBuzz\nFizz\n37\n38\nFizz\nBuzz\n41\nFizz\n43\n44\nFizzBuzz\n46\n47\nFizz\n49\nBuzz\nFizz\n52\n53\nFizz\nBuzz\n56\nFizz\n58\n59\nFizzBuzz\n61\n62\nFizz\n64\nBuzz\nFizz\n67\n68\nFizz\nBuzz\n71\nFizz\n73\n74\nFizzBuzz\n76\n77\nFizz\n79\nBuzz\nFizz\n82\n83\nFizz\nBuzz\n86\nFizz\n88\n89\nFizzBuzz\n91\n92\nFizz\n94\nBuzz\nFizz\n97\n98\nFizz\nBuzz\n";
        runTest("examples/fizzbuzz.strm", expected, done);
    });
});
