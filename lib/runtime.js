"use strict";
// jshint eqnull: true

var fs = require("fs");
var util = require("util");


/*
 * Runtime error
 */

/**
 * @class
 * @extends Error
 * @param {string} operator
 * @param {number=} offset
 */
function RuntimeError(message) {
    Error.captureStackTrace(this, RuntimeError);
    this.message = message;
}
util.inherits(RuntimeError, Error);


/**
 * @class
 * @extends RuntimeError
 * @param {string} operator
 * @param {number=} offset
 */
function InvalidOperand(operator, left, right, offset) {
    Error.captureStackTrace(this, InvalidOperand);
    this.message = "Invalid operand";
    this.operator = operator;
    this.offset = offset;
}
util.inherits(InvalidOperand, RuntimeError);


/**
 * @class
 * @extends RuntimeError
 * @param {string} operator
 * @param {number=} offset
 */
function InvalidUnaryOperand(operator, offset) {
    Error.captureStackTrace(this, InvalidUnaryOperand);
    this.message = "Invalid unary operand";
    this.operator = operator;
    this.offset = offset;
}
util.inherits(InvalidUnaryOperand, RuntimeError);


/**
 * @class
 * @extends RuntimeError
 * @param {string} property
 * @param {Object} object
 * @param {number=} offset
 */
function UndefinedProperty(property, object, offset) {
    Error.captureStackTrace(this, UndefinedProperty);
    this.message = "Undefined variable";
    this.object = object;
    this.property = property;
    this.offset = offset;
}
util.inherits(UndefinedProperty, RuntimeError);


/**
 * @class
 * @param {string} property
 * @param {number=} offset
 */
function PropertyOfNull(property, offset) {
    Error.captureStackTrace(this, PropertyOfNull);
    this.message = "Property of null";
    this.property = property;
    this.offset = offset;
}
util.inherits(PropertyOfNull, RuntimeError);

/**
 * @class
 * @extends RuntimeError
 * @param {number=} offset
 */
function NotCallable(offset) {
    Error.captureStackTrace(this, UndefinedProperty);
    this.message = "Not callable";
    this.offset = offset;
}
util.inherits(NotCallable, RuntimeError);

/**
 * @class
 * @extends RuntimeError
 * @param {number=} offset
 */
function WrongNumberOfArguments(offset) {
    Error.captureStackTrace(this, UndefinedProperty);
    this.message = "Wrong number of arguments";
    this.offset = offset;
}
util.inherits(WrongNumberOfArguments, RuntimeError);


/*
 * Operator
 */

/**
 * @param {Object} object
 * @param {string} property
 * @return {*}
 */
function prop(object, property) {
    if(object === null) {
        throw new PropertyOfNull(property);
    }
    var value = object[property];
    if(value === undefined) {
        throw new UndefinedProperty(object, property);
    }
    return value;
}

/**
 * @param {*} value
 * @return {boolean}
 */
function toBoolean(value) {
    return value !== null && value !== false;
}

/**
 * @param {string} operator
 * @param {Object} object
 * @param {string} property
 * @param {number=} offset
 * @param {*} rightValue
 */
function assignProperty(object, property, operator, rightValue, offset) {
    if(object == null) {
        throw new PropertyOfNull(property);
    }

    var leftValue = object[property];
    var result;
    switch(operator) {
        case "="   : result = rightValue; break;
        case "+="  : result = add(leftValue, rightValue); break;
        case "-="  : result = sub(leftValue, rightValue); break;
        case "*="  : result = mul(leftValue, rightValue); break;
        case "/="  : result = div(leftValue, rightValue); break;
        case "%="  : result = mod(leftValue, rightValue); break;
        case "<<=" : result = lshift(leftValue, rightValue); break;
        case ">>=" : result = rshift(leftValue, rightValue); break;
        case "&="  : result = bitand(leftValue, rightValue); break;
        case "|="  : result = pipe(leftValue, rightValue); break;
        case "^="  : result = bitxor(leftValue, rightValue); break;
    }
    object[property] = result;
    return result;
}

/**
 * @param {*} left
 * @param {*} right
 * @param {number=} offset
 * @param {*}
 */
function or(left, right, offset) {
    return toBoolean(left) ? left : right;
}

/**
 * @param {*} left
 * @param {*} right
 * @param {number=} offset
 * @param {*}
 */
function and(left, right, offset) {
    return toBoolean(left) ? right : left;
}

/**
 * @param {number} left
 * @param {number} right
 * @param {number=} offset
 */
function pipe(left, right, offset) {
    if(typeof left === "number" && typeof right === "number") {
        return left | right;
    } else if(pipeable(left, right)) {
        return pipeStream(left, right);
    }
    throw new InvalidOperand("|", left, right, offset);
}

/**
 * @param {number} left
 * @param {number} right
 * @param {number=} offset
 * @return {number}
 */

function bitxor(left, right, offset) {
    if(typeof left === "number" && typeof right === "number") {
        return left ^ right;
    }
    throw new InvalidOperand("^", left, right, offset);
}
/**
 * @param {number} left
 * @param {number} right
 * @param {number=} offset
 * @return {number}
 */
function bitand(left, right, offset) {
    if(typeof left === "number" && typeof right === "number") {
        return left & right;
    }
    throw new InvalidOperand("&", left, right, offset);
}

/**
 * @param {*} left
 * @param {*} right
 * @param {number=} offset
 * @param {boolean}
 */
function eq(left, right, offset) {
    return left === right;
}

/**
 * @param {*} left
 * @param {*} right
 * @param {number=} offset
 * @param {boolean}
 */
function ne(left, right, offset) {
    return left !== right;
}

/**
 * @param {number} left
 * @param {number} right
 * @param {number=} offset
 * @return {number}
 */
function lt(left, right, offset) {
    if(typeof left === "number" && typeof right === "number") {
        return left < right;
    } else if(typeof left === "string" && typeof right === "string") {
        return left < right;
    }
    throw new InvalidOperand("<", left, right, offset);
}

/**
 * @param {number} left
 * @param {number} right
 * @param {number=} offset
 * @return {number}
 */
function gt(left, right, offset) {
    if(typeof left === "number" && typeof right === "number") {
        return left > right;
    } else if(typeof left === "string" && typeof right === "string") {
        return left > right;
    }
    throw new InvalidOperand(">", left, right, offset);
}

/**
 * @param {number} left
 * @param {number} right
 * @param {number=} offset
 * @return {number}
 */
function le(left, right, offset) {
    if(typeof left === "number" && typeof right === "number") {
        return left <= right;
    } else if(typeof left === "string" && typeof right === "string") {
        return left <= right;
    }
    throw new InvalidOperand("<=", left, right, offset);
}

/**
 * @param {number} left
 * @param {number} right
 * @param {number=} offset
 */
function ge(left, right, offset) {
    if(typeof left === "number" && typeof right === "number") {
        return left >= right;
    } else if(typeof left === "string" && typeof right === "string") {
        return left >= right;
    }
    throw new InvalidOperand(">=", left, right, offset);
}

/**
 * @param {number} left
 * @param {number} right
 * @param {number=} offset
 * @return {number}
 */
function lshift(left, right, offset) {
    if(typeof left === "number" && typeof right === "number") {
        return left << right;
    } else if(Array.isArray(left)) {
        left.push(right);
        return left;
    }
    throw new InvalidOperand("<<", left, right, offset);
}

/**
 * @param {number} left
 * @param {number} right
 * @param {number=} offset
 * @return {number}
 */
function rshift(left, right, offset) {
    if(typeof left === "number" && typeof right === "number") {
        return left >> right;
    }
    throw new InvalidOperand(">>", left, right, offset);
}

/**
 * @param {number|string|Array} left
 * @param {number|string|Array} right
 * @param {number=} offset
 * @return {number|string|Array}
 */
function add(left, right, offset) {
    if(typeof left === "number" && typeof right === "number") {
        return left + right;
    } else if(typeof left === "string" && typeof right === "string") {
        return left + right;
    } else if(Array.isArray(left) && Array.isArray(right)) {
        return left.concat(right);
    }
    throw new InvalidOperand("+", left, right, offset);
}

/**
 * @param {number} left
 * @param {number} right
 * @param {number=} offset
 * @return {number}
 */
function sub(left, right, offset) {
    if(typeof left === "number" && typeof right === "number") {
        return left - right;
    }
    throw new InvalidOperand("-", left, right, offset);
}

/**
 * @param {number} left
 * @param {number} right
 * @param {number=} offset
 * @return {number}
 */
function mul(left, right, offset) {
    if(typeof left === "number" && typeof right === "number") {
        return left * right;
    } else if(typeof left === "string" && typeof right === "number") {
        return repeatString(left, right);
    } else if(Array.isArray(left)&& typeof right === "number") {
        return repeatArray(left, right);
    }
    throw new InvalidOperand("*", left, right, offset);
}

/**
 * @param {number} left
 * @param {number} right
 * @param {number=} offset
 * @return {number}
 */
function div(left, right, offset) {
    if(typeof left === "number" && typeof right === "number") {
        return left / right;
    }
    throw new InvalidOperand("/", left, right, offset);
}

/**
 * @param {number} left
 * @param {number} right
 * @param {number=} offset
 * @return {number}
 */
function mod(left, right, offset) {
    if(typeof left === "number" && typeof right === "number") {
        return left % right;
    }
    throw new InvalidOperand("%", left, right, offset);
}

/**
 * @param {*} value
 * @param {number=} offset
 * @return {boolean}
 */
function not(value, offset) {
    return ! toBoolean(value);
}

/**
 * @param {number} value
 * @param {number=} offset
 * @return {number}
 */
function positive(value, offset) {
    if(typeof value === "number") {
        return value;
    }
    throw new InvalidUnaryOperand("+", value, offset);
}

/**
 * @param {number} value
 * @param {number=} offset
 * @return {number}
 */
function negative(value, offset) {
    if(typeof value === "number") {
        return -value;
    }
    throw new InvalidUnaryOperand("-", value, offset);
}

/**
 * @param {number} value
 * @param {number=} offset
 * @return {number}
 */
function inverse(value, offset) {
    if(typeof value === "number") {
        return ~value;
    }
    throw new InvalidUnaryOperand("~", value, offset);
}

function pipeable(left, right) {
    return (left instanceof Streem || Array.isArray(left) || left instanceof File) &&
           (right instanceof Function || right instanceof File);
}

function pipeStream(left, right) {
    if(Array.isArray(left)) {
        left = new ArrayStreem(left);
    } else if(left instanceof File) {
        left = new ReadFileStreem(left);
    }

    if(right instanceof Function) {
        right = new BlockStreem(right);
    } else if(right instanceof File) {
        right = new WriteFileStreem(right);
    }
    return left.pipe(right);
}

/**
 * @param {string} str
 * @param {number} num
 * @return {string}
 */
function repeatString(str, num) {
    if(num < 1) return "";
    var result = "";
    var s = str;
    while(num !== 0) {
        if(num & 1) {
            result += s;
        }
        s += s;
        num = num >> 1;
    }
    return result;
}

/**
 * @param {Array} array
 * @param {number} num
 * @return {Array}
 */
function repeatArray(array, num) {
    var result = [];
    for(var i = 0; i < num; i++) {
        for(var n = 0; n < array.length; n++) {
            result.push(array[n]);
        }
    }
    return result;
}

/*********************************************************/

var END = ["END"];


/**
 * @class
 */
function Queue() {
    this.head = null;
    this.tail = null;
    this.length = 0;
}

/**
 * @param {*} value
 */
Queue.prototype.enqueue = function(value) {
    var q = {
        value: value,
        next: null,
    };
    if(this.length === 0) {
        this.head = q;
        this.tail = q;
    } else {
        this.tail.next = q;
        this.tail = q;
    }
    this.length += 1;
};

/**
 * @return {*}
 */
Queue.prototype.dequeue = function() {
    if(this.length === 0) {
        return null;
    }
    this.length -= 1;
    var q = this.head;
    this.head = q.next;
    if(this.length === 0) {
        this.tail = null;
    }
    return q.value;
};


/**
 * @class
 * @abstract
 */
function Streem() {
    this.reader = null;
    this.writer = null;
}

/**
 * @param {Streem} writer
 */
Streem.prototype.pipe = function(writer) {
    writer.reader = this;
    this.writer = writer;
    writer.drain();
    return writer;
};

Streem.prototype.drain = function() {
    // noop
};

/**
 * @abstract
 */
Streem.prototype.read = function() {
    throw new RuntimeError("Write only streem");
};

/**
 * @abstract
 * @param {*} value
 */
Streem.prototype.write = function(value) {
    throw new RuntimeError("Read only streem");
};

Streem.prototype.__defineGetter__("readable", function() {
    return this.read !== Streem.prototype.read;
});

Streem.prototype.__defineGetter__("writable", function() {
    return this.write !== Streem.prototype.write;
});


/**
 * @class
 * @extends fs.WriteStream
 * @param {Array.<*>} array
 */
function ArrayStreem(array) {
    Streem.call(this);
    this.array = array.reverse();
}
util.inherits(ArrayStreem, Streem);

/**
 * @override
 */
ArrayStreem.prototype.read = function() {
    if(this.array.length === 0) {
        this.writer.write(END, this);
        return;
    }
    this.writer.write(this.array.pop());
};


/**
 * @callback Generator
 * @param {*} value
 */

/**
 * @class
 * @param {Generator} func
 */
function BlockStreem(func) {
    Streem.call(this);
    this.func = func;
    this.queue = new Queue();
    this.waiting = false;
    this.skipped = false;
    this.writer = null;
    this.send = this.send.bind(this);
}
util.inherits(BlockStreem, Streem);

/**
 * @override
 */
BlockStreem.prototype.read = function() {
    if(this.queue.length !== 0) {
        this.writer.write(this.queue.dequeue());
    } else {
        this.reader.read(this);
    }
};

/**
 * @override
 * @param {*} value
 */
BlockStreem.prototype.write = function(value) {
    if(value === END) {
        this.writer.write(END);
        return;
    }
    this.skipped = false;
    var rv = this.func(value);
    if(rv === undefined) { throw new Error("Fix me"); }
    if(rv !== null) {
        this.queue.enqueue(rv);
    }
    this.send();
};

BlockStreem.prototype.skip = function() {
    this.skipped = true;
    return null;
};

BlockStreem.prototype.send = function() {
    if(this.queue.length !== 0) {
        this.writer.write(this.queue.dequeue());
    } else if(this.skipped) {
        this.reader.read(this);
    } else {
        this.waiting = true;
    }
};

/**
 * @param {...} values
 */
BlockStreem.prototype.emit = function() {
    for(var i = 0; i < arguments.length; i++) {
        this.queue.enqueue(arguments[i]);
    }
    if(this.waiting) {
        this.waiting = false;
        process.nextTick(this.send);
    }
    return null;
};


/**
 * @class
 * @param {string} path
 * @param {number=} fd - file descriptor
 */
function File(path, fd, sync) {
    this.path = path;
    this.fd = (fd === undefined) ? null : fd;
    this.sync = !!sync;
    this.autoClose = false;
    this.mode = null;
    this.referenceCounter = 0;
}

File.prototype.readStart = function() {
    if(this.mode === "w") {
        throw new RuntimeError("Write only file");
    }
    this.mode = "r";
    this.buffer = new Buffer(64 * 1024);
    this.referenceCounter += 1;
    this.open();
};

File.prototype.writeStart = function() {
    if(this.mode === "r") {
        throw new RuntimeError("Read only file");
    }
    this.mode = "w";
    this.referenceCounter += 1;
    this.open();
};

File.prototype.open = function() {
    if(this.fd === null) {
        this.fd = fs.openSync(this.path, this.mode);
        this.autoClose = true;
    }
};

File.prototype.end = function() {
    this.referenceCounter -= 1;
    if(this.referenceCounter === 0 && this.autoClose) {
        fs.closeSync(this.fd);
        this.fd = null;
    }
};

/**
 * @param {Function} callback
 */
File.prototype.read = function(callback) {
    if(this.sync) {
        var bytesRead = fs.readSync(this.fd, this.buffer, 0, this.buffer.length, null);
        callback(null, bytesRead, this.buffer);
    } else {
        fs.read(this.fd, this.buffer, 0, this.buffer.length, null, callback);
    }
};

/**
 * @param {*} value
 * @param {Function} callback
 */
File.prototype.write = function(value, callback) {
    if(Buffer.isBuffer(value) === false) {
        value = value.toString();
        if(value[value.length - 1] !== "\n") {
            value += "\n";
        }
        value = new Buffer(value);
    }

    if(this.sync) {
        var bytesWritten = fs.writeSync(this.fd, value, 0, value.length, null);
        callback(null, bytesWritten, value);
    } else {
        fs.write(this.fd, value, 0, value.length, null, callback);
    }
};

/**
 * @class
 * @param {File}
 */
function ReadFileStreem(file) {
    Streem.call(this);
    this.closed = false;
    this.file = file;
    this.file.readStart();
    this.readCallback = this.readCallback.bind(this);
}
util.inherits(ReadFileStreem, Streem);

/**
 * @override
 */
ReadFileStreem.prototype.read = function() {
    if(this.closed) {
        this.writer.write(END);
        return;
    }
    this.file.read(this.readCallback);
};

ReadFileStreem.prototype.close = function() {
    this.closed = true;
    this.file.end();
};

/**
 * @param {Error} err
 * @param {number} bytesRead
 * @param {Buffer} buf
 */
ReadFileStreem.prototype.readCallback = function(err, bytesRead, buf) {
    if(bytesRead === 0) {
        this.close();
        this.writer.write(END);
    } else if (bytesRead === buf.length) {
        this.writer.write(buf);
    } else {
        this.writer.write(buf.slice(0, bytesRead));
    }
};

/**
 * @class
 * @param {File} file
 */
function WriteFileStreem(file) {
    Streem.call(this);
    this.closed = false;
    this.file = file;
    this.file.writeStart();
    this.writeCallback = this.writeCallback.bind(this);
    this.drain = this.drain.bind(this);
}

util.inherits(WriteFileStreem, Streem);

/**
 * @override
 * @param {*} value
 */
WriteFileStreem.prototype.write = function(value) {
    if(this.closed) {
        return;
    } else if(value === END) {
        this.close();

    } else if(value === null || value === "") {
        process.nextTick(this.drain);
    } else {
        this.file.write(value, this.writeCallback);
    }

};

WriteFileStreem.prototype.close = function() {
    this.closed = true;
    this.file.end();
};

/*
 * @override
 */
WriteFileStreem.prototype.drain = function() {
    this.reader.read(this);
};

/**
 * @param {Error} err
 * @param {number} bytesWritten
 * @param {Buffer} buf
 */
WriteFileStreem.prototype.writeCallback = function(err, bytesWritten, buf) {
    process.nextTick(this.drain);
};

/*
 * Globals
 */

/**
 * @param {string} path
 * @return {File}
 */
function file(path) {
    return new File(path);
}

var STDIN = new File("", 0, true);

var STDOUT = new File("", 1, true);

var STDERR = new File("", 2, true);

function seq(max) {
    var s = [];
    for(var i = 1; i <= max; i++) {
        s.push(i);
    }
    return s;
}



/*
 * Exports
 */

exports.RuntimeError = RuntimeError;
exports.UndefinedProperty = UndefinedProperty;
exports.InvalidOperand = InvalidOperand;
exports.InvalidUnaryOperand = InvalidUnaryOperand;
exports.PropertyOfNull = PropertyOfNull;
exports.WrongNumberOfArguments = WrongNumberOfArguments;
exports.NotCallable = NotCallable;
exports.repeatString = repeatString;
exports.prop = prop;
exports.toBoolean = toBoolean;
exports.assignProperty = assignProperty;
exports.or = or;
exports.and = and;
exports.pipe = pipe;
exports.bitxor = bitxor;
exports.bitand = bitand;
exports.eq = eq;
exports.ne = ne;
exports.lt = lt;
exports.gt = gt;
exports.le = le;
exports.ge = ge;
exports.lshift = lshift;
exports.rshift = rshift;
exports.add = add;
exports.sub = sub;
exports.mul = mul;
exports.div = div;
exports.mod = mod;
exports.not = not;
exports.positive = positive;
exports.negative = negative;
exports.inverse = inverse;
exports.Streem = Streem;
exports.file = file;
exports.STDIN = STDIN;
exports.STDOUT = STDOUT;
exports.STDERR = STDERR;
exports.seq = seq;
