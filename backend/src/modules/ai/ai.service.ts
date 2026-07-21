import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClassificationResultDto } from './dto/classification-result.dto';
import Groq from 'groq-sdk';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private groq: Groq;
  
  constructor(private configService: ConfigService) {
    this.groq = new Groq({
      apiKey: this.configService.get<string>('groq.apiKey'),
    });
  }

  async classifyEmail(subject: string, bodyText: string): Promise<ClassificationResultDto> {
    try {
      this.logger.log(`Classifying email via Groq: ${subject}`);
      
      const prompt = `
      You are an expert IT support dispatcher. Analyze the following support email and return a strictly formatted JSON object. 
      Do NOT include any markdown formatting, backticks, or other text. Return ONLY raw JSON.
      
      Format required:
      {
        "intent": string, // MUST be EXACTLY "MIS" or "LMS" based on the email content. "MIS" for management/billing/general IT, "LMS" for learning/courses/platform access.
        "confidenceScore": number, // Between 0 and 1
        "extractedEntities": object, // Any useful key-value pairs found (e.g. invoiceId, device, os)
        "tags": string[] // 1-3 useful routing tags (e.g. "urgent", "billing", "mobile")
      }
      
      Email Subject: "${subject}"
      Email Body: "${bodyText.substring(0, 2000)}" // Truncated to avoid token limits
      `;

      const chatCompletion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant',
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const jsonStr = chatCompletion.choices[0]?.message?.content || '{}';
      const result = JSON.parse(jsonStr) as ClassificationResultDto;
      
      this.logger.log(`Groq Classification successful. Intent: ${result.intent}`);
      return result;

    } catch (error) {
      this.logger.error('Groq AI Classification failed. Falling back to default routing.', error);
      
      // Fallback Strategy: Always return a safe default instead of failing the pipeline
      return {
        intent: 'MIS',
        confidenceScore: 0,
        extractedEntities: {},
        tags: ['unclassified']
      };
    }
  }
}
