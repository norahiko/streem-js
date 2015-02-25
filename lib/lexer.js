"use strict";

var errors = require("./errors.js");

/**
* @enum {string}
*/
var TokenType = {
    Number: "Number",
    String: "String",
    Identifier: "Identifier",
    Punctor: "Punctor",
    Keyword: "Keyword",
    EOF: "[EOF]",
};

exports.TokenType = TokenType;


var patterns = {
    space          : /^[ \t\v]+/,
    comment        : /^#.*/,
    lineTerminator : /^\n\r?/,
    hex            : /^0x[0-9a-f]+\b/i,
    octal          : /^0[0-7]*\b/,
    float          : /^(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?\b/,
    stringD        : /^"(?:[^\n\r\\"]|\\x[0-9a-f]{2}|\\.)*"/i,
    stringS        : /^'(?:[^\n\r\\']|\\x[0-9a-f]{2}|\\.)*'/i,
    identifier     : /^[_a-z][_0-9a-z]*\??/i,
    punctor        : /^(?:\(|\)|\{|\}|\[|\]|,|\.|;|&&|\|\||\+=|-=|\*=|\/=|%=|&=|<<=|>>=|\|=|\^=|<-|->|<=|>=|==|!=|=|\+|-|\*|\/|%|<<|>>|&|\||\^|!|~)/,
};

var keywords = Object.create(null);
keywords.if = true;
keywords.else = true;
keywords.do = true;
keywords.break = true;
keywords.emit = true;
keywords.return = true;
keywords.skip = true;
keywords.true = true;
keywords.false = true;
keywords.null = true;


/**
 * @class
 * @param {TokenType} type
 * @param {string} token
 * @param {number} offset
 * @param {boolean} hasLineTerminator
 */
function Token(type, token, offset, hasLineTerminator) {
    this.type = type;
    this.token = token;
    this.offset = offset;
    this.hasLineTerminator = hasLineTerminator;
}


/**
 * @param {string} source
 * @return {Array.<Token>}
 */
exports.lex = function(source) {
    // jshint boss: true
    var src = source;
    var len = src.length;
    var offset = 0;
    var tokens = [];
    var match;
    var type;
    var hasLineTerminator = true;

    while(true) {
        if(offset === len) {
            tokens.push(new Token(TokenType.EOF, "[EOF]", offset, true));
            return tokens;
        }

        if(match = patterns.space.exec(src) || patterns.comment.exec(src)) {
            src = src.slice(match[0].length);
            offset += match[0].length;
            continue;
        }

        if(match = patterns.lineTerminator.exec(src)) {
            hasLineTerminator = true;
            src = src.slice(match[0].length);
            offset += match[0].length;
            continue;
        }

        if(match = patterns.identifier.exec(src)) {
            type = keywords[match[0]] ? TokenType.Keyword : TokenType.Identifier;
        } else if(match = patterns.stringD.exec(src) || patterns.stringS.exec(src)) {
            type = TokenType.String;
        } else if(match = patterns.punctor.exec(src)) {
            type = TokenType.Punctor;
        } else if(match = patterns.float.exec(src) || patterns.hex.exec(src) || patterns.octal.exec(src)) {
            type = TokenType.Number;
        } else {
            throw new errors.InvalidCharacter(offset);
        }

        var str = match[0];
        tokens.push(new Token(type, str, offset, hasLineTerminator));
        src = src.slice(str.length);
        offset += str.length;
        hasLineTerminator = str === ";" || str === "->" || str === "{";
    }
};
