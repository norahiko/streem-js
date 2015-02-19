"use strict";

var lexer = require("./lexer.js");
var errors = require("./errors.js");
var TokenType = lexer.TokenType;


/**
 * @enum {string}
 */
var NodeType = {
    Program: "Program",
    Statement: "Statement",
    Block: "Block",
    Emit: "Emit",
    Return: "Return",
    BinaryOperator: "BinaryOperator",
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
 * @interface
 */
function ASTNode() {}
ASTNode.prototype.type = NodeType.Program;

/**
 * @param {string} src
 * @return {ASTNode}
 */
exports.parse = function(src) {
    var tokens = lexer.lex(src);
    tokens.reverse();
    return parseProgram(tokens);
};


/*
 * parser functions
 */

/**
 * @param {Array.<lexer.Token>} tokens
 * @return Token
 */
function peek(tokens) {
    return tokens[tokens.length - 1];
}

/**
 * @param {Array.<lexer.Token>} tokens
 * @return Token
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
 */
function expect(tokens, tokenStr) {
    if(tokens.length === 0) {
        throw new errors.UnexpectedEOF();
    }
    var token = tokens.pop();

    if(token.token !== tokenStr) {
        console.log(token);
        throw new errors.InvalidToken(token);
    }
}

function parseProgram(tokens) {
    var body = parseStatements(tokens);
    return {
        type: NodeType.Program,
        body: body,
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
            console.log(token);
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
    } else {
        return parseExpression(tokens);
    }
}

function parseReturn(tokens) {
    expect(tokens, "return");
    if(peek(tokens).hasLineTerminator) {
        var args = [];
    } else {
        args = parseArguments(tokens);
    }
    return {
        type: NodeType.Return,
        args: args,
    };
}

function parseEmit(tokens) {
    expect(tokens, "emit");
    if(peek(tokens).hasLineTerminator) {
        var args = [];
    } else {
        args = parseArguments(tokens);
    }
    return {
        type: NodeType.Emit,
        args: args,
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
    return parseAssign(tokens);
}

var assignOperators = {
    "=": 1, "+=": 1, "-=": 1, "*=": 1, "/=": 1, "%=": 1, "^=": 1, "&=": 1, "|=": 1,
};

function parseAssign(tokens) {
    var left = parseOr(tokens);
    if(assignOperators[peek(tokens).token]) {
        var op = shift(tokens);
        var right = parseAssign(tokens);
        return {
            type: NodeType.BinaryOperator,
            operator:  op.token,
            left: left,
            right: right
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
    return binaryOperator(parseAdditive, tokens, ["<", ">", "<=", ">="]);
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
        left = {
            type: NodeType.BinaryOperator,
            operator: shift(tokens).token,
            left: left,
            right: parser(tokens),
        };
    }
    return left;
}

var unaryOperators = { "+": 1, "-": 1, "!": 1, "~": 1 };

function parseUnary(tokens) {
    if(unaryOperators[peek(tokens).token]) {
        return {
            type: NodeType.Unary,
            operator: shift(tokens).token,
            expr: parseUnary(tokens),
        };
    }
    return parsePrimary(tokens);
}

function parsePrimary(tokens) {
    var t = peek(tokens);
    if(t.token === "{") {
        return parseBlock(tokens);
    } else if(t.token === "if") {
        return parseIf(tokens);
    }

    var node = parseLiteral(tokens);

    while(true) {
        t = peek(tokens);
        if(t.token === ".") {
            shift(tokens);
            node = {
                type: NodeType.Property,
                object: node,
                key: parseIdentifier(tokens).token,
            };
        } else if(t.token === "(") {
            shift(tokens);
            node = {
                type: NodeType.Call,
                object: node,
                args: (peek(tokens).token === ")") ? [] : parseArguments(tokens),
            };
            expect(tokens, ")");
        } else {
            break;
        }
    }
    return node;
}

function parseBlock(tokens) {
    expect(tokens, "{");
    var t = peek(tokens);
    if(t.token === "->") {
        var params = [];
        shift(tokens);
    } else {
        params = parseParameters(tokens);
        expect(tokens, "->");
    }


    var statements = parseStatements(tokens);
    expect(tokens, "}");

    return {
        type: NodeType.Block,
        statements: statements,
        params: params,
    };
}


function parseParameters(tokens) {
    var params = [parseIdentifier(tokens).token];
    while(peek(tokens).token === ",") {
        shift(tokens);
        params.push(parseIdentifier(tokens).token);
    }
    return params;
}


function parseElseIf(tokens) {
    expect(tokens, "else");
    if(peek(tokens).token === "if") {
        return parseIf(tokens);
    } else {
        expect(tokens, "{");
        var statements = parseStatements(tokens);
        expect(tokens, "}");
        return {
            type: NodeType.Else,
            statements: statements,
        };
    }
}

function parseIf(tokens) {
    expect(tokens, "if");
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
    return token;
}

function parseLiteral(tokens) {
    var type = NodeType.Literal;
    var token = peek(tokens);
    var value;

    if(token.token === "[") {
        return parseArrayLiteral(tokens);
    } else if(token.token === "(") {
        return parseParen(tokens);
    }

    if(token.type === TokenType.Number) {
        value = Number(token.token);

    } else if(token.type === TokenType.String) {
        value = JSON.parse(token.token);

    } else if(token.token === "null") {
        value = null;

    } else if(token.token === "true") {
        value = true;

    } else if(token.token === "false") {
        value = false;

    } else if(token.type === TokenType.Identifier) {
        value = token.token;
        type = NodeType.Identifier;

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
    };
}

function parseParen(tokens) {
    expect(tokens, "(");
    var expr = parseExpression(tokens);
    expect(tokens, ")");
    return {
        type: NodeType.Paren,
        expr: expr,
    };
}

function parseArrayLiteral(tokens) {
    expect(tokens, "[");
    var elements = peek(tokens).token === "]" ? [] : parseArguments(tokens);
    expect(tokens, "]");
    return {
        type: NodeType.Array,
        elements: elements,
    };
}
