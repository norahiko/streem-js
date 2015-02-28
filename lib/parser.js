"use strict";

var lexer = require("./lexer");
var errors = require("./errors");
var TokenType = lexer.TokenType;


/**
 * @enum {string}
 */
var NodeType = {
    Program: "Program",
    Statement: "Statement",
    Block: "Block",
    Emit: "Emit",
    Skip: "Skip",
    Return: "Return",
    BinaryOperator: "BinaryOperator",
    Assign: "Assign",
    Unary: "Unary",
    If: "If",
    Else: "Else",
    Property: "Property",
    Call: "Call",
    Literal: "Literal",
    Identifier: "Identifier",
    Array: "Array",
    Paren: "Paren",
};

exports.NodeType = NodeType;


/**
 * @param {string} src
 * @return {ASTNode}
 */
exports.parse = function(src) {
    var tokens = lexer.lex(src);
    tokens.reverse();
    return parseProgram(tokens);
};

/**
 * @interface
 */
function ASTNode() {}
ASTNode.prototype.type = NodeType.Program;
ASTNode.prototype.offset = 0;
exports.ASTNode = ASTNode;


/**
 * @param {Array.<lexer.Token>} tokens
 * @return {Token}
 */
function peek(tokens) {
    return tokens[tokens.length - 1];
}

/**
 * @param {Array.<lexer.Token>} tokens
 * @return {Token}
 */
function shift(tokens) {
    if(tokens.length === 0) {
        throw new errors.UnexpectedEOF();
    }
    return tokens.pop();
}

/**
 * @param {Array.<lexer.Token>} tokens
 * @param {string} tokenStr
 * @return {Token}
 */
function expect(tokens, tokenStr) {
    if(tokens.length === 0) {
        throw new errors.UnexpectedEOF();
    }
    var token = tokens.pop();
    if(token.token !== tokenStr) {
        throw new errors.InvalidToken(token);
    }
    return token;
}

/**
 * @param {string} str
 * @return {string}
 */
function forceDoubleQuote(str) {
    if(str[0] === "\"") {
        return str;
    }
    return "\"" + str.slice(1, -1) + "\"";
}


/*
 * parser functions
 */

function parseProgram(tokens) {
    var statements = parseStatements(tokens);
    return {
        type: NodeType.Program,
        statements: statements,
        offset: 0,
    };
}

function parseStatements(tokens) {
    var statements = [];
    while(peek(tokens).type !== TokenType.EOF) {
        var token = peek(tokens);

        if(token.token === ";") {
            shift(tokens);
        } else if(token.token === "}") {
            break;
        } else if(token.hasLineTerminator) {
            statements.push(parseStatement(tokens));
        } else {
            throw new errors.InvalidToken(token);
        }
    }
    return statements;
}

function parseStatement(tokens) {
    var token = peek(tokens);
    if(token.token === "emit") {
        return parseEmit(tokens);

    } else if(token.token === "return") {
        return parseReturn(tokens);

    } else if(token.token === "skip") {
        return {
            type: NodeType.Skip,
            offset: shift(tokens).offset
        };

    } else {
        return parseAssign(tokens);
    }
}

function parseReturn(tokens) {
    var offset = expect(tokens, "return").offset;
    var token = peek(tokens);
    if(token.hasLineTerminator || token.token === "}") {
        var value = null;
    } else {
        value = parseExpression(tokens);
    }
    return {
        type: NodeType.Return,
        value: value,
        offset: offset,
    };
}

function parseEmit(tokens) {
    var offset = expect(tokens, "emit").offset;
    var token = peek(tokens);
    if(token.hasLineTerminator || token.token === "}") {
        var values = [];
    } else {
        values = parseArguments(tokens);
    }
    return {
        type: NodeType.Emit,
        values: values,
        offset: offset,
    };
}

function parseArguments(tokens) {
    var args = [];
    args.push(parseExpression(tokens));
    while(peek(tokens).token === ",") {
        shift(tokens);
        args.push(parseExpression(tokens));
    }
    return args;
}

function parseExpression(tokens) {
    return parseOr(tokens);
}

var assignOperators = {
    "=": 1, "+=": 1, "-=": 1, "*=": 1, "/=": 1, "%=": 1, "<<=": 1, ">>=": 1, "^=": 1, "&=": 1, "|=": 1,
};

function parseAssign(tokens) {
    var left = parseExpression(tokens);
    if(assignOperators[peek(tokens).token]) {
        var op = shift(tokens);
        if(left.type !== NodeType.Property && left.type !== NodeType.Identifier){
            throw new errors.InvalidAssignment(op);
        }
        var right = parseExpression(tokens);
        return {
            type: NodeType.Assign,
            operator:  op.token,
            left: left,
            right: right,
            offset: op.offset,
        };
    }
    return left;
}

function parseOr(tokens) {
    return binaryOperator(parseAnd, tokens, ["||"]);
}

function parseAnd(tokens) {
    return binaryOperator(parseBitOr, tokens, ["&&"]);
}

function parseBitOr(tokens) {
    return binaryOperator(parseBitXor, tokens, ["|"]);
}

function parseBitXor(tokens) {
    return binaryOperator(parseBitAnd, tokens, ["^"]);
}

function parseBitAnd(tokens) {
    return binaryOperator(parseEqual, tokens, ["&"]);
}

function parseEqual(tokens) {
    return binaryOperator(parseCompare, tokens, ["==", "!="]);
}

function parseCompare(tokens) {
    return binaryOperator(parseBitShift, tokens, ["<", ">", "<=", ">="]);
}

function parseBitShift(tokens) {
    return binaryOperator(parseAdditive, tokens, ["<<", ">>"]);
}

function parseAdditive(tokens) {
    return binaryOperator(parseMultiplicative, tokens, ["+", "-"]);
}

function parseMultiplicative(tokens) {
    return binaryOperator(parseUnary, tokens, ["*", "/", "%"]);
}

function binaryOperator(parser, tokens, operators) {
    var left = parser(tokens);
    while(true) {
        if(operators.indexOf(peek(tokens).token) === -1) {
            break;
        }
        var op = shift(tokens);
        left = {
            type: NodeType.BinaryOperator,
            operator: op.token,
            left: left,
            right: parser(tokens),
            offset: op.offset,
        };
    }
    return left;
}

var unaryOperators = { "+": 1, "-": 1, "!": 1, "~": 1 };

function parseUnary(tokens) {
    if(unaryOperators[peek(tokens).token]) {
        var op = shift(tokens);
        return {
            type: NodeType.Unary,
            operator: op.token,
            expr: parseUnary(tokens),
            offset: op.offset,
        };
    }
    return parsePrimary(tokens);
}

function parsePrimary(tokens) {
    var t = peek(tokens);
    if(t.token === "if") {
        return parseIf(tokens);
    }

    if(t.token === "{") {
        var node = parseBlock(tokens);
    } else {
        node = parseLiteral(tokens);
    }

    while(true) {
        t = peek(tokens);
        if(t.token === ".") {
            var offset = shift(tokens).offset;
            node = {
                type: NodeType.Property,
                object: node,
                property: parseIdentifier(tokens),
                offset: offset,
            };
        } else if(t.token === "(") {
            offset = shift(tokens).offset;
            node = {
                type: NodeType.Call,
                object: node,
                args: (peek(tokens).token === ")") ? [] : parseArguments(tokens),
                offset: offset,
            };
            expect(tokens, ")");
        } else {
            break;
        }
    }
    return node;
}

function parseBlock(tokens) {
    var offset = expect(tokens, "{").offset;
    var t = peek(tokens);
    if(t.token === "->") {
        var params = [];
        shift(tokens);
    } else {
        if(tryParseParameters(tokens)) {
            params = parseParameters(tokens);
        } else {
            params = [];
        }
    }

    var statements = parseStatements(tokens);
    expect(tokens, "}");

    return {
        type: NodeType.Block,
        statements: statements,
        params: params,
        offset: offset,
    };
}

function tryParseParameters(tokens) {
    if(tokens.length < 2) {
        return false;
    }
    var i = tokens.length - 2;
    while(0 <= i) {
        if(tokens[i].token === "->") {
            return true;
        }
        if(tokens[i].token !== "," && tokens[i].type !== TokenType.Identifier) {
            return false;
        }
        i--;
    }
}

function parseParameters(tokens) {
    var params = [parseIdentifier(tokens).name];
    while(peek(tokens).token === ",") {
        shift(tokens);
        var param = parseIdentifier(tokens);
        if(params.indexOf(param.name) !== -1) {
            throw new errors.InvalidToken(param);
        }
        params.push(param.name);
    }

    expect(tokens, "->");
    return params;
}


function parseElseIf(tokens) {
    var offset = expect(tokens, "else").offset;
    if(peek(tokens).token === "if") {
        return parseIf(tokens);
    } else {
        expect(tokens, "{");
        var statements = parseStatements(tokens);
        expect(tokens, "}");
        return {
            type: NodeType.Else,
            statements: statements,
            offset: offset,
        };
    }
}


function parseIf(tokens) {
    var offset = expect(tokens, "if").offset;
    if(peek(tokens).token === "{") {
        throw new errors.InvalidToken(peek(tokens));
    }
    var condition = parseExpression(tokens);
    expect(tokens, "{");
    var statements = parseStatements(tokens);
    expect(tokens, "}");

    var node = {
        type: NodeType.If,
        condition: condition,
        statements: statements,
        else: null,
        offset: offset,
    };

    if(peek(tokens).token === "else") {
        node.else = parseElseIf(tokens);
    }
    return node;
}

function parseIdentifier(tokens) {
    var token = shift(tokens);
    if(token.type !== TokenType.Identifier) {
        throw new errors.InvalidToken(token);
    }
    return {
        type: NodeType.Identifier,
        name: token.token,
        offset: token.offset,
    };
}

function parseLiteral(tokens) {
    var type = NodeType.Literal;
    var token = peek(tokens);
    var value;

    if(token.token === "[") {
        return parseArrayLiteral(tokens);
    } else if(token.token === "(") {
        return parseParen(tokens);
    } else if(token.type === TokenType.Identifier) {
        return parseIdentifier(tokens);
    }

    if(token.type === TokenType.Number) {
        value = Number(token.token);

    } else if(token.type === TokenType.String) {
        var str = forceDoubleQuote(token.token);
        value = JSON.parse(str);

    } else if(token.token === "null") {
        value = null;

    } else if(token.token === "true") {
        value = true;

    } else if(token.token === "false") {
        value = false;

    } else {
        if(token.type === TokenType.EOF) {
            throw new errors.UnexpectedEOF();
        } else {
            throw new errors.InvalidToken(token);
        }
    }
    shift(tokens);

    return {
        type: type,
        value: value,
        token: token.token,
        offset: token.offset,
    };
}

function parseParen(tokens) {
    var offset = expect(tokens, "(").offset;
    var expr = parseExpression(tokens);
    expect(tokens, ")");
    return {
        type: NodeType.Paren,
        expr: expr,
        offset: offset,
    };
}

function parseArrayLiteral(tokens) {
    var offset = expect(tokens, "[").offset;
    var elements = peek(tokens).token === "]" ? [] : parseArguments(tokens);
    expect(tokens, "]");
    return {
        type: NodeType.Array,
        elements: elements,
        offset: offset,
    };
}
