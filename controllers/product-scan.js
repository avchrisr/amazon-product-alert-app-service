const _ = require('lodash')
const puppeteer = require('puppeteer')
const Bluebird = require('bluebird')
const { formatISO, isBefore, parseISO, sub } = require('date-fns')
const AWS = require('aws-sdk')
const ErrorResponse = require('../util/ErrorResponse')
const util = require('../util/util')
const { emitData } = require('../socket-io')
const { preRegisteredPhoneNumbers } = require('./phone-numbers')

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-west-2'     // SMS messaging is only available in limited regions. Check beforehand
})

const dynamodb = new AWS.DynamoDB({
    apiVersion: '2012-08-10'
})

const dynamodbTableName = 'amazon-product-alert-app'

const queryParamsMap = {
    name: ':productName',
    phoneNumber: ':phoneNumber'
}

async function checkItem(page, item) {
    console.log(`Checking for ${item.name.S}...`)
    emitData(`Checking for ${item.name.S}...`)

    if (!util.isValidUrl(item.url.S)) {
        emitData(`${item.url.S} is not a valid URL.`)
        return
    }

    await page.goto(item.url.S)

    // --- captures screenshot ---
    // console.log(await page.content())
    // await page.screenshot({ path: `screenshot_${item.name}.png` })

    const sellingPriceElement = await page.$('#priceblock_ourprice') || await page.$('#priceblock_saleprice') || await page.$('.offer-price')
    if (sellingPriceElement) {
        // const val = await (await sellingPriceElement.getProperty('innerHTML')).jsonValue()  // $18.99
        const price = await (await sellingPriceElement.getProperty('innerText')).jsonValue()  // $18.99
        const priceThreshold = (Math.round(parseFloat(item.priceThreshold.N) * 100) / 100).toFixed(2)

        if (priceThreshold < 0 || parseFloat(price.replace(/[^\d.]/g, '')) <= priceThreshold) {
            const canAdd = await page.$('#add-to-cart-button')
            const canSubscribe = await page.$('#rcx-subscribe-submit-button-announce')
            const notInStock = (await page.content()).match(/in stock on/gi)
            return (canAdd || canSubscribe) && !notInStock
        }
        console.log(`${item.name.S} is available but the price (${price}) is above the price threshold ($${priceThreshold})`)
        emitData(`${item.name.S} is available but the price (${price}) is above the price threshold ($${priceThreshold})`)

        return false
    }

    console.log(`${item.name.S} is not available.`)
    emitData(`${item.name.S} is not available.`)

    return false
}

const runProductScan = async (req, res, next) => {
    const phoneNumber = util.validatePhoneNumber(req.body.phoneNumber)

    const isConfirmedPhoneNumber = await isPhoneNumberConfirmed(phoneNumber)
    if (!isConfirmedPhoneNumber) {
        throw new ErrorResponse(`Phone number must be registered and confirmed before running the product scan.`, 400)
    }

    const itemsAvailable = []
    console.log('')
    console.log(`Starting at ${new Date(Date.now()).toLocaleString()}`)
    emitData(`Starting at ${new Date(Date.now()).toLocaleString()}`)

    // get items associated with the phone number from dynamodb
    const params = {
        TableName: dynamodbTableName,
        ExpressionAttributeNames: {
            '#phoneNumber': 'phoneNumber'
        },
        FilterExpression: '#phoneNumber = :phoneNumber',     // filter to apply AFTER scanning all items first
        ExpressionAttributeValues: {
            [queryParamsMap.phoneNumber]: {
                S: phoneNumber
            }
        }
    }

    const results = await dynamodb.scan(params).promise()
    if (results.Count == 0) {
        res.status(200).json({
            success: true,
            data: `No product exists in DB. Please add some products.`
        })
        emitData(`Your list is empty. Please add some products.`)
        return
    }

    const productItems = _.sortBy(results.Items, (p) => _.lowerCase(p.name.S))

    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.setViewport({
        width: 1680,
        height: 1050
    })

    // To ensure Amazon doesn't detect it as a Bot
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8'
    })

    Bluebird.mapSeries(productItems, async (item, index) => {
        const oneDayAgo = sub(Date.now(), { days: 1 })

        // only send alert once a day if an item became available
        if (!item.itemLastAvailableDateTime || isBefore(parseISO(item.itemLastAvailableDateTime.S), oneDayAgo)) {
            const available = await checkItem(page, item)

            if (available) {
                itemsAvailable.push(item.name.S)

                console.log(`${item.name.S} is available.`)
                emitData(`${item.name.S} is available.`)

                const textMessage = `${item.name.S} available! ${item.url.S}`
                if (!preRegisteredPhoneNumbers.includes(phoneNumber)) {
                    await util.sendSMS(phoneNumber, textMessage)
                }

                // update the product item in DynamoDB
                const params = {
                    TableName: dynamodbTableName,
                    Item: {
                        id: {
                            S: item.id.S
                        },
                        name: {
                            S: item.name.S
                        },
                        url: {
                            S: item.url.S
                        },
                        priceThreshold: {
                            N: `${item.priceThreshold.N}`     // even if the DynamoDB datatype is a Number, the value here must be a string
                        },
                        phoneNumber: {
                            S: item.phoneNumber.S
                        },
                        itemLastAvailableDateTime: {
                            S: formatISO(Date.now())        // 2020-04-03T18:10:17-07:00
                        }
                    }
                }
                await dynamodb.putItem(params).promise()
            }

            if (index < results.Items.length - 1) {
                console.log('Waiting...')
                emitData('Preparing to check for next item...')
                await Bluebird.delay(4000)
            }
        } else {
            console.log(`${item.name.S} is available since ${new Date(item.itemLastAvailableDateTime.S).toLocaleString()}`)
            emitData(`${item.name.S} is available since ${new Date(item.itemLastAvailableDateTime.S).toLocaleString()}`)
        }
    }, { concurrency: 1 }      // ** we HAVE TO check each product one at a time, not to be intrusive to the website **
    ).then(() => {
        console.log('Finished scanning products.')
        return browser.close().then(() => {
            console.log('puppeteer browser closed')
            emitData('Finished scanning products.')
        })

        // ---  depending on the number of products to check, it might take too long. send back a response right away  ---
        // res.status(200).json({
        //     success: true,
        //     itemsAvailable
        // })
    })

    const productItemsToCheck = results.Items.map(item => item.name.S)
    const responseData = {
        itemsToCheck: productItemsToCheck.sort(),
        message: `You will receive a text alert as each product becomes available below your price threshold.`
    }
    res.status(200).json({
        success: true,
        data: responseData
    })
}

const isPhoneNumberConfirmed = async (phoneNumber) => {
    const params = {
        TableName: 'apaa-phone-numbers',
        Key: {                  // must provide all attributes. if sort key exists, must provide it
            phoneNumber: {
                S: phoneNumber
            }
        }
    }

    // if no matching item found, it returns an empty object {}
    const results = await dynamodb.getItem(params).promise()

    console.log('----------   results   ---------')
    console.log(JSON.stringify(results, null, 4))

    return _.get(results, 'Item.confirmed.BOOL', false)
}

// setInterval(async function () {
//     await runProductScanFromSampleFile()
//     console.log('back')
//     console.log('waiting 15 minutes')
// }, 15 * 60 * 1000)

module.exports = {
    runProductScan
}
