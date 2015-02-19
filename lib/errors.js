/**
 * @constructor
 * @param {number} offset
 */
exports.InvalidCharacter = function InvalidCharacter(offset) {
    this.offset = offset;
    this.message = "Invalid character";
};


/**
 * @constructor
 * @param {Token} token
 */
exports.InvalidToken = function InvalidToken(token) {
    this.token = token;
    this.message = "Invalid token";
};


/**
 * @constructor
 * @param {Token} token
 */
exports.InvalidAssignment = function InvalidAssignment(token) {
    this.token = token;
    this.message = "Invalid assignment";
};

/**
 * @constructor
 */
exports.UnexpectedEOF = function UnexpectedEOF() {
    this.message = "Unexpected EOF";
};
