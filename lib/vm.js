"use strict";

var assert = require("assert");
var path = require("path");
var parser = require("./parser");
var environment = require("./environment");
var errors = require("./errors");
var runtime = require("./runtime");
var State = environment.State;
var NodeType = parser.NodeType;


/**
 * @return {environment.Env}
 */
exports.createGlobal = function() {
    var env = new environment.Env();
    env.define("STDIN", runtime.STDIN);
    env.define("STDOUT", runtime.STDOUT);
    env.define("STDERR", runtime.STDERR);
    env.define("seq", runtime.seq);
    return env;
};

/**
 * @param {string} filename
 * @param {string} src
 * @param {Error} err
 */
exports.printError = function(filename, src, err) {
    var offset = (err.offset === undefined) ? src.length : err.offset;
    var lines = src.split("\n");
    var c = 0;
    for(var line = 0; line < lines.length; line++) {
        if(offset <= c + lines[line].length) {
            break;
        }
        c += lines[line].length + 1;
    }
    var errorAt = offset - c;
    filename = filename !== "<stdin>" ? path.resolve(filename) : filename;

    console.error("StreemError: %s (%s:%d:%d)", err.message, filename, line + 1, errorAt + 1);
    console.error(lines[line]);
    console.error(runtime.repeatString(" ", errorAt) + "^");
};


/**
 * @param {string} filename
 * @param {string} src
 */
exports.run = function(filename, src) {
    try {
        var ast = parser.parse(src);
        var env = exports.createGlobal();
        var value = evaluateStatements(env, ast.statements);
        return new StreemResult(value, null);

    } catch(err) {
        if(err instanceof errors.StreemError || err instanceof runtime.RuntimeError) {
            exports.printError(filename, src, err);
            return new StreemResult(null, err);
        }
        throw err;
    }
};

/**
 * @class
 * @param {*} value
 * @param {Error} err
 */
function StreemResult(value, err) {
    this.value = value;
    this.err = err;
}


function evaluate(env, node) {
    return evaluators[node.type](env, node);
}

function evaluateStatements(env, stmts) {
    var rv = null;
    for(var i = 0; i < stmts.length; i++) {
        rv = evaluate(env, stmts[i]);
        if(env.state === State.Skip) {
            return null;
        } else if(env.state === State.Return) {
            return rv;
        }
    }
    return rv;
}

/**
 * @callback invoker
 * @param {environment.Env} env
 * @param {parser.ASTNode} node
 * @return {*}
 */

/**
 * @type {Object.<string, invoker>}
 */
var evaluators = Object.create(null);

evaluators[NodeType.Statement] = function(env, node) {

};

evaluators[NodeType.Literal] = function(env, node) {
    return node.value;
};

evaluators[NodeType.Identifier] = function(env, node) {
    return env.getVar(node);
};

function getProperty(object, prop) {
    if(object === null) {
        throw new runtime.PropertyOfNull(prop.name, prop.offset);
    }
    var value = object[prop.name];
    if(value === undefined) {
        throw new runtime.UndefinedProperty(prop.name, object, prop.offset);
    }
    return value;

}

evaluators[NodeType.Property] = function(env, node) {
    var object = evaluate(env, node.object);
    var prop = node.property;
    return getProperty(object, prop);
};

evaluators[NodeType.BinaryOperator] = function(env, node) {
    var left = evaluate(env, node.left);
    var right = evaluate(env, node.right);
    var op = node.operator;
    var offset = node.offset;
    switch(op) {
        case "+"  : return runtime.add(left, right, offset);
        case "-"  : return runtime.sub(left, right, offset);
        case "*"  : return runtime.mul(left, right, offset);
        case "/"  : return runtime.div(left, right, offset);
        case "%"  : return runtime.mod(left, right, offset);
        case "&"  : return runtime.bitand(left, right, offset);
        case "|"  : return runtime.bitor(left, right, offset);
        case "^"  : return runtime.bitxor(left, right, offset);
        case "<<" : return runtime.lshift(left, right, offset);
        case ">>" : return runtime.rshift(left, right, offset);
        case "<"  : return runtime.lt(left, right, offset);
        case ">"  : return runtime.gt(left, right, offset);
        case "<=" : return runtime.le(left, right, offset);
        case ">=" : return runtime.ge(left, right, offset);
        case "==" : return runtime.eq(left, right, offset);
        case "!=" : return runtime.ne(left, right, offset);
        case "&&" : return runtime.and(left, right, offset);
        case "||" : return runtime.or(left, right, offset);
    }
    throw new errors.CriticalError();
};

evaluators[NodeType.If] = function(env, node) {
    var cond = evaluate(env, node.condition);
    if(runtime.toBoolean(cond)) {
        return evaluateStatements(env, node.statements);
    } else if(node.else !== null) {
        return evaluate(env, node.else);
    }
    return null;
};

evaluators[NodeType.Else] = function(env, node) {
    return evaluateStatements(env, node.statements);
};

evaluators[NodeType.Unary] = function(env, node) {
    var value = evaluate(env, node.expr);
    var offset = node.offset;
    switch(node.operator) {
        case "!": return runtime.not(value, offset);
        case "+": return runtime.positive(value, offset);
        case "-": return runtime.negative(value, offset);
        case "~": return runtime.inverse(value, offset);
    }
    throw new errors.CriticalError();
};

evaluators[NodeType.Assign] = function(env, node) {
    var rightValue = evaluate(env, node.right);
    if(node.left.type === NodeType.Identifier) {
        if(node.operator === "=") {
            env.setVar(node.left, rightValue);
        } else {
            var leftValue = env.getVar(node.left);
            var result;
            switch(node.operator) {
                case "+="  : result = runtime.add(leftValue, rightValue); break;
                case "-="  : result = runtime.sub(leftValue, rightValue); break;
                case "*="  : result = runtime.mul(leftValue, rightValue); break;
                case "/="  : result = runtime.div(leftValue, rightValue); break;
                case "%="  : result = runtime.mod(leftValue, rightValue); break;
                case "<<=" : result = runtime.lshift(leftValue, rightValue); break;
                case ">>=" : result = runtime.rshift(leftValue, rightValue); break;
                case "&="  : result = runtime.bitand(leftValue, rightValue); break;
                case "|="  : result = runtime.bitor(leftValue, rightValue); break;
                case "^="  : result = runtime.bitxor(leftValue, rightValue); break;
                default: throw new errors.CriticalError();
            }
            env.setVar(node.left, result);
        }
        return rightValue;
    } else {
        assert(node.left.type === NodeType.Property);
        var leftObject = evaluate(env, node.left.object);
        runtime.assignProperty(node.operator, leftObject, node.left.property.name, rightValue);
    }
    return rightValue;
};

evaluators[NodeType.Paren] = function(env, node) {
    return evaluate(env, node.expr);
};

evaluators[NodeType.Skip] = function(env, node) {
    env.skip();
    return null;
};

evaluators[NodeType.Return] = function(env, node) {
    var value = evaluate(env, node.value);
    env.return();
    return value;
};

evaluators[NodeType.Array] = function(env, node) {
    var array = [];
    for(var i = 0; i < node.elements.length; i++) {
        array.push(evaluate(env, node.elements[i]));
    }
    return array;
};

evaluators[NodeType.Emit] = function(env, node) {
    for(var i = 0; i < node.values.length; i++) {
        var value = evaluate(env, node.values[i]);
        env.emit(value);
    }
};

evaluators[NodeType.Call] = function(env, node) {
    var func = node.object;
    while(func.type === NodeType.Paren) {
        func = func.expr;
    }

    var receiver = null;
    if(func.type === NodeType.Property) {
        receiver = evaluate(env, func.object);
        func = getProperty(receiver, func.property);
    } else if(func.type === NodeType.Identifier) {
        func = evaluate(env, func);
    } else if(func.type === NodeType.Block) {
        func = evaluate(env, func);
    } else {
        throw new runtime.NotCallable(func.offset);
    }

    if(func === null) {
        throw new runtime.NotCallable(func.offset);
    }

    var args = [];
    for(var i = 0; i < node.args.length; i++) {
        args.push(evaluate(env, node.args[i]));
    }

    if(typeof func === "function") {
        return func.apply(receiver, args);
    } else {
        throw new Error("What?");
    }
};

evaluators[NodeType.Block] = function(_env, node) {
    return function() {
        var env  = _env.create();
        if(arguments.length !== node.params.length) {
            throw new runtime.WrongNumberOfArguments(node.offset);
        }

        for(var i = 0; i < arguments.length; i++) {
            env.define(node.params[i], arguments[i]);
        }

        env.resetState();
        var rv = evaluateStatements(env, node.statements);

        if(this instanceof runtime.Streem) {
            for(i = 0; i < env.emitBuffer.length; i++) {
                this.queue.enqueue(env.emitBuffer[i]);
            }

            if(env.state === State.Skip) {
                this.skip();
            }

            if(rv !== null) {
                this.queue.enqueue(rv);
            }
        }
        env.emitBuffer.length = 0;
        return rv;
    };
};
