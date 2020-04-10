const router = require('express-promise-router')()

const { runProductScan } = require('../controllers/product-scan')

router.route('/')
    .post(runProductScan)

module.exports = router
