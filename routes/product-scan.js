const router = require('express-promise-router')()

const { runProductScan } = require('../controllers/product-scan')

router.route('/')
    .get(runProductScan)

module.exports = router
