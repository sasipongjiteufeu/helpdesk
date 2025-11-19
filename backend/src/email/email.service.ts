// src/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Ticket } from 'src/ticket/entities/ticket.entity';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = port === 465; // 👈 Gmail 465 = SSL, 587 = STARTTLS

    this.logger.log(
      `Init SMTP: host=${host} port=${port} secure=${secure} user=${user}`,
    );

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true for 465, false for 587
      auth: {
        user,
        pass,
      },
    });

    // Optional: check connection on startup
    this.transporter
      .verify()
      .then(() => this.logger.log('SMTP connection successful'))
      .catch(err =>
        this.logger.error('SMTP connection failed in verify()', err.stack),
      );
  }

  async notifyAgentsNewTicket(agentEmails: string[], ticket: Ticket) {
    const toList = agentEmails.filter(Boolean);
    if (!toList.length) {
      this.logger.warn('No AGENT emails found, skipping notification');
      return;
    }

    const paddedId = String(ticket.id).padStart(7, '0');

    const subject = `มีคำร้องใหม่ #${paddedId} : ${ticket.title}`;
    const text = [
      `มีคำร้องใหม่เข้าระบบ HelpDesk`,
      ``,
      `Ticket ID: #${paddedId}`,
      `หัวข้อ: ${ticket.title}`,
      `ผู้ร้องขอ: ${ticket.createdBy?.email ?? '-'}`,
      `รายละเอียด: ${ticket.detail}`,
      `กรุณาเข้าระบบเพื่อดำเนินการ`,
    ].join('\n');

    try {
      await this.transporter.sendMail({
        from: `"SRU Helpdesk" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: toList.join(','),
        subject,
        text,
      });

      this.logger.log(
        `Sent new-ticket notification for #${paddedId} to ${toList.join(', ')}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to send new-ticket email for #${paddedId}`,
        (err as Error).stack,
      );
    }
  }
}
