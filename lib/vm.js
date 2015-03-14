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
    env.root = true;
    env.define("STDIN", runtime.STDIN);
    env.define("STDOUT", runtime.STDOUT);
    env.define("STDERR", runtime.STDERR);
    env.define("FLUSH", runtime.FLUSH);
    env.define("seq", runtime.seq);
    env.define("file", runtime.file);
    env.define("print", runtime.print);
    env.define("println", runtime.println);
    env.define("log", runtime.log);
    env.define("timeout", runtime.timeout);
    env.define("wait", runtime.wait);
    env.define("string", String);
    env.define("number", Number);
    env.define("parseInt", parseInt);
    env.define("parseFloat", parseFloat);
    env.define("Boolean", runtime.toBoolean);
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
        var vm = new VM();
        var env = exports.createGlobal();
        process.on("uncaughtException", function(err) {
            if(err instanceof errors.StreemError || err instanceof runtime.RuntimeError) {
                exports.printError(filename, src, err);
            }
        });

        var value = vm.invoke(ast, env);
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


/**
 * @class
 */
function VM() {
}

VM.prototype.invoke = function(node, env) {
    return this[node.type](node, env);
};

VM.prototype.Program = function(node, env) {
    return this.invokeStatements(node.statements, env);
};

VM.prototype.invokeStatements = function(nodes, env) {
    var rv = null;
    for(var i = 0; i < nodes.length; i++) {
        rv = this.invoke(nodes[i], env);
        if(env.state === State.Skip) {
            return null;
        } else if(env.state === State.Return) {
            return rv;
        }
    }
    return rv;
};


VM.prototype.Literal = function(node, env) {
    return node.value;
};

VM.prototype.Identifier = function(node, env) {
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

VM.prototype.Property = function(node, env) {
    var object = this.invoke(node.object, env);
    var prop = node.property;
    return getProperty(object, prop);
};

VM.prototype.BinaryOperator = function(node, env) {
    var left = this.invoke(node.left, env);
    var right = this.invoke(node.right, env);
    var op = node.operator;
    var offset = node.offset;

    switch(op) {
        case "+"  : return runtime.add(left, right, offset);
        case "-"  : return runtime.sub(left, right, offset);
        case "*"  : return runtime.mul(left, right, offset);
        case "/"  : return runtime.div(left, right, offset);
        case "%"  : return runtime.mod(left, right, offset);
        case "&"  : return runtime.bitand(left, right, offset);
        case "|"  : return runtime.pipe(left, right, offset);
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

VM.prototype.If = function(node, env) {
    var cond = this.invoke(node.condition, env);
    if(runtime.toBoolean(cond)) {
        return this.invokeStatements(node.statements, env);
    } else if(node.else !== null) {
        return this.invoke(node.else, env);
    }
    return null;
};

VM.prototype.Else = function(node, env) {
    return this.invokeStatements(node.statements, env);
};

VM.prototype.Unary = function(node, env) {
    var value = this.invoke(node.expr, env);
    var offset = node.offset;
    switch(node.operator) {
        case "!": return runtime.not(value, offset);
        case "+": return runtime.positive(value, offset);
        case "-": return runtime.negative(value, offset);
        case "~": return runtime.inverse(value, offset);
    }
    throw new errors.CriticalError();
};

VM.prototype.Assign = function(node, env) {
    var rightValue = this.invoke(node.right, env);
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
                case "|="  : result = runtime.pipe(leftValue, rightValue); break;
                case "^="  : result = runtime.bitxor(leftValue, rightValue); break;
                default: throw new errors.CriticalError();
            }
            env.setVar(node.left, result);
        }
        return rightValue;
    } else {
        assert(node.left.type === NodeType.Property);
        var leftObject = this.invoke(node.left.object, env);
        runtime.assignProperty(leftObject, node.left.property.name, node.operator, rightValue);
    }
    return rightValue;
};

VM.prototype.Paren = function(node, env) {
    return this.invoke(node.expr, env);
};

VM.prototype.Skip = function(node, env) {
    env.skip();
    return null;
};

VM.prototype.Return = function(node, env) {
    var value = this.invoke(node.value, env);
    env.return();
    return value;
};

VM.prototype.Array = function(node, env) {
    var array = [];
    for(var i = 0; i < node.elements.length; i++) {
        array.push(this.invoke(node.elements[i], env));
    }
    return array;
};

VM.prototype.Emit = function(node, env) {
    var e = env;
    while(e !== null) {
        if(e.blockStreem) {
            break;
        }
        e = e.parent;
    }

    for(var i = 0; i < node.values.length; i++) {
        var value = this.invoke(node.values[i], env);
        if(e) {
            e.blockStreem.emit(value);
        } else {
            env.emitBuffer.push(value);
        }
    }

    return null;
};

VM.prototype.Call = function(node, env) {
    var funcNode = node.object;
    while(funcNode.type === NodeType.Paren) {
        funcNode = funcNode.expr;
    }

    var receiver = null;
    var func = null;
    if(funcNode.type === NodeType.Property) {
        receiver = this.invoke(funcNode.object, env);
        func = getProperty(receiver, funcNode.property);
    } else if(funcNode.type === NodeType.Identifier) {
        func = this.invoke(funcNode, env);
    } else {
        func = this.invoke(funcNode, env);
    }

    if(typeof func !== "function") {
        throw new runtime.NotCallable(funcNode.offset);
    }

    var args = [];
    for(var i = 0; i < node.args.length; i++) {
        args.push(this.invoke(node.args[i], env));
    }

    if(func.paramLength !== undefined && func.paramLength !== args.length) {
        throw new runtime.WrongNumberOfArguments(node.offset);
    }

    var res = func.apply(receiver, args);
    return res === undefined ? null : res;
};

VM.prototype.Block = function(node, env_) {
    // jshint validthis: true
    var vm = this;

    function blockFunction() {
        var env = env_.create();

        for(var i = 0; i < arguments.length; i++) {
            env.define(node.params[i], arguments[i] === undefined ? null : arguments[i]);
        }

        env.resetState();
        var rv = vm.invokeStatements(node.statements, env);

        if(this instanceof runtime.Streem) {
            env.blockStreem = this;
            for(i = 0; i < env.emitBuffer.length; i++) {
                this.queue.enqueue(env.emitBuffer[i]);
            }

            if(env.state === State.Skip) {
                this.skip();
            }
        } else if(env.root === false) {
            for(i = 0; i < env.emitBuffer.length; i++) {
                env.parent.emitBuffer.push(env.emitBuffer[i]);
            }
        }

        env.emitBuffer.length = 0;
        return rv;
    }

    blockFunction.paramLength = node.params.length;
    return blockFunction;
};
