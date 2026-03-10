import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  sender: {
    name: string;
    address: string;
    email: string;
    phone: string;
  };
  recipient: {
    name: string;
    address: string;
    email: string;
    phone: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  notes: string;
  currency: string;
}

export async function extractInvoiceData(base64Data: string, mimeType: string): Promise<InvoiceData> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Extract all invoice-related information from this document. If it's a messy document, try your best to identify the sender, recipient, line items, and totals. Pay close attention to the currency (e.g., USD, BDT/Taka, EUR, etc.). Return the data in the specified JSON format. If some fields are missing, leave them as empty strings or 0.",
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          invoiceNumber: { type: Type.STRING },
          date: { type: Type.STRING },
          dueDate: { type: Type.STRING },
          sender: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
            },
            required: ["name", "address", "email", "phone"],
          },
          recipient: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
            },
            required: ["name", "address", "email", "phone"],
          },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unitPrice: { type: Type.NUMBER },
                total: { type: Type.NUMBER },
              },
              required: ["description", "quantity", "unitPrice", "total"],
            },
          },
          subtotal: { type: Type.NUMBER },
          taxRate: { type: Type.NUMBER },
          taxAmount: { type: Type.NUMBER },
          totalAmount: { type: Type.NUMBER },
          notes: { type: Type.STRING },
          currency: { type: Type.STRING },
        },
        required: [
          "invoiceNumber",
          "date",
          "dueDate",
          "sender",
          "recipient",
          "items",
          "subtotal",
          "taxRate",
          "taxAmount",
          "totalAmount",
          "notes",
          "currency",
        ],
      },
    },
  });

  return JSON.parse(response.text);
}

export async function extractInvoiceDataFromText(text: string): Promise<InvoiceData> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        parts: [
          {
            text: `Extract all invoice-related information from the following text. It might be messy or just a list of details. Identify the sender, recipient, line items, and totals. Pay close attention to the currency (e.g., USD, BDT/Taka, EUR, etc.). Return the data in the specified JSON format. If some fields are missing, leave them as empty strings or 0.\n\nTEXT:\n${text}`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          invoiceNumber: { type: Type.STRING },
          date: { type: Type.STRING },
          dueDate: { type: Type.STRING },
          sender: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
            },
            required: ["name", "address", "email", "phone"],
          },
          recipient: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
            },
            required: ["name", "address", "email", "phone"],
          },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unitPrice: { type: Type.NUMBER },
                total: { type: Type.NUMBER },
              },
              required: ["description", "quantity", "unitPrice", "total"],
            },
          },
          subtotal: { type: Type.NUMBER },
          taxRate: { type: Type.NUMBER },
          taxAmount: { type: Type.NUMBER },
          totalAmount: { type: Type.NUMBER },
          notes: { type: Type.STRING },
          currency: { type: Type.STRING },
        },
        required: [
          "invoiceNumber",
          "date",
          "dueDate",
          "sender",
          "recipient",
          "items",
          "subtotal",
          "taxRate",
          "taxAmount",
          "totalAmount",
          "notes",
          "currency",
        ],
      },
    },
  });

  return JSON.parse(response.text);
}
