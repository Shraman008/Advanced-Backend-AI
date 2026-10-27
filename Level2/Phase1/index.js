import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import connectDb from './lib/db.js';
import User from './model/user.model.js';    
import Redis from 'ioredis';
import rateLimiter from './middleware/ratelimit.js';
import sendEmail from './lib/sendEmail.js';
import emailQueue from './Queue.js';

const port = process.env.PORT || 5000;

const app = express();
export const redis = new Redis(process.env.REDIS_URL)

app.use(express.json());

app.get('/', (req, res) => { 
    res.status(200).json({ message: 'hello from redis' });
})

// without queue : 5.5 secs
app.post('/create', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        await redis.del("user:all");
    } catch (error) {
        console.warn('Redis cache unavailable; continuing without cache invalidation');
    }

    const user = await User.create({
        name, email, password
    })

    // await sendEmail();  // call the sendEmail function to simulate sending an email

    await emailQueue.add("send-email",{email})

    return res.status(200).json({ message: 'user created successfully', user })
})

app.get('/get', rateLimiter, async (req, res) => {
    const user = await User.find({})

    return res.status(200).json(user)
})

app.get('/get-redis', async (req, res) => {
    let cached;
    try {
        cached = await redis.get("user:all");
    } catch (error) {
        console.warn('Redis cache unavailable; reading users from MongoDB');
    }

    if(cached){
        const user = JSON.parse(cached)  // parse the cached data to convert it back to object format  // string to object
        return res.json(user);
    }

    const user = await User.find({})
    try {
        await redis.set("user:all", JSON.stringify(user));
    } catch (error) {
        console.warn('Redis cache unavailable; returning users without caching');
    }

    return res.json(user);
})

app.post('/send-otp', async (req, res) => {
    const {email} = req.body;
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();  // generate a random 6-digit OTP

    await redis.set(`otp:${email}`, otp, 'EX', 30);  // store the OTP in Redis with a 30s expiration

    return res.json({otp})
})

app.post('/verify-otp', async (req, res) => {
    const {email, otp} = req.body;
    
    const cachedotp = await redis.get(`otp:${email}`);
    if(!cachedotp){
        return res.status(400).json({"message": "OTP expired or not found"});
    }
    if(cachedotp !== otp){
        return res.status(400).json({"message": "Invalid OTP"});
    }

    await redis.del(`otp:${email}`);  // delete the OTP from Redis after successful verification 
    return res.json({message: "OTP verified successfully"})
})




app.listen(port, () => {
    connectDb();
    console.log(`Server is running on port ${port}`);
}) 


// without redis : 456 msecs