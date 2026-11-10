import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CheckDto {
  @ApiProperty({
    description: 'A link, QR payload or SMS body. Checked in memory and never stored.',
    example: 'PTT: Gonderiniz bekletiliyor ptt-teslimat-bilgi.xyz/tr',
  })
  @IsString()
  @Length(1, 4000)
  input!: string;
}
