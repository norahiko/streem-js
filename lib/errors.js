exports.CriticalError = function CriticalError() {
    this.message = "Critical error";
};

/**
 * @class
 * @param {number} offset
 */
exports.InvalidCharacter = function InvalidCharacter(offset) {
    this.offset = offset;
    this.message = "Invalid character";
};


/**
 * @class
 * @param {Token} token
 */
exports.InvalidToken = function InvalidToken(token) {
    this.token = token;
    this.message = "Invalid token";
};


/**
 * @class
 * @param {Token} token
 */
exports.InvalidAssignment = function InvalidAssignment(token) {
    this.token = token;
    this.message = "Invalid assignment";
};

/**
 * @class
 */
exports.UnexpectedEOF = function UnexpectedEOF() {
    this.message = "Unexpected EOF";
};


/**
 * @class
 * @param {ASTNode} token
 */
exports.UndefinedVariable = function UndefinedVariable(node) {
    this.node = node;
    this.message = "Undefined variable";
};
