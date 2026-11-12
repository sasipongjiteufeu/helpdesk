import * as nodemailer from 'nodemailer';

describe('upgraded mail transport compatibility', () => {
  it('creates a Thai notification without making a network connection', async () => {
    const transport = nodemailer.createTransport({ streamTransport: true, buffer: true });
    const result = await transport.sendMail({ from: 'helpdesk@example.invalid', to: 'agent@example.invalid', subject: 'มีคำร้องใหม่ #0000001', text: 'รายละเอียดคำร้องทดสอบ' });
    expect(result.messageId).toBeTruthy();
    expect(result.envelope.to).toEqual(['agent@example.invalid']);
    expect(result.message.length).toBeGreaterThan(0);
  });
});
