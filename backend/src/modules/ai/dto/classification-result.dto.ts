import { IsString, IsNumber, IsObject, Min, Max } from 'class-validator';

export class ClassificationResultDto {
  @IsString()
  intent: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceScore: number;

  @IsObject()
  extractedEntities: Record<string, string>;

  @IsString({ each: true })
  tags: string[];
}
