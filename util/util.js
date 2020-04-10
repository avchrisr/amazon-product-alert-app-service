const ErrorResponse = require('../util/ErrorResponse')

const phoneNumberRegEx = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/

const validatePhoneNumber = (phoneNumber) => {
    if (!phoneNumber.match(phoneNumberRegEx)) {
        throw new ErrorResponse(`'${phoneNumber}' is not a valid phone number. Please enter a valid phone number.`, 400)
    }
    return phoneNumber.replace(/[^0-9]/g, '')
}

module.exports = {
    validatePhoneNumber
}
