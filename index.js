import express from 'express'
import cors from 'cors'
import * as dotenv from 'dotenv'
import connectDB from './mongoDB/connectDB.js'
import userRoutes from './routes/userRoutes.js'
import postRoutes from './routes/postRoutes.js'
import auth from './middleware/auth.js'

dotenv.config()
const PORT = process.env.PORT || 5000;

const app = express()
app.use(cors())
app.use(express.json())

app.use('/posts',auth, postRoutes)
app.use('/users', userRoutes)

app.get('/', async (req, res) => {
    res.send('The lighting has struck ⚡')
})

const startServer = async () => {
    try {
        connectDB(process.env.MONGODB_URL)
        app.listen(PORT, () => {
            console.log(`⚡Thunderstorm at http://localhost:${PORT}`)
        })
    } catch (error) {
        console.log(error)
    }
}

startServer();