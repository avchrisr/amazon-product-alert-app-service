// ----------------------
// CRUD of phone-numbers
// ----------------------
const _ = require('lodash')
const { formatISO, isBefore, parseISO, sub } = require('date-fns')
const ErrorResponse = require('../util/ErrorResponse')
const AWS = require('aws-sdk')
const { v4: uuidv4 } = require('uuid');
const util = require('../util/util')
const sampleData = require('../_data/items').items

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-west-2'
})

const dynamodb = new AWS.DynamoDB({
    apiVersion: '2012-08-10'
})

const queryParamsMap = {
    name: ':productName',
    phoneNumber: ':phoneNumber'
}

const dynamodbTableName = 'apaa-phone-numbers'

// @route       GET /api/v1/products
// @access      Public
// const getProducts = async (req, res, next) => {
//     res.status(200).json(res.searchQueryResults)
// }

// @route       GET /api/v1/phone-numbers/:phoneNumber
// @access      Public
const getPhoneNumber = async (req, res, next) => {
    const phoneNumber = util.validatePhoneNumber(req.params.phoneNumber)

    const params = {
        TableName: dynamodbTableName,
        Key: {      // must provide all attributes. if sort key exists, must provide it
            phoneNumber: {
                S: phoneNumber
            }
        }
    }

    // if no matching item found, it returns an empty object {}
    const results = await dynamodb.getItem(params).promise()

    console.log('----------   results   ---------')
    console.log(JSON.stringify(results, null, 4))

    // --- don't let user know that the specified phone number does not exist. just return empty response
    // if (!results.Item) {
    //     throw new ErrorResponse(`Product not found with id = ${req.params.phoneNumber}`, 404)
    // }

    res.status(200).json({
        success: true,
        data: results
    })
}

const registerPhoneNumber = async (req, res, next) => {
    const phoneNumber = util.validatePhoneNumber(req.body.phoneNumber)

    const min = 100000
    const max = 999999
    const registrationCode = Math.floor(Math.random() * (max - min + 1)) + min     // random 6 digit code
    const registrationCodeCreatedDateTime = formatISO(Date.now())                   // 2020-04-03T18:10:17-07:00

    const params = {
        TableName: dynamodbTableName,
        Item: {
            phoneNumber: {
                S: phoneNumber
            },
            registrationCode: {
                S: `${registrationCode}`
            },
            registrationCodeCreatedDateTime: {
                S: registrationCodeCreatedDateTime
            },
            confirmed: {
                BOOL: false      // true or false
            },
            // confirmedDateTime: {
            //     S: ''            // DynamoDB error -- An AttributeValue must NOT contain an empty string
            // }
        }
    }

    const results = await dynamodb.putItem(params).promise()
    const textMessage = `Your security code: ${registrationCode}. Code expires in 10 minutes.`
    await util.sendSMS(phoneNumber, textMessage)

    res.status(201).json({
        success: true,
        data: results
    })
}

const confirmPhoneNumber = async (req, res, next) => {
    if (!req.body.phoneNumber || !req.body.registrationCode) {
        throw new ErrorResponse(`phoneNumber and registrationCode are required.`, 400)
    }

    const phoneNumber = util.validatePhoneNumber(req.body.phoneNumber)
    const genericErrorMessage = 'Not Confirmed. Either the phone number does not exist or the entered code is invalid.'

    let params = {
        TableName: dynamodbTableName,
        Key: {                          // must provide all attributes. if sort key exists, must provide it
            phoneNumber: {
                S: phoneNumber
            }
        }
    }

    // if no matching item found, it returns an empty object {}
    let results = await dynamodb.getItem(params).promise()

    console.log('----------   results   ---------')
    console.log(JSON.stringify(results, null, 4))

    if (!results.Item) {
        throw new ErrorResponse(genericErrorMessage, 400)
    }

    const tenMinutesAgo = sub(Date.now(), { minutes: 10 })
    if (_.get(results, 'Item.registrationCode.S') !== req.body.registrationCode ||
        isBefore(parseISO(_.get(results, 'Item.registrationCodeCreatedDateTime.S')), tenMinutesAgo)) {
        throw new ErrorResponse(genericErrorMessage, 400)
    }

    // update entry with confirmed. It will do a PUT. e.g.) any missing attributes will be removed.
    params = {
        TableName: dynamodbTableName,
        Item: {
            phoneNumber: {
                S: phoneNumber
            },
            // registrationCode: {          // these will be removed if not included explictly
            //     S: registrationCode
            // },
            // registrationCodeCreatedDateTime: {
            //     S: registrationCodeCreatedDateTime
            // },
            confirmed: {
                BOOL: true
            },
            confirmedDateTime: {
                S: formatISO(Date.now())        // 2020-04-03T18:10:17-07:00
            }
        }
    }

    await dynamodb.putItem(params).promise()

    // put initial products for that phone number, only if there aren't any items yet
    const products = await scanItems(phoneNumber)
    if (products.Count === 0) {
        for await (let item of sampleData) {
            const priceThreshold = _.get(item, 'priceThreshold', -1)

            const params = {
                TableName: 'amazon-product-alert-app',
                Item: {
                    id: {
                        S: uuidv4()
                    },
                    name: {
                        S: item.name
                    },
                    url: {
                        S: item.url
                    },
                    priceThreshold: {
                        N: `${priceThreshold}`     // even if the DynamoDB datatype is a Number, the value here must be a string
                    },
                    phoneNumber: {
                        S: `${phoneNumber}`
                    }
                    // itemLastAvailableDateTime: {
                    //     S: formatISO(Date.now())        // 2020-04-03T18:10:17-07:00
                    // }
                }
            }

            await dynamodb.putItem(params).promise()
        }
    }

    res.status(201).json({
        success: true,
        data: 'Phone number has been confirmed.'
    })
}

const deletePhoneNumber = async (req, res, next) => {
    const phoneNumber = util.validatePhoneNumber(req.params.phoneNumber)
    const params = {
        TableName: dynamodbTableName,
        Key: {     // must provide all attributes. if sort key exists, must provide it
            phoneNumber: {
                S: phoneNumber
            }
        },
        // ConditionExpression: 'attribute_not_exists(id)'
    }

    // If no matching item found by ID (primary key), DynamoDB will still return a success empty object {}
    const results = dynamodb.deleteItem(params).promise()

    res.status(200).json({
        success: true,
        data: results
    })
}

const scanItems = async (phoneNumber) => {
    const params = {
        TableName: 'amazon-product-alert-app'
    }
    if (phoneNumber) {
        params.ExpressionAttributeNames = {
            '#phoneNumber': 'phoneNumber'
        }
        params.FilterExpression = '#phoneNumber = :phoneNumber'     // filter to apply AFTER scanning all items first
        params.ExpressionAttributeValues = {
            [queryParamsMap.phoneNumber]: {
                S: phoneNumber
            }
        }
    }
    return await dynamodb.scan(params).promise()
}

module.exports = {
    getPhoneNumber,
    registerPhoneNumber,
    confirmPhoneNumber,
    deletePhoneNumber
}
