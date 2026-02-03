import { GoogleGenAI, Chat, Type, Modality } from "@google/genai";
import { AnalysisResult } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const ANALYSIS_MODEL = 'gemini-3-pro-preview';
const VISUALIZATION_MODEL = 'gemini-2.5-flash-image';

export const analyzeImage = async (base64Image: string, mimeType: string): Promise<AnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          {
            text: `You are an expert professional organizer and interior designer. 
            Analyze this uploaded photo of a room.
            
            Return a JSON object with three fields:
            1. 'analysis_markdown': A structured Markdown string. It MUST have these sections:
               - **Key Issues**: Briefly identify the main sources of clutter.
               - **Quick Wins**: 3 immediate actions (under 15 mins).
               - **Storage Solutions**: Specific suggestions for storage containers/furniture.
               - **Step-by-Step Plan**: A numbered list to organize the space.
               - **Aesthetic Tip**: One design tip for a "Zen" look.
            
            2. 'visualization_prompt': A set of STRICT, IMPERATIVE COMMANDS for an AI image generator to "fix" the room.
            It MUST implement the solutions you proposed in 'analysis_markdown'.
            
            Format as a direct command list:
            "TASK: Transform this messy room into a clean one.
            1. FLOORS: [Command to remove specific floor clutter and reveal flooring. E.g. 'Remove pile of clothes, show hardwood'].
            2. SURFACES: [Command to clear specific tables/counters. E.g. 'Clear nightstand of cups and papers'].
            3. BEDDING/FURNITURE: [Command to make the bed or straighten cushions. E.g. 'Make the bed with white duvet, tight tuck'].
            4. ITEMS: [Command to organize specific messy items like books, toys. E.g. 'Place books vertically on shelves'].
            5. ATMOSPHERE: [Lighting and mood instructions].
            
            Constraint: Keep original room geometry and large furniture positions exactly the same."
            
            3. 'products': An array of 3-5 specific products that would help organize this room. For each product provide:
               - 'name': Short display name (e.g., "Woven Basket").
               - 'search_term': A specific search query to find this on Amazon (e.g., "large woven storage basket for blankets").
               - 'reason': Why this helps.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis_markdown: { type: Type.STRING },
            visualization_prompt: { type: Type.STRING },
            products: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  search_term: { type: Type.STRING },
                  reason: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (!response.text) {
        throw new Error("No response text received");
    }

    const parsed = JSON.parse(response.text);

    return {
      rawText: parsed.analysis_markdown,
      visualizationPrompt: parsed.visualization_prompt,
      products: parsed.products || []
    };
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const generateRoomVisualization = async (prompt: string, originalImageBase64: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: VISUALIZATION_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: originalImageBase64
            }
          },
          { text: `You are an advanced AI image editor specialized in Decluttering and Interior Design.
          
          INPUT: A photo of a messy room.
          OUTPUT: A photorealistic "After" photo of the same room, perfectly organized.
          
          MANDATORY OPERATIONS:
          1. REMOVE ALL CLUTTER:
             - Detect clothes, trash, papers, bags, and loose items on the floor.
             - ERASE them completely.
             - INPAINT the clean floor texture underneath.
          
          2. TIDY FURNITURE:
             - If there is a bed, MAKE IT. Render smooth sheets and fluffed pillows.
             - If there are shelves, ALIGN the books and items.
             - If there are tables, CLEAR them of clutter.
             
          3. APPLY SPECIFIC INSTRUCTIONS FROM THE ORGANIZER:
          ${prompt}
          
          4. PRESERVE REALITY:
             - Do NOT change the wall color.
             - Do NOT change the window view.
             - Do NOT move large furniture (wardrobes, sofas, bed frames).
             
          Render the final image with high-end interior design photography lighting. Make it look realistic.` }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE]
      }
    });

    // Extract base64 image
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData && part.inlineData.data) {
        return part.inlineData.data;
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Visualization generation failed:", error);
    throw error;
  }
}

export const createChatSession = (initialContext: string): Chat => {
  return ai.chats.create({
    model: ANALYSIS_MODEL,
    config: {
      systemInstruction: `You are a helpful, encouraging professional organizer assistant named "ZenSpace AI". 
      The user has just uploaded a photo of their room and you have already provided an initial analysis.
      
      Here is the context of your initial analysis of their room:
      "${initialContext}"
      
      Answer the user's follow-up questions based on this analysis. 
      Keep your answers concise (under 3 paragraphs) unless asked for details.
      Be friendly and supportive. If they ask about specific products, suggest general types (e.g., "clear acrylic bins") rather than specific brands unless necessary.`
    }
  });
};