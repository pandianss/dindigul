import { IsDateString, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class GenerateSnapshotDto {
    @IsDateString()
    @IsNotEmpty()
    date: string;

    @IsString()
    @IsOptional()
    unitCode?: string;
}
