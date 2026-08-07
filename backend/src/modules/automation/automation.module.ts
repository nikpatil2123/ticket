import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AutomationService } from './automation.service';
import {
  AutomationRule,
  AutomationRuleSchema,
} from './schemas/automation-rule.schema';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AutomationRule.name, schema: AutomationRuleSchema },
    ]),
    TicketsModule, // Required to execute actions on tickets
  ],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
