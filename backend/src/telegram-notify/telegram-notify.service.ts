// src/notification/telegram-notify.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { Ticket } from 'src/ticket/entities/ticket.entity';

@Injectable()
export class TelegramNotifyService {
  private readonly logger = new Logger(TelegramNotifyService.name);

  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly chatId = process.env.TELEGRAM_CHAT_ID;
  private readonly apiBase =
    this.botToken ? `https://api.telegram.org/bot${this.botToken}` : '';

  async notifyNewTicket(ticket: Ticket) {
    if (!this.botToken || !this.chatId) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set, skipping Telegram notification',
      );
      return;
    }

    const ticketId = String(ticket.id).padStart(7, '0');
    const title = ticket.title ?? '(no title)';
    const requester = ticket.createdBy?.email ?? 'unknown';
    const detail = ticket.detail

    // ✅ SIMPLE PLAIN TEXT (no Markdown, no HTML)
    const text =
      `🎫 New Helpdesk Ticket\n` +
      `ID: ${ticketId}\n` +
      `หัวข้อ: ${title}\n` +
      `รายละเอียด${detail}\n `+
      `ผู้ร้องขอ: ${requester}\n` +
      `สถานะเริ่มต้น: ${ticket.status}\n`;

    try {
      await axios.post(`${this.apiBase}/sendMessage`, {
        chat_id: this.chatId, // keep as string from env – Telegram accepts this
        text,
        // ❌ remove parse_mode for now to avoid 400 from MarkdownV2
        // parse_mode: 'MarkdownV2',
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const e = err as AxiosError<any>;
        this.logger.error(
          `Failed to send Telegram new-ticket notification for #${ticketId}`,
        );
        this.logger.error(
          `Telegram response: ${JSON.stringify(e.response?.data)}`,
        );
      } else {
        this.logger.error(
          `Failed to send Telegram new-ticket notification for #${ticketId}: ${String(
            err,
          )}`,
        );
      }
    }
  }
}
