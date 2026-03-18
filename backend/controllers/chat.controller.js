import { geminiModel } from "../utils/geminiClient.js";
import { getProductInformationForTool } from "../utils/productSearch.js";
import { getDiscountInformationForTool } from "../utils/discountSearch.js";

export async function handleChat(req, res) {
  try {
    const userMessage = String(req.body?.message || "").trim();
    if (!userMessage) return res.status(400).json({ error: "message required" });

    // 1. Gemini සඳහා Tools (Function Declarations) සකස් කිරීම
    const tools = [
      {
        functionDeclarations: [
          {
            name: "getProductInformationForTool",
            description: "Retrieve details (price, stock, description, general info) for one or more products from the GreenLeaf store catalog. Use this tool for any product-related queries.",
            parameters: {
              type: "OBJECT",
              properties: {
                productQueries: {
                  type: "ARRAY",
                  description: "A list of product names or SKUs the user is asking about (e.g., ['Organic Apples', 'Milk']).",
                  items: { type: "STRING" },
                },
                intent: {
                  type: "STRING",
                  enum: ["price", "stock", "description", "info"],
                  description: "The specific information the user is seeking (price, stock, description, or general info).",
                },
              },
              required: ["productQueries"],
            },
          },
          {
            name: "getDiscountInformationForTool",
            description: "Retrieve information about active discounts, either general, for a specific product, or by a discount code.",
            parameters: {
              type: "OBJECT",
              properties: {
                productQuery: {
                  type: "STRING",
                  description: "The name of the product for which the user is asking for a discount.",
                },
                code: {
                  type: "STRING",
                  description: "A specific discount code the user is asking about (e.g., 'SAVE10').",
                },
              },
            },
          },
        ],
      },
    ];

    // 2. Chat Session එක ආරම්භ කිරීම (System Instruction එක Object එකක් ලෙස ලබා දීම)
    const chat = geminiModel.startChat({
      history: [],
      tools: tools,
      systemInstruction: {
        parts: [{ 
          text: "You are a helpful and friendly store assistant for GreenLeaf, an organic products store. You can answer questions about products, store policies, and general queries. Use the available tools to find specific product or discount information. If you cannot find information using tools, answer from your knowledge concisely." 
        }]
      },
    });

    // 3. පරිශීලකයාගේ පණිවිඩය යැවීම
    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    
    // 4. Tool Calls (Function Calls) තිබේදැයි පරීක්ෂා කිරීම
    const toolCalls = response.functionCalls();

    if (toolCalls && toolCalls.length > 0) {
      const toolMessages = [];

      for (const call of toolCalls) {
        const functionName = call.name;
        const functionArgs = call.args;
        console.log(`Gemini requested tool: ${functionName}`, functionArgs);

        let toolOutput;

        // Tool එක ක්‍රියාත්මක කිරීම (Product හෝ Discount Search)
        if (functionName === "getProductInformationForTool") {
          toolOutput = await getProductInformationForTool({
            productQueries: functionArgs.productQueries,
            intent: functionArgs.intent || null
          });
        } else if (functionName === "getDiscountInformationForTool") {
          toolOutput = await getDiscountInformationForTool({
            productQuery: functionArgs.productQuery || null,
            code: functionArgs.code || null
          });
        }

        console.log("Tool Output Received.");

        // Tool එකේ ප්‍රතිඵලය Gemini ට දිය හැකි ආකාරයට (functionResponse) සකස් කිරීම
        toolMessages.push({
          functionResponse: {
            name: functionName,
            response: { content: toolOutput }
          }
        });
      }

      // 5. Tool ප්‍රතිඵල සියල්ල එකවර Gemini වෙත යවා අවසන් පිළිතුර ලබා ගැනීම
      const secondResult = await chat.sendMessage(toolMessages);
      const finalAnswer = secondResult.response.text();

      return res.json({ 
        answer: finalAnswer, 
        mode: `gemini_tool_handled` 
      });

    } else {
      // Tool අවශ්‍ය නොවන සාමාන්‍ය reply එකක් නම්
      const finalAnswer = response.text();
      return res.json({ 
        answer: finalAnswer, 
        mode: "gemini_direct" 
      });
    }

  } catch (error) {
    console.error("Chatbot Error:", error);
    res.status(500).json({ 
      error: "AI issue: " + error.message 
    });
  }
}