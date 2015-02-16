/**
 * @constructor
 * @param {number} offset
 */
exports.InvalidToken = function InvalidToken(offset) {
    this.offset = offset;
    this.message = "Invalid token";
};


/**
 * @constructor
 * @param {number} offset
 */
exports.UnexpectedToken = function UnexpectedToken(offset) {
    this.offset = offset;
    this.message = "Unexpected token";
};
