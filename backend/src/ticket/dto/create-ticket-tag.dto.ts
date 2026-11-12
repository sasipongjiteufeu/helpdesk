import { IsString, MaxLength } from 'class-validator';
export class CreateTicketTagDto {
  @IsString() @MaxLength(50)
  name?: string;
}
