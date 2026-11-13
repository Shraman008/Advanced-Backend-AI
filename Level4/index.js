import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatGroq } from "@langchain/groq"
import { Annotation, END, MessagesAnnotation, START, StateGraph } from "@langchain/langgraph"
import { ToolNode } from "@langchain/langgraph/prebuilt"
import { TavilySearch } from "@langchain/tavily";
import { MemorySaver } from "@langchain/langgraph"


dotenv.config();
const app = express();
app.use(express.json());
const port = process.env.PORT || 5000;
// WITHOUT LANGCHAIN ******
// const ai = new GoogleGenAI({
//   apiKey: process.env.GEMINI_API_KEY,
// })
/*
app.post("/ai", async (req, res) => {
  const { input } = req.body;
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        role: "system",
        parts: [{ text: "you are a assistant and your name is jarvis" }]
      },
      {
        role: "user",
        parts: [{ text: input }]
      }
    ]
  })
  return res.status(200).json({ "ai:": response.text });
})
*/

// ***UPDATED CODE BELOW***
/*
app.post("/ai", async (req, res) => {
  try {
    const { input } = req.body;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",

      config: {
        systemInstruction: `
          You are Jarvis, a personal AI assistant.

          Your name is Jarvis.
          Never identify yourself as Gemini or as a Google language model.
          If someone asks who you are, introduce yourself as Jarvis.
          Be helpful, intelligent, concise and professional.
          if you don't know the answer to a question then don't give incorrect answers.
        `
      },

      contents: [
        {
          role: "user",
          parts: [{ text: input }]
        }
      ]
    });

    return res.status(200).json({
      ai: response.text
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});
*/

// ****WITH LANGCHAIN****
const tool = new TavilySearch({
  maxResults: 5,
  topic: "general"
})

const checkPointer = new MemorySaver()

const tools = [tool]
const toolNode = new ToolNode(tools)

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature: 0,
  maxTokens: undefined,
  maxRetries: 2,
}).bindTools(tools)

const systemPrompt = "You are Jarvis, a personal AI assistant. Your name is Jarvis. Never identify yourself as Gemini or as a Google language model. If someone asks who you are, introduce yourself as Jarvis. Be helpful, intelligent, concise and professional. If you don't know the answer to a question then call relevant tools to find the information. Respond in one continuous formal paragraph using plain text only. Do not use Markdown, bullets, headings, bold, italics, or forced line breaks."



// STATE CREATION IN LANGGRAPH
// const State = Annotation.Root({     // CUSTOM STATE CREATION
//   prompt: Annotation,
//   aiMsg: Annotation
// })



const callLLM = async (state) => {
  console.log("state", state)

  const response = await llm.invoke([
    {
      role: "system", content: `You are Jarvis, a personal AI assistant. Your name is Jarvis. Never identify yourself as Grok model. 
      Use conversation memory first. 
      If someone asks who you are, introduce yourself as Jarvis.
      Be helpful, intelligent, concise and professional. If you don't know the answer to a question then call relevant tools to find the information. Only use tools when requires real time information like weather, news, stock prices, or any other information that is not in your memory. 
      Do not call tools for simple conversation, memory based questions, greetings, or personal context`
    },
    ...state.messages
  ]);

  return { messages: [response] }
}

const shouldContinue = async (state) => {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage.tool_calls.length > 0) {
    return "tools"
  } else {
    return END
  }
}

const graph = new StateGraph(MessagesAnnotation)  // built in state creation
  .addNode("agent", callLLM)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .compile({ checkpointer: checkPointer })




app.post("/ai", async (req, res) => {
  const { input } = req.body;

  const response = await graph.invoke(
    {
      messages: [
        { role: "user", content: input }
      ]
    },
    { configurable: { thread_id: "user123" } }
  )

  console.log(response.messages)

  const content = response.messages[response.messages.length - 1].content;
  const plainText = content.replace(/\s+/g, " ").trim();

  return res.status(200).json({ "ai:": plainText });
})

app.get("/", (req, res) => {
  return res.json({ message: "Hello from level4" })
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});