export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

export interface MailMessage extends MailContent {
  to: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
