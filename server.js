const path = require('path')
const express = require('express')
const morgan = require('morgan')
const colors = require('colors')
// const fileUpload = require('express-fileupload')
const cookieParser = require('cookie-parser')
// const mongoSanitize = require('express-mongo-sanitize')
const helmet = require('helmet')
const xss = require('xss-clean')
const rateLimit = require('express-rate-limit')
const hpp = require('hpp')
const cors = require('cors')
const errorHandler = require('./middleware/error-handler')
// const mongoDbConnect = require('./config/mongodb-conn')

// load env variables
require('dotenv').config({ path: './config/.env' })

const NODE_ENV = process.env.NODE_ENV || 'development'

// connect to mongodb database
// mongoDbConnect()

// route files
// const auth = require('./routes/auth')
// const users = require('./routes/users')
// const bootcamps = require('./routes/bootcamps')
const products = require('./routes/products')
const productScan = require('./routes/product-scan')
const phoneNumbers = require('./routes/phone-numbers')

const app = express()

// Dev logging middleware
if (NODE_ENV === 'development') {
    app.use(morgan('dev'))
}

// Body Parser
app.use(express.json())

// Cookie Parser
app.use(cookieParser())

// File upload middleware
// app.use(fileUpload())

// Mongo Sanitize middleware
// app.use(mongoSanitize())

// set security HTTP headers
app.use(helmet())

// sanitize input. Prevent XSS attacks (e.g. SQL injection)
// make sure this comes before any routes
app.use(xss())

// rate limiter
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,   // 10 min
    max: 100,                   // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP. Please try again after 10 min'    // optional
})
app.use(limiter)                // apply to all requests
// app.use("/api/", limiter);   // only apply to requests that begin with /api/

// prevent http parameter polution
app.use(hpp())

// enable CORS. this app is a public API, and we want any client browsers to send requests to this app
app.use(cors())

// set static files folder (/public)
// e.g.) localhost:5000/about.html
app.use(express.static(path.join(__dirname, 'public')))

try {
    // Mount Routers
    // app.use('/api/v1/auth', auth)
    // app.use('/api/v1/users', users)
    // app.use('/api/v1/bootcamps', bootcamps)
    app.use('/health', (req, res) => {
        res.status(200).json({
            success: true,
            data: `healthcheck successful at ${new Date(Date.now()).toUTCString()}`
        })
    })
    app.use('/api/v1/products', products)
    app.use('/api/v1/product-scan', productScan)
    app.use('/api/v1/phone-numbers', phoneNumbers)

    // error-handler middleware MUST be placed after Mounting Routers in order to take effect
    app.use(errorHandler)

    // no matching endpoint URL fallback error
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            error: `Unsupported API endpoint: ${req.method} ${req.url}`
        })
    })
} catch (err) {
    // global fallback error handler
    console.error(err)
    res.status(err.statusCode || 500).json({
        success: false,
        error: err
    })
}

const APP_PORT = process.env.APP_PORT || 5000
const server = app.listen(APP_PORT, () => {
    console.log(`server started in ${NODE_ENV} mode on port ${APP_PORT}`.cyan.bold)

    // disable console.log() in production
    if (NODE_ENV === 'production') {
        console.log = () => { }
    }
})

// Handle unhandled promise rejections. No need to use try/catch in many async/awaits!
process.on('unhandledRejection', (err, promise) => {
    console.log(`Server unhandledRejection Event Error: ${err.message}`.red)

    // close server connection & exit process if you want
    // server.close(() => process.exit(1))
})