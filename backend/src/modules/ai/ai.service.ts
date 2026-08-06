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
    const useGroq = this.configService.get<boolean>('groq.useGroq');

    if (!useGroq) {
      this.logger.log(`Groq API disabled. Using CPU for text classification: ${subject}`);
      return this.classifyEmailCpu(subject, bodyText);
    }

    try {
      this.logger.log(`Classifying email via Groq: ${subject}`);
      
      const prompt = `
      You are an expert IT support dispatcher. Analyze the following support email and return a strictly formatted JSON object. 
      Do NOT include any markdown formatting, backticks, or other text. Return ONLY raw JSON.
      
      Format required:
      {
        "intent": string, // MUST be EXACTLY "MIS", "LMS", or "UNASSIGNED". "MIS" for management/billing/IT, "LMS" for learning/courses. "UNASSIGNED" if completely unclear.
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
      this.logger.error('Groq AI Classification failed. Falling back to CPU classification.', error);
      return this.classifyEmailCpu(subject, bodyText);
    }
  }

  private classifyEmailCpu(subject: string, bodyText: string): ClassificationResultDto {
    const text = `${subject} ${bodyText}`.toLowerCase();

    // Define keywords for LMS
    const lmsKeywords = ['course', 'student', 'enrollment', 'moodle', 'canvas', 'blackboard', 'assignment', 'grade', 'teacher', 'module', 'learning'];

    // Define keywords for MIS
    const misKeywords = ['billing', 'invoice', 'payment', 'hardware', 'software', 'network', 'printer', 'password', 'access', 'employee', 'login'];

    let lmsScore = 0;
    let misScore = 0;

    lmsKeywords.forEach(word => { if (text.includes(word)) lmsScore++; });
    misKeywords.forEach(word => { if (text.includes(word)) misScore++; });

    let intent = 'UNASSIGNED'; // Default fallback if no strong keywords
    if (lmsScore > misScore && lmsScore > 0) {
      intent = 'LMS';
    } else if (misScore > lmsScore && misScore > 0) {
      intent = 'MIS';
    }

    const tags: string[] = [];
    if (text.includes('urgent') || text.includes('asap')) tags.push('urgent');
    if (text.includes('billing') || text.includes('invoice')) tags.push('billing');
    if (text.includes('password') || text.includes('login')) tags.push('account');

    return {
      intent,
      confidenceScore: 0.8, // Static confidence for rules engine
      extractedEntities: {},
      tags: tags.slice(0, 3)
    };
  }
}
