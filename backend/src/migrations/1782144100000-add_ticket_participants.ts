import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketParticipants1782144100000 implements MigrationInterface {
  name = 'AddTicketParticipants1782144100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`Ticket_Participant\` (
        \`Participant_ID\` varchar(36) NOT NULL,
        \`Ticket_ID\` int unsigned NOT NULL,
        \`Agent_ID\` varchar(36) NOT NULL,
        \`Joined_By\` varchar(36) NULL,
        \`Joined_At\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`Is_Active\` tinyint NOT NULL DEFAULT 1,
        \`Created_at\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`Updated_at\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`Participant_ID\`),
        INDEX \`IDX_Ticket_Participant_Ticket_Agent_Active\` (\`Ticket_ID\`, \`Agent_ID\`, \`Is_Active\`),
        INDEX \`IDX_Ticket_Participant_Agent\` (\`Agent_ID\`),
        CONSTRAINT \`FK_Ticket_Participant_Ticket\`
          FOREIGN KEY (\`Ticket_ID\`) REFERENCES \`Ticket\`(\`Ticket_ID\`)
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`FK_Ticket_Participant_Agent\`
          FOREIGN KEY (\`Agent_ID\`) REFERENCES \`users\`(\`id\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT \`FK_Ticket_Participant_Joined_By\`
          FOREIGN KEY (\`Joined_By\`) REFERENCES \`users\`(\`id\`)
          ON DELETE SET NULL ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `Ticket_Participant`');
  }
}
