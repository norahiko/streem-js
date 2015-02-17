"use strict";

var assert = require("assert");
var lexer = require("../lib/lexer.js");
var lex = lexer.lex;
var TokenType = lexer.TokenType;


function ts(tokens) {
    return tokens.map(function(t) {
        return t.token;
    });
}

describe("scan number", function() {
    it("scan digit", function() {
        var tokens = lex(" 10 20");
        var first = tokens[0];
        var second = tokens[1];

        assert.equal(tokens.length, 2);
        assert.equal(first.token, "10");
        assert.equal(first.offset, 1);
        assert.equal(first.type, TokenType.Number);

        assert.equal(second.token, "20");
        assert.equal(second.offset, 4);
        assert.equal(second.type, TokenType.Number);
    });

    it("scan float", function() {
        var tokens = lex("1.23e+2");
        assert.equal(tokens[0].token, "1.23e+2");
        assert.equal(tokens[0].type, TokenType.Number);
    });

    it("fail float", function() {
        assert.throws(function() { lex("0.");
        });
        assert.throws(function() {
            lex("0.0e");
        });
        assert.throws(function() {
            lex(".0");
        });
    });

    it("scan hex", function() {
        var tokens = lex("0Xff");
        assert.equal(tokens[0].token, "0Xff");
        assert.equal(tokens[0].type, TokenType.Number);
    });

    it("fail hex", function() {
        assert.throws(function() {
            lex("0xzz");
        });
    });

    it("scan octal", function() {
        var tokens = lex("0123");
        assert.equal(tokens[0].token, "0123");
        assert.equal(tokens[0].type, TokenType.Number);
    });

    it("fail octal", function() {
        assert.throws(function() {
            lex("0128");
        });
    });
});

describe("scan string", function() {
    it("scan double quote", function() {
        var tokens = lex("\"hello, world\" \"\"");
        assert.equal(tokens[0].token, "\"hello, world\"");
        assert.equal(tokens[0].type, TokenType.String);
        assert.equal(tokens[1].token, "\"\"");
        assert.equal(tokens[1].offset, 15);
        assert.equal(tokens[1].type, TokenType.String);
    });

    it("scan single quote", function() {
        var tokens = lex("'hello, world' ''");
        assert.equal(tokens[0].token, "'hello, world'");
        assert.equal(tokens[0].type, TokenType.String);
        assert.equal(tokens[1].token, "''");
        assert.equal(tokens[1].offset, 15);
        assert.equal(tokens[1].type, TokenType.String);
    });

    it("fail string", function() {
        assert.throws(function() {
            lex("'newline\n'");
        });
    });
});

describe("scan identifier", function() {
    it("scan identifier", function() {
        var tokens = lex("foo bar");
        assert.equal(tokens[0].token, "foo");
        assert.equal(tokens[1].token, "bar");
    });
});

describe("tokenize", function() {
    it("expression 1", function() {
        var tokens = ts(lex("foo(1.0, \n  'str')"));
        assert.deepEqual(tokens, ["foo", "(", "1.0", ",", "'str'", ")"]);
    });
});
