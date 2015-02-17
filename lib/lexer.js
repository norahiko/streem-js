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
    LineTerminator: 4,
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
    identifier     : /^[_a-z][_0-9a-z]*/i,
    punctor        : /^(?:\(|\)|\{|\}|\[|\]|,|&&|\|\||\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<-|->|<=|>=|==|!=|\+|-|\*|\/|%|&|\||\^|!|~)/,
};


/**
 * @constructor
 * @param {TokenType} token
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
    var hasLineTerminator = false;

    while(true) {
        if(offset === len) {
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
            type = TokenType.Identifier;
        } else if(match = patterns.stringD.exec(src) || patterns.stringS.exec(src)) {
            type = TokenType.String;
        } else if(match = patterns.punctor.exec(src)) {
            type = TokenType.Punctor;
        } else if(match = patterns.float.exec(src) || patterns.hex.exec(src) || patterns.octal.exec(src)) {
            type = TokenType.Number;
        } else {
            throw new errors.InvalidToken(offset);
        }

        tokens.push(new Token(type, match[0], offset, hasLineTerminator));
        src = src.slice(match[0].length);
        offset += match[0].length;
        hasLineTerminator = false;
    }
};
