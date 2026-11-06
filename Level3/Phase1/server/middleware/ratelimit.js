import { redis } from '../index.js';

const rateLimiter = async (req, res, next) => {
    const ip = req.ip;
    const key = `ratelimit:${ip}`;
    const requests = await redis.incr(key);

    if(requests == 1){
        await redis.expire(key, 60);  // set expiration time of 60 seconds for the key
    }

    if(requests > 5){  // limit to 5 requests per minute
        return res.status(429).json({message: "Too many requests. Please try again later."});  
    }

    next()
}

export default rateLimiter;