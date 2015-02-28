var parser = require("./parser");
var errors = require("./errors");
var vm = require("./vm");
var NodeType = parser.NodeType;

var indentSize = "    ";

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
    console.log(res);
};


function Compiler() {
    this.indent = "";
    this.out = [];
}

Compiler.prototype.write = function() {
    this.out.push.apply(this.out, arguments);
};

Compiler.prototype.compile = function(node) {
    this.c(node);
    return this.out.join("");
};

Compiler.prototype.findDeclarations = function(nodes) {
    var vars = [];
    for(var i = 0; i < nodes.length; i++) {
        if(nodes[i].type === NodeType.Assign && nodes[i].left.type === NodeType.Identifier) {
            vars.push(nodes[i].left.name);
        }
    }
    return vars;
};

Compiler.prototype.isExpression = function(node) {
    return node.type !== NodeType.If && node.type !== NodeType.Block;
};

Compiler.prototype.Assign = function(node) {
    this.write("### assign ###");
};

Compiler.prototype.c = function(node) {
    this[node.type](node);
};

Compiler.prototype.putHeader = function() {
    this.write("var $r=require(\"./streem-runtime\"),");
    var env = vm.createGlobal();
    var globals = [];
    for(var name in env.scope) {
        globals.push(name + "=$r." + name);
    }
    this.write(globals.join(","), ";\n");
};


Compiler.prototype.Program = function(node) {
    this.putHeader();
    this.Statements(node.statements, false);
};

Compiler.prototype.Statements = function(nodes, returnEnd) {
    for(var i = 0; i < nodes.length; i++) {
        var st = nodes[i];
        this.write(this.indent);

        if(st.type === NodeType.If) {
            this.IfStatement(st);
        } else  {
            if(i === nodes.length - 1 && returnEnd) {
                this.write("return ");
            }
            this.c(st);
            this.write(";\n");
        }
    }
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

Compiler.prototype.Unary = function(node) {
    this.write(node.operator);
    this.c(node.expr);
};

Compiler.prototype.Paren = function(node) {
    this.write("(");
    this.c(node.expr);
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
        this.write("resutn ");
        this.c(node.statements[0]);
        this.write("; ");
    } else {
        var _indent = this.indent;
        this.indent += indentSize;
        this.write("\n");
        vars = this.findDeclarations(node.statements);
        if(vars.length !== 0) {
            this.write(this.indent);
            this.write("var ", vars.join(", "), ";\n");
        }

        this.Statements(node.statements, true);
        this.indent = _indent;
    }
    this.write("})");

};

Compiler.prototype.IfStatement = function(node) {
    this.write("if (");
    this.c(node.condition);
    this.write(") {\n");
    var indent = this.indent;
    this.indent += indentSize;
    this.indent = indent;
    this.write("}");
};

Compiler.prototype.If = function(node) {
    this.write("(");
    this.c(node.condition);
    this.write(") ? ");
};

Compiler.prototype.BinaryOperator = function(node) {
    this.c(node.left);
    this.write(" ", node.operator, " ");
    this.c(node.right);
};
