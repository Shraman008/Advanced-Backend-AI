import express from 'express';
import proxy from 'express-http-proxy';
import dotenv from 'dotenv';
dotenv.config();

const port = process.env.PORT || 5000;
const app = express();

app.use(express.json());

app.get('/', (req, res) => { 
    res.status(200).json({ message: `hello from ${process.env.SERVER_NAME}` });
})
app.use("/auth", proxy("http://auth-service:8001"))
app.use("/order", proxy("http://order-service:8002"))
app.use("/product", proxy("http://product-service:8003"))






app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}) 


// http://localhost:8000