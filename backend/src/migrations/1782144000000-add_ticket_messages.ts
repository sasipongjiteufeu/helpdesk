import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketMessages1782144000000 implements MigrationInterface {
  name = 'AddTicketMessages1782144000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`Ticket_Message\` (
        \`Message_ID\` varchar(36) NOT NULL,
        \`Ticket_ID\` int unsigned NOT NULL,
        \`Sender_ID\` varchar(36) NOT NULL,
        \`Message\` text NULL,
        \`Created_at\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`Updated_at\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`Message_ID\`),
        INDEX \`IDX_Ticket_Message_Ticket_ID\` (\`Ticket_ID\`),
        INDEX \`IDX_Ticket_Message_Sender_ID\` (\`Sender_ID\`),
        CONSTRAINT \`FK_Ticket_Message_Ticket\`
          FOREIGN KEY (\`Ticket_ID\`) REFERENCES \`Ticket\`(\`Ticket_ID\`)
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`FK_Ticket_Message_Sender\`
          FOREIGN KEY (\`Sender_ID\`) REFERENCES \`users\`(\`id\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`Ticket_Message_Attachment\` (
        \`Attachment_ID\` varchar(36) NOT NULL,
        \`Message_ID\` varchar(36) NOT NULL,
        \`Original_Name\` varchar(255) NOT NULL,
        \`Filename\` varchar(255) NOT NULL,
        \`MimeType\` varchar(100) NOT NULL,
        \`Size\` int NOT NULL,
        \`Path\` varchar(512) NOT NULL,
        \`Created_at\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`Attachment_ID\`),
        INDEX \`IDX_Ticket_Message_Attachment_Message_ID\` (\`Message_ID\`),
        CONSTRAINT \`FK_Ticket_Message_Attachment_Message\`
          FOREIGN KEY (\`Message_ID\`) REFERENCES \`Ticket_Message\`(\`Message_ID\`)
          ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `Ticket_Message_Attachment`');
    await queryRunner.query('DROP TABLE `Ticket_Message`');
  }
}
