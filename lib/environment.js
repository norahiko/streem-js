"use strict";

var errors = require("./errors");

/**
 * @enum {number}
 */ var State = {
    Return: 0,
    Skip: 1,
};

exports.State = State;


function Env() {
    this.state = null;
    this.scope = Object.create(null);
    this.parent = null;
    this.emitBuffer = [];
}

exports.Env = Env;

Env.prototype.create = function() {
    var env = new Env();
    env.parent = this;
    return env;
};

Env.prototype.getVar = function(ident) {
    if(ident.name in this.scope) {
        return this.scope[ident.name];
    } else if(this.parent) {
        return this.parent.getVar(ident);
    }
    throw new errors.UndefinedVariable(ident);
};

Env.prototype.setVar = function(ident, value) {
    var env = this;
    while(env !== null) {
        if(env.defined(ident.name)) {
            break;
        }
        env = env.parent;
    }

    if(env === null) {
        env = this;
    }
    env.scope[ident.name] = value;
};

Env.prototype.define = function(name, value) {
    this.scope[name] = value;
};

Env.prototype.defined = function(name) {
    return name in this.scope;
};

Env.prototype.resetState = function() {
    this.state = null;
};

Env.prototype.return = function() {
    this.state = State.Return;
};

Env.prototype.skip = function() {
    this.state = State.Skip;
};

Env.prototype.emit = function(value) {
    this.emitBuffer.push(value);
};
