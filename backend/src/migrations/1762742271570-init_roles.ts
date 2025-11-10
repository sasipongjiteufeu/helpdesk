import { MigrationInterface, QueryRunner } from "typeorm";

export class InitRoles1762742271570 implements MigrationInterface {
    name = 'InitRoles1762742271570';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id CHAR(36) NOT NULL PRIMARY KEY,
        name ENUM('USER','AGENT','ADMIN') UNIQUE NOT NULL
      )
    `);
        await queryRunner.query(`
      INSERT INTO roles (id, name) VALUES (UUID(), 'USER')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
        await queryRunner.query(`
      INSERT INTO roles (id, name) VALUES (UUID(), 'AGENT')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
        await queryRunner.query(`
      INSERT INTO roles (id, name) VALUES (UUID(), 'ADMIN')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);

        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id CHAR(36) NOT NULL,
        role_id CHAR(36) NOT NULL,
        PRIMARY KEY (user_id, role_id),
        CONSTRAINT fk_userroles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_userroles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      )
    `);

        
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
