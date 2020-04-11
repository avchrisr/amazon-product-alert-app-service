const _ = require('lodash')
const puppeteer = require('puppeteer')
const Bluebird = require('bluebird')
const { formatISO, isBefore, parseISO, sub } = require('date-fns')
const AWS = require('aws-sdk')
const ErrorResponse = require('../util/ErrorResponse')
const util = require('../util/util')

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-west-2'     // SMS messaging is only available in limited regions. Check beforehand
})

const dynamodb = new AWS.DynamoDB({
    apiVersion: '2012-08-10'
})

const dynamodbTableName = 'amazon-product-alert-app'

async function checkItem(page, item) {
    console.log(`Checking ${item.name.S}`)
    await page.goto(item.url.S)

    // --- captures screenshot ---
    // console.log(await page.content())
    // await page.screenshot({ path: `screenshot_${item.name}.png` })

    const sellingPriceElement = await page.$('#priceblock_ourprice')
    if (sellingPriceElement) {
        // const val = await (await sellingPriceElement.getProperty('innerHTML')).jsonValue()  // $18.99
        const price = await (await sellingPriceElement.getProperty('innerText')).jsonValue()  // $18.99
        const priceThreshold = parseFloat(item.priceThreshold.N)

        if (priceThreshold < 0 || parseFloat(price.replace(/[^\d.]/g, '')) <= priceThreshold) {
            const canAdd = await page.$('#add-to-cart-button')
            const canSubscribe = await page.$('#rcx-subscribe-submit-button-announce')
            const notInStock = (await page.content()).match(/in stock on/gi)
            return (canAdd || canSubscribe) && !notInStock
        }
        console.log(`item is available but the price (${price}) is above the price threshold ($${priceThreshold})`)
        return false
    }

    console.log(`${item.name.S} is not available.`)
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
    console.log(`Starting at ${formatISO(Date.now())}`)

    // get all items from dynamodb
    const params = {
        TableName: dynamodbTableName
    }
    const results = await dynamodb.scan(params).promise()
    if (results.Count == 0) {
        res.status(200).json({
            success: true,
            data: `No product exists in DB. Please add some products.`
        })
    }
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.setViewport({
        width: 1680,
        height: 1050
    })

    Bluebird.map(results.Items, async item => {
        const oneDayAgo = sub(Date.now(), { days: 1 })

        // only send alert once a day if an item became available
        if (!item.itemLastAvailableDateTime || isBefore(parseISO(item.itemLastAvailableDateTime.S), oneDayAgo)) {
            const available = await checkItem(page, item)

            if (available) {
                itemsAvailable.push(item.name.S)
                // item.itemLastAvailableDateTime = formatISO(Date.now())          // 2020-04-03T18:10:17-07:00
                console.log(`${item.name.S} is available.`)
                const textMessage = `${item.name.S} available! ${item.url.S}`
                await util.sendSMS(phoneNumber, textMessage)

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
                        itemLastAvailableDateTime: {
                            S: formatISO(Date.now())        // 2020-04-03T18:10:17-07:00
                        }
                    }
                }
                await dynamodb.putItem(params).promise()
            }

            console.log('Waiting...')
            return Bluebird.delay(4000)
        }
    }, { concurrency: 1 }      // ** we HAVE TO check each product one at a time, not to be intrusive to the website **
    ).then(() => {
        console.log('finishing...')
        return browser.close().then(() => {
            console.log('browser closed')
        })

        // ---  depending on the number of products to check, it might take too long. send back a response right away  ---
        // res.status(200).json({
        //     success: true,
        //     itemsAvailable
        // })
    })

    const productItemsToCheck = results.Items.map(item => item.name.S)
    const responseData = {
        itemsToCheck: productItemsToCheck,
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
