var util = require("util");

exports.StreemError = function StreemError() {};
util.inherits(exports.StreemError, Error);


/**
 * @class
 * @param {number} offset
 */
exports.InvalidCharacter = function InvalidCharacter(offset) {
    this.offset = offset;
    this.message = "Invalid character";
};
util.inherits(exports.InvalidCharacter, exports.StreemError);


/**
 * @class
 * @param {Token} token
 */
exports.InvalidToken = function InvalidToken(token) {
    this.token = token;
    this.offset = token.offset;
    this.message = "Invalid token";
};
util.inherits(exports.InvalidToken, exports.StreemError);


/**
 * @class
 * @param {Token} token
 */
exports.InvalidAssignment = function InvalidAssignment(token) {
    this.token = token;
    this.offset = token.offset;
    this.message = "Invalid assignment";
};
util.inherits(exports.InvalidAssignment, exports.StreemError);

/**
 * @class
 */
exports.UnexpectedEOF = function UnexpectedEOF() {
    this.message = "Unexpected EOF";
};
util.inherits(exports.UnexpectedEOF, exports.StreemError);


/**
 * @class
 * @param {ASTNode} token
 */
exports.UndefinedVariable = function UndefinedVariable(node) {
    this.node = node;
    this.offset = node.offset;
    this.message = "Undefined variable";
};
util.inherits(exports.UndefinedVariable, exports.StreemError);

/**
 * @class
 * @param {ASTNode} token
 */
exports.TooManyStatements = function TooManyStatements(node) {
    this.node = node;
    this.offset = node.offset;
    this.message = "Too many statements";
};
util.inherits(exports.TooManyStatements, exports.StreemError);
