const puppeteer = require('puppeteer')
const Promise = require('bluebird')
const { formatISO, isBefore, parseISO, sub } = require('date-fns')
const AWS = require('aws-sdk')
const fs = require('fs').promises

AWS.config.update({
    region: process.env.AWS_REGION || 'us-west-2'     // SMS messaging is only available in limited regions. Check beforehand
})

const itemsDataPath = '../_data'
const file = require(`${itemsDataPath}/items`)
const items = file.items

async function checkItem(page, item) {
    console.log(`Checking ${item.name}`)
    await page.goto(item.url)

    // --- captures screenshot ---
    // console.log(await page.content())
    // await page.screenshot({ path: `screenshot_${item.name}.png` })

    const canAdd = await page.$('#add-to-cart-button')
    const notInStock = (await page.content()).match(/in stock on/gi)

    return canAdd && !notInStock
}

async function sendSMS(item) {
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

const run = async (req, res, next) => {
    const itemsAvailable = []

    console.log('')
    console.log(`Starting at ${formatISO(Date.now())}`)
    const browser = await puppeteer.launch()

    const page = await browser.newPage()

    await page.setViewport({
        width: 1680,
        height: 1050
    })

    await Promise.map(
        items,
        async item => {
            const oneDayAgo = sub(Date.now(), { days: 1 })

            // only send alert once a day if an item became available
            if (!item.found || isBefore(parseISO(item.found), oneDayAgo)) {
                const available = await checkItem(page, item)

                if (available) {
                    itemsAvailable.push(item.name)
                    item.found = formatISO(Date.now())
                    console.log(`${item.name} is available.`)
                    await sendSMS(item)
                } else {
                    console.log(`${item.name} is not available.`)
                }
                console.log('Waiting...')
                return Promise.delay(4000)
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

// run()

// setInterval(async function () {
//     await run()
//     console.log('back')
//     console.log('waiting 15 minutes')
// }, 15 * 60 * 1000)


module.exports = {
    run
}
