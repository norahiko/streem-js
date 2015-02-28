//var vm = require("../lib/vm");
var assert = require("assert");
var child_process = require("child_process");

function runtest(src, expected, done) {
    var p = child_process.spawn("node", ["lib/index.js", src]);
    var output = "";

    p.stdout.on("data", function(data) {
        output += data.toString();
    });

    p.stderr.on("data", function(data) {
        console.error(data.toString());
    });

    p.on("exit", function() {
        assert.equal(output, expected);
        done();
    });
}


describe("Run examples", function() {
    this.slow(200);

    it("closure.strm", function(done) {
        runtest("examples/closure.strm", "6\n7\n8\n9\n10\n11\n12\n13\n14\n", done);
    });

    it("skip.strm", function(done) {
        runtest("examples/skip.strm", "1\n3\n5\n7\n9\n11\n13\n15\n17\n19\n", done);
    });

    it("block.strm", function(done) {
        runtest("examples/block.strm", "bar\n", done);
    });

    it("fizzbuzz.strm", function(done) {
        var expected = "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n16\n17\nFizz\n19\nBuzz\nFizz\n22\n23\nFizz\nBuzz\n26\nFizz\n28\n29\nFizzBuzz\n31\n32\nFizz\n34\nBuzz\nFizz\n37\n38\nFizz\nBuzz\n41\nFizz\n43\n44\nFizzBuzz\n46\n47\nFizz\n49\nBuzz\nFizz\n52\n53\nFizz\nBuzz\n56\nFizz\n58\n59\nFizzBuzz\n61\n62\nFizz\n64\nBuzz\nFizz\n67\n68\nFizz\nBuzz\n71\nFizz\n73\n74\nFizzBuzz\n76\n77\nFizz\n79\nBuzz\nFizz\n82\n83\nFizz\nBuzz\n86\nFizz\n88\n89\nFizzBuzz\n91\n92\nFizz\n94\nBuzz\nFizz\n97\n98\nFizz\nBuzz\n";
        runtest("examples/fizzbuzz.strm", expected, done);
    });
});
