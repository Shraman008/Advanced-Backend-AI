import { Queue } from 'bullmq'
// import { redis } from './Phase1/index.js'
import Redis from 'ioredis'

const connection = new Redis("redis://localhost:6379", {
    maxRetriesPerRequest: null  // Disable max retries to avoid connection issues
})

const emailQueue = new Queue("emailQueue", {connection})

export default emailQueue