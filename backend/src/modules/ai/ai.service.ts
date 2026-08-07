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

  async classifyEmail(
    subject: string,
    bodyText: string,
  ): Promise<ClassificationResultDto> {
    const useGroq = this.configService.get<boolean>('groq.useGroq');

    if (!useGroq) {
      this.logger.log(
        `Groq API disabled. Using CPU for text classification: ${subject}`,
      );
      return this.classifyEmailCpu(subject, bodyText);
    }

    try {
      this.logger.log(`Classifying email via Groq: ${subject}`);

      const prompt = `
      You are an expert IT support dispatcher. Analyze the following support email and return a strictly formatted JSON object. 
      Do NOT include any markdown formatting, backticks, or other text. Return ONLY raw JSON.
      
      Format required:
      {
        "intent": string, // MUST be EXACTLY "SALARY", "MIS_DETAILS_CHANGE", "LEAVE", "ATTENDANCE", or "UNASSIGNED".
                          // Use "SALARY" for pay, payroll, increment, compensation issues.
                          // Use "MIS_DETAILS_CHANGE" for profile updates, phone/address changes.
                          // Use "LEAVE" for applying time off, vacations, sick leave, PTO.
                          // Use "ATTENDANCE" for punch in/out issues, incorrect absent marks, regularization. Example: "My attendance is showing as absent even though I was present" MUST be ATTENDANCE, not LEAVE.
                          // Use "UNASSIGNED" if completely unclear.
        "confidenceScore": number, // Between 0 and 1
        "extractedEntities": object, // Any useful key-value pairs found (e.g. date, employeeId)
        "tags": string[] // 1-3 useful routing tags (e.g. "urgent", "correction")
      }
      
      Examples:
      - "I want to apply for 2 days sick leave" -> intent: "LEAVE"
      - "I was marked absent today but I was working" -> intent: "ATTENDANCE"
      - "Please update my phone number in the portal" -> intent: "MIS_DETAILS_CHANGE"
      - "My salary is less this month" -> intent: "SALARY"
      
      Email Subject: "${subject}"
      Email Body: "${bodyText.substring(0, 2000)}" // Truncated to avoid token limits
      `;

      const chatCompletion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant',
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const jsonStr = chatCompletion.choices[0]?.message?.content || '{}';
      const result = JSON.parse(jsonStr) as ClassificationResultDto;

      this.logger.log(
        `Groq Classification successful. Intent: ${result.intent}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        'Groq AI Classification failed. Falling back to CPU classification.',
        error,
      );
      return this.classifyEmailCpu(subject, bodyText);
    }
  }

  private classifyEmailCpu(
    subject: string,
    bodyText: string,
  ): ClassificationResultDto {
    const text = `${subject} ${bodyText}`.toLowerCase();

    // Define keywords for new intents
    const salaryKeywords = ['salary', 'pay', 'compensation', 'remuneration', 'wages', 'payroll', 'hike', 'increment'];
    const misDetailsKeywords = ['mis', 'details', 'change', 'update', 'profile', 'information', 'address', 'phone'];
    const leaveKeywords = ['leave', 'holiday', 'vacation', 'sick', 'time off', 'absence', 'pto', 'casual leave'];
    const attendanceKeywords = ['attendance', 'present', 'absent', 'check in', 'check out', 'punch', 'clock', 'regularization'];

    let salaryScore = 0;
    let misDetailsScore = 0;
    let leaveScore = 0;
    let attendanceScore = 0;

    salaryKeywords.forEach((word) => {
      if (text.includes(word)) salaryScore++;
    });
    misDetailsKeywords.forEach((word) => {
      if (text.includes(word)) misDetailsScore++;
    });
    leaveKeywords.forEach((word) => {
      if (text.includes(word)) leaveScore++;
    });
    attendanceKeywords.forEach((word) => {
      if (text.includes(word)) attendanceScore++;
    });

    let intent = 'UNASSIGNED'; // Default fallback if no strong keywords
    const scores = {
      SALARY: salaryScore,
      MIS_DETAILS_CHANGE: misDetailsScore,
      LEAVE: leaveScore,
      ATTENDANCE: attendanceScore,
    };
    
    let maxScore = 0;
    for (const [key, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        intent = key;
      }
    }

    const tags: string[] = [];
    if (text.includes('urgent') || text.includes('asap')) tags.push('urgent');
    if (text.includes('billing') || text.includes('invoice'))
      tags.push('billing');
    if (text.includes('password') || text.includes('login'))
      tags.push('account');

    return {
      intent,
      confidenceScore: 0.8, // Static confidence for rules engine
      extractedEntities: {},
      tags: tags.slice(0, 3),
    };
  }
}
