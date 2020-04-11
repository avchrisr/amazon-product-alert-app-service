const ErrorResponse = require('../util/ErrorResponse')
const AWS = require('aws-sdk')

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-west-2'
})

const phoneNumberRegEx = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/

const validatePhoneNumber = (phoneNumber) => {
    if (!phoneNumber.match(phoneNumberRegEx)) {
        throw new ErrorResponse(`'${phoneNumber}' is not a valid phone number. Please enter a valid phone number.`, 400)
    }
    return phoneNumber.replace(/[^0-9]/g, '')
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
    sendSMS
}
