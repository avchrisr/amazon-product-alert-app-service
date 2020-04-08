const puppeteer = require('puppeteer')
const Bluebird = require('bluebird')
const { formatISO, isBefore, parseISO, sub } = require('date-fns')
const AWS = require('aws-sdk')
const fs = require('fs').promises

AWS.config.update({
    region: process.env.AWS_REGION || 'us-west-2'     // SMS messaging is only available in limited regions. Check beforehand
})

const dynamodb = new AWS.DynamoDB({
    apiVersion: '2012-08-10'
})

const itemsDataPath = '../_data'
const file = require(`${itemsDataPath}/items`)
const items = file.items

async function checkItemFromSampleFile(page, item) {
    console.log(`Checking ${item.name}`)
    await page.goto(item.url)

    // --- captures screenshot ---
    // console.log(await page.content())
    // await page.screenshot({ path: `screenshot_${item.name}.png` })

    const canAdd = await page.$('#add-to-cart-button')
    const notInStock = (await page.content()).match(/in stock on/gi)

    return canAdd && !notInStock
}

async function sendSMSFromSampleFile(item) {
    const textMessage = `${item.name} available! ${item.url}`
    const phoneNumber = process.env.RECIPIENT_PHONE_NUMBER      // international code is required. e.g.) 19495557777

    if (!phoneNumber) {
        console.error(`ERROR - Recipient Phone Number is required.`)
        return;
    }

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

async function checkItem(page, item) {
    console.log(`Checking ${item.name.S}`)
    await page.goto(item.url.S)

    // --- captures screenshot ---
    // console.log(await page.content())
    // await page.screenshot({ path: `screenshot_${item.name}.png` })

    const canAdd = await page.$('#add-to-cart-button')
    const notInStock = (await page.content()).match(/in stock on/gi)

    return canAdd && !notInStock
}

async function sendSMS(item) {
    const textMessage = `${item.name.S} available! ${item.url.S}`
    const phoneNumber = process.env.RECIPIENT_PHONE_NUMBER      // international code is required. e.g.) 19495557777

    if (!phoneNumber) {
        console.error(`ERROR - Recipient Phone Number is required.`)
        return;
    }

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

const runProductScan = async (req, res, next) => {
    const itemsAvailable = []

    console.log('')
    console.log(`Starting at ${formatISO(Date.now())}`)

    // get all items from dynamodb
    const params = {
        TableName: 'amazon-product-alert-app'
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
                await sendSMS(item)

                // update the product item in DynamoDB
                const params = {
                    TableName: 'amazon-product-alert-app',
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
            } else {
                console.log(`${item.name.S} is not available.`)
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
    res.status(200).json({
        success: true,
        data: `Checking for following products = ${productItemsToCheck}. You will receive a text alert as each product becomes available below your price threshold.`
    })
}


const runProductScanFromSampleFile = async (req, res, next) => {
    const itemsAvailable = []

    console.log('')
    console.log(`Starting at ${formatISO(Date.now())}`)
    const browser = await puppeteer.launch()

    const page = await browser.newPage()

    await page.setViewport({
        width: 1680,
        height: 1050
    })

    await Bluebird.map(
        items,
        async item => {
            const oneDayAgo = sub(Date.now(), { days: 1 })

            // only send alert once a day if an item became available
            if (!item.itemLastAvailableDateTime || isBefore(parseISO(item.itemLastAvailableDateTime), oneDayAgo)) {
                const available = await checkItemFromSampleFile(page, item)

                if (available) {
                    itemsAvailable.push(item.name)
                    item.itemLastAvailableDateTime = formatISO(Date.now())          // 2020-04-03T18:10:17-07:00
                    console.log(`${item.name} is available.`)
                    await sendSMSFromSampleFile(item)
                } else {
                    console.log(`${item.name} is not available.`)
                }
                console.log('Waiting...')
                return Bluebird.delay(4000)
            }
        },
        { concurrency: 1 }
    )

    const update = { items: items }
    console.log('finishing...')

    await fs.writeFile(`${itemsDataPath}/items.json`, JSON.stringify(update, null, 4))
    await browser.close()
    console.log('browser closed')

    res.status(200).json({
        success: true,
        itemsAvailable
    })
}

// runProductScanFromSampleFile()

// setInterval(async function () {
//     await runProductScanFromSampleFile()
//     console.log('back')
//     console.log('waiting 15 minutes')
// }, 15 * 60 * 1000)

module.exports = {
    runProductScan
}
