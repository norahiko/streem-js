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
function Compiler() {
    this.indent = "";
    this.out = [];
    this.returnEnd = false;
}

/**
 * @param {...string}
 */
Compiler.prototype.write = function() {
    this.out.push.apply(this.out, arguments);
};

/**
 * @param {parser.ASTNode} node
 */
Compiler.prototype.compile = function(node) {
    this.c(node);
    return this.out.join("");
};

/**
 * @param {Array.<parser.ASTNode>}
 * @return {Array.<string>}
 */
Compiler.prototype.findDeclarations = function(nodes) {
    var vars = [];
    for(var i = 0; i < nodes.length; i++) {
        if(nodes[i].type === NodeType.Assign && nodes[i].left.type === NodeType.Identifier) {
            vars.push(nodes[i].left.name);
        }
    }
    return vars;
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

Compiler.prototype.c = function(node) {
    this[node.type](node);
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
    this.c(node.object);
    this.write("(");
    for(var i = 0; i < node.args.length; i++) {
        this.c(node.args[i]);
        if(i + 1 !== node.args.length) {
            this.write(", ");
        }
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

Compiler.prototype.Emit = function(node) {
    this.write("this.emit(");
    for(var i = 0; i < node.values.length; i++) {
        this.c(node.values[i]);
        if(i + 1 !== node.values.length) {
            this.write(", ");
        }
    }
    this.write(")");
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

    if(node.statements.length === 1) {
        var vars = this.findDeclarations(node.statements);
        if(vars.length !== 0) {
            this.write("var ", vars.join(", "));
            this.write("; ");
        }
        this.write("return ");
        this.c(node.statements[0]);
        this.write("; })");
    } else {
        var _indent = this.indent;
        this.indent += indentSize;
        this.write("\n");
        vars = this.findDeclarations(node.statements);
        if(vars.length !== 0) {
            this.write(this.indent);
            this.write("var ", vars.join(", "), ";\n");
        }

        this.returnEnd = true;
        this.Statements(node.statements);
        if(node.statements[node.statements.length - 1].type === NodeType.If) {
            this.write(this.indent, "return null;\n");
        }
        this.indent = _indent;
        this.write(this.indent, "})");
    }
};
