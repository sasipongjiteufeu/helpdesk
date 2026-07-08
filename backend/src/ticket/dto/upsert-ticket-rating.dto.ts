import { IsInt, IsOptional, IsString, MaxLength, Max, Min } from 'class-validator';

export class UpsertTicketRatingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
