var parser = require("./parser");
var errors = require("./errors");
var vm = require("./vm");
var NodeType = parser.NodeType;

var indentSize = "    ";
var runtime = "$r";

exports.runtimeFilename = "streem-runtime.js";

/**
 * @param {string} filename
 * @param {string} src
 * @return {string}
 */
exports.compile = function(filename, src) {
    try {
        var ast = parser.parse(src);
    } catch(err) {
        if(err instanceof errors.StreemError) {
            vm.printError(filename, src, err);
        }
        throw err;
    }

    var compiler = new Compiler();
    var res = compiler.compile(ast);
    return res;
};


/**
 * @class
 */
function Scope(parent) {
    var scope = Object.create(null);
    Object.defineProperty(scope, "$parent", {
        value: parent || null
    });
    return scope;
}


/**
 * @class
 */
function Compiler() {
    this.indent = "";
    this.out = [];
    this.returnEnd = false;
    this.scope = new Scope();
}

/**
 * @param {parser.ASTNode} node
 * @return {string}
 */
Compiler.prototype.compile = function(node) {
    this.c(node);
    return this.out.join("");
};

/**
 * @param {...string}
 * @return {number} index of token
 */
Compiler.prototype.write = function() {
    return this.out.push.apply(this.out, arguments) - 1;
};

/**
 * @param {parser.ASTNode} node
 */
Compiler.prototype.c = function(node) {
    this[node.type](node);
};

/**
 * @param {Scope}
 * @return {Array.<string>}
 */
Compiler.prototype.findDeclarations = function(scope) {
    return Object.keys(scope).filter(function(name) {
        return ! hasDeclared(scope.$parent, name);
    });
};

/**
 * @param {Scope} scope
 * @param {string} name
 * @return boolean
 */
function hasDeclared(scope, name) {
    if(scope === null) {
        return false;
    } else if(name in scope) {
        return true;
    }
    return hasDeclared(scope.$parent, name);
}

Compiler.prototype.pushScope = function() {
    this.scope = new Scope(this.scope);
};

/**
 * @return {Scope}
 */
Compiler.prototype.popScope = function() {
    var scope = this.scope;
    this.scope = scope.$parent;
    return scope;
};

/**
 * @param {Array.<parser.ASTNode>}
 * @return {boolean}
 */
Compiler.prototype.isExpression = function(node) {
    return node.type !== NodeType.If && node.type !== NodeType.Block;
};

var assignFunctions = {
    "+=": "add",
    "-=": "sub",
    "*=": "mul",
    "/=": "div",
    "%=": "mod",
    "&=": "bitand",
    "|=": "pipe",
    "^=": "bitxor",
    "<<=": "lshift",
    ">>=": "rshift",
};

Compiler.prototype.Assign = function(node) {
    if(node.operator === "=" ) {
        this.c(node.left);
        this.write(" = ");
        this.c(node.right);
        if(node.left.type === NodeType.Identifier) {
            this.scope[node.left.name] = true;
        }
    } else if(node.left.type === NodeType.Identifier) {
        this.write(node.left.name, " = ");
        this.write(runtime, ".", assignFunctions[node.operator], "(");
        this.write(node.left.name, ", ");
        this.c(node.right);
        this.write(")");
    } else {
        this.write(runtime, ".assignProperty(");
        this.c(node.left.object);
        this.write(", \"", node.left.property.name, "\", ");
        this.write("\"", node.operator, "\", ");
        this.c(node.right);
        this.write(")");
    }
};

Compiler.prototype.putHeader = function() {
    this.write("var " + runtime + "=require(\"./streem-runtime\"),");
    var env = vm.createGlobal();
    var globals = [];
    for(var name in env.scope) {
        globals.push(name + "=" + runtime + "." + name);
    }
    this.write(globals.join(","), ";\n");
};

Compiler.prototype.Program = function(node) {
    this.putHeader();
    this.Statements(node.statements);
};

Compiler.prototype.Statements = function(nodes) {
    var returnEnd = this.returnEnd;
    this.returnEnd = false;
    for(var i = 0; i < nodes.length; i++) {
        if(i === nodes.length - 1) {
            this.returnEnd = returnEnd;
        }
        var st = nodes[i];
        this.write(this.indent);

        if(st.type === NodeType.If) {
            this.IfStatement(st);
        } else  {
            if(i === nodes.length - 1 && this.returnEnd) {
                this.write("return ");
            }
            this.c(st);
            this.write(";\n");
        }
    }
    this.returnEnd = returnEnd;
};

Compiler.prototype.Property = function(node) {
    this.c(node.object);
    this.write(".");
    this.c(node.property);
};

Compiler.prototype.Call = function(node) {
    if(node.object.type === NodeType.Property) {
        this.write(runtime, ".call(");
        this.c(node.object.object);
        this.write(", \"", node.object.property.name, "\"");
    } else {
        this.write(runtime, ".call(null, ");
        this.c(node.object);
    }

    for(var i = 0; i < node.args.length; i++) {
        this.write(", ");
        this.c(node.args[i]);
    }
    this.write(")");
};

Compiler.prototype.Array = function(node) {
    this.write("[");
    for(var i = 0; i < node.elements.length; i++) {
        this.c(node.elements[i]);
        if(i + 1 !== node.elements.length) {
            this.write(", ");
        }
    }
    this.write("]");
};

Compiler.prototype.Identifier = function(node) {
    this.write(node.name);
};

Compiler.prototype.Literal = function(node) {
    this.write(node.token);
};

var unaryFunctions = {
    "!": "not",
    "+": "positive",
    "-": "negative",
    "^": "inverse",
};

Compiler.prototype.Unary = function(node) {
    this.write(runtime, ".", unaryFunctions[node.operator], "(");
    this.c(node.expr);
    this.write(")");
};

Compiler.prototype.Paren = function(node) {
    this.write("(");
    this.c(node.expr);
    this.write(")");
};

Compiler.prototype.IfStatement = function(node) {
    this.write("if (", runtime, ".toBoolean(");
    this.c(node.condition);
    this.write(")) {\n");
    var indent = this.indent;
    this.indent += indentSize;
    this.Statements(node.statements);
    this.indent = indent;
    this.write(this.indent, "}");

    if(node.else === null) {
        this.write("\n");
        return;
    }

    if(node.else.type === NodeType.If) {
        this.write(" else ");
        this.IfStatement(node.else);
    } else {
        this.ElseStatement(node.else);
    }
};

Compiler.prototype.ElseStatement = function(node) {
    this.write(" else {\n");
    var indent = this.indent;
    this.indent += indentSize;
    this.Statements(node.statements);
    this.indent = indent;
    this.write(this.indent, "}\n");
};

Compiler.prototype.If = function(node) {
    this.write("(", runtime, ".toBoolean(");
    this.c(node.condition);
    this.write(") ? ");
    if(node.statements.length === 0) {
        this.write("null");
    } else if(node.statements.length === 1) {
        this.c(node.statements[0]);
    } else {
        throw new errors.TooManyStatements(node.statements[1]);
    }

    this.write(" : ");
    if(node.else === null) {
        this.write("null");
    } else {
        this.c(node.else);
    }
    this.write(")");
};

Compiler.prototype.Else = function(node) {
    if(node.statements.length === 0) {
        this.write("null");
    } else if(node.statements.length === 1) {
        this.c(node.statements[0]);
    } else {
        throw new errors.TooManyStatements(node.statements[1]);
    }
};

Compiler.prototype.Skip = function(node) {
    this.write("return this.skip()");
};


Compiler.prototype.Return = function(node) {
    var last = this.out[this.out.length - 1];
    if(last !== "return ") {
        this.write("return ");
    }

    if(node.value === null) {
        this.write("null");
    } else {
        this.c(node.value);
    }
};

Compiler.prototype.Emit = function(node) {
    this.write("(this && this.emit && this.emit(");
    for(var i = 0; i < node.values.length; i++) {
        this.c(node.values[i]);
        if(i + 1 !== node.values.length) {
            this.write(", ");
        }
    }
    this.write("))");
};

var operatorFunctions = {
    "+": "add",
    "-": "sub",
    "*": "mul",
    "/": "div",
    "%": "mod",
    "&": "bitand",
    "|": "pipe",
    "^": "bitxor",
    "<<": "lshift",
    ">>": "rshift",
    "<": "lt",
    ">": "gt",
    "<=": "le",
    ">=": "ge",
    "==": "eq",
    "!=": "ne",
    "&&": "and",
    "||": "or",
};

Compiler.prototype.BinaryOperator = function(node) {
    this.write(runtime, ".", operatorFunctions[node.operator], "(");
    this.c(node.left);
    this.write(", ");
    this.c(node.right);
    this.write(")");
};

Compiler.prototype.Block = function(node) {
    this.write("(function(");
    this.write(node.params.join(", "), ") { ");
    if(node.statements.length === 0) {
        this.write("})");
        return;
    }

    this.pushScope();

    if(node.statements.length === 1) {
        var varsIndex = this.write("");
        this.write("return ");
        this.c(node.statements[0]);
        this.write("; })");
    } else {
        var _indent = this.indent;
        this.indent += indentSize;
        this.write("\n");
        varsIndex = this.write(this.indent);

        this.returnEnd = true;
        this.Statements(node.statements);
        if(node.statements[node.statements.length - 1].type === NodeType.If) {
            this.write(this.indent, "return null;\n");
        }
        this.indent = _indent;
        this.write(this.indent, "})");
    }

    var scope = this.popScope();
    var vars = this.findDeclarations(scope);

    if(vars.length !== 0) {
        if(node.statements.length === 1) {
            this.out[varsIndex] += "var " + vars.join(", ") + "; ";
        } else {
            this.out[varsIndex] += "var " + vars.join(", ") + ";\n";
        }
    } else {
        this.out[varsIndex] = "";
    }
};
