import express from "express";
import dotenv from "dotenv";

import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatGroq } from "@langchain/groq"
import fs from "fs";  // for reading the PDF file
import { PDFParse } from "pdf-parse";  // for parsing the PDF file
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

dotenv.config();
const app = express();
app.use(express.json());
const port = process.env.PORT || 5000;


const llm = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0,
    maxTokens: undefined,
    maxRetries: 2,
})

const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001", // 768 dimensions
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    title: "Document title",
});
const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL,
    collectionName: "grocery-store",
});



const upload = async () => {  // extract text from the PDF file and store it in a variable
    const pdfPath = "./knowledge.pdf";
    const buffer = fs.readFileSync(pdfPath);
    const pdfResult = new PDFParse({ data: buffer });
    const result = await pdfResult.getText();
    const text = result.text;
    const splitter = new RecursiveCharacterTextSplitter({  // split the text into chunks
        chunkSize: 1000,
        chunkOverlap: 200

    })
    const docs = await splitter.createDocuments([text]);  // create documents from the chunks
    await vectorStore.addDocuments(docs);  // add the documents to the vector store
}


app.post("/ai", async (req, res) => {
    const { input } = req.body;

    const docs = await vectorStore.similaritySearch(input, 5);  // search for the most similar documents
    const context = docs.map((doc) => doc.pageContent).join("\n\n");  // join the documents into a single string

    const response = await llm.invoke([
        new SystemMessage(`You are a RAG AI Assistant.

            STRICT RULES:
            - Answer ONLY from context
            - Do not use outside knowledge
            - Return plain text only; do not use Markdown formatting
            - If answer not found say:
                "I don't know from uploaded PDF."
            Context:
            ${context}`),
        new HumanMessage(input)

    ])


    return res.status(200).json({ai: response.content});
})

app.get("/", (req, res) => {
    return res.json({ message: "Hello from level4" })
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});



