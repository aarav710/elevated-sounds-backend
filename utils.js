const jwt = require('jsonwebtoken');

function makeToken (userID) {
    let token = jwt.sign({userID}, process.env.AUTH_TOKEN);
    return token;
};

function getUserID (token) {
    const { userID } = jwt.verify(token, process.env.AUTH_TOKEN);
    return userID;
};

module.exports = {makeToken, getUserID};