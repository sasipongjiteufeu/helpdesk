import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketRatings1782144200000 implements MigrationInterface {
  name = 'AddTicketRatings1782144200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`ticket_ratings\` (
        \`Rating_ID\` int unsigned NOT NULL AUTO_INCREMENT,
        \`Ticket_ID\` int unsigned NOT NULL,
        \`User_ID\` varchar(36) NOT NULL,
        \`Rating\` tinyint unsigned NOT NULL,
        \`Comment\` text NULL,
        \`Created_at\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`Updated_at\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`Rating_ID\`),
        UNIQUE INDEX \`UQ_ticket_ratings_ticket_user\` (\`Ticket_ID\`, \`User_ID\`),
        INDEX \`IDX_ticket_ratings_ticket\` (\`Ticket_ID\`),
        INDEX \`IDX_ticket_ratings_user\` (\`User_ID\`),
        INDEX \`IDX_ticket_ratings_created_at\` (\`Created_at\`),
        CONSTRAINT \`FK_ticket_ratings_ticket\`
          FOREIGN KEY (\`Ticket_ID\`) REFERENCES \`Ticket\`(\`Ticket_ID\`)
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`FK_ticket_ratings_user\`
          FOREIGN KEY (\`User_ID\`) REFERENCES \`users\`(\`id\`)
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`CHK_ticket_ratings_rating_range\`
          CHECK (\`Rating\` BETWEEN 1 AND 5)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `ticket_ratings`');
  }
}
