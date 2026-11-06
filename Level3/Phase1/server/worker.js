import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'
import sendEmail from './lib/sendEmail.js'

const connection = new Redis("redis://localhost:6379", {
    maxRetriesPerRequest: null  // Disable max retries to avoid connection issues
})

const worker = new Worker("emailQueue", async(job)=>{
console.log("job started")
const email = job.data.email
await sendEmail(email)
console.log("job completed")
}, {connection})


// run node worker.js to start the worker and process the jobs in the queue. The worker will listen for new jobs added to the "emailQueue" and execute the sendEmail function for each job.