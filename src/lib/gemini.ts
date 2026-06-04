import { GoogleGenerativeAI } from '@google/generative-ai'

export const geminiModel = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
  .getGenerativeModel({ model: 'gemini-3.5-flash' })
