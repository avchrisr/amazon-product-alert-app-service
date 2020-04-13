const ErrorResponse = require('../util/ErrorResponse')
const AWS = require('aws-sdk')

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-west-2'
})

const phoneNumberRegEx = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
const urlRegEx = /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i

const validatePhoneNumber = (phoneNumber) => {
    if (!phoneNumber.match(phoneNumberRegEx)) {
        throw new ErrorResponse(`'${phoneNumber}' is not a valid phone number. Please enter a valid phone number.`, 400)
    }
    return phoneNumber.replace(/[^0-9]/g, '')
}

const isValidUrl = (url) => {
    return url.match(urlRegEx)
}

const sendSMS = async (phoneNumber, textMessage) => {
    // adding the US International Code prefix 1
    phoneNumber = '1' + phoneNumber

    const params = {
        Message: textMessage,
        PhoneNumber: phoneNumber
    }

    const publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();

    publishTextPromise.then(data => {
        console.log("MessageID is " + data.MessageId);
    }).catch(err => {
        console.error(err, err.stack);
    })
}

module.exports = {
    validatePhoneNumber,
    isValidUrl,
    sendSMS
}
