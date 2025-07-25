// lib/openai.ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Takes an array of axe-core violations and returns
 * a plain-English, step-by-step remediation guide.
 */
export async function generateFixes(violations: any[]): Promise<string> {
  if (!violations || violations.length === 0) {
    return "No accessibility violations found! Your website is doing great.";
  }

  // Build a prompt that lists each rule and asks for fixes
  const userPrompt = `
I have the following accessibility violations from axe-core:
${violations.map(v => `- ${v.id}: ${v.help || v.description} (Impact: ${v.impact})`).join("\n")}

For each violation, provide:
1. A clear explanation of what's wrong
2. Specific HTML/CSS/JavaScript code examples to fix it
3. Why this fix improves accessibility

Format your response in markdown with clear headings for each violation.
  `;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are an expert web accessibility engineer. Provide clear, actionable solutions with code examples for accessibility violations. Always include specific code snippets and explain why each fix helps users with disabilities." 
        },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2000,
    });

    // Extract the assistant's reply
    return response.choices[0].message?.content?.trim() || "Unable to generate fixes at this time.";
  } catch (error) {
    console.error('OpenAI API error:', error);
    return "Unable to generate AI-powered fixes at this time. Please check your OpenAI API configuration.";
  }
}
