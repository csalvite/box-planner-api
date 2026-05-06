import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

type SendInvitationEmailParams = {
  to: string;
  inviteUrl: string;
};

@Injectable()
export class InvitationsEmailService {
  private readonly fromEmail: string;
  private readonly resend?: Resend;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail =
      this.configService.get<string>('INVITATIONS_FROM_EMAIL') ||
      'Box Planner <onboarding@resend.dev>';

    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async sendInvitationEmail(params: SendInvitationEmailParams) {
    if (!this.resend) {
      return false;
    }

    const response = await this.resend.emails.send({
      from: this.fromEmail,
      to: params.to,
      subject: 'Invitación a Box Planner',
      text: this.buildText(params.inviteUrl),
      html: this.buildHtml(params.inviteUrl),
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return true;
  }

  private buildText(inviteUrl: string) {
    return [
      'Hola,',
      '',
      'Has recibido una invitación para unirte a una organización en Box Planner.',
      '',
      'Puedes aceptar la invitación desde este enlace:',
      inviteUrl,
      '',
      'El enlace caduca en 7 días.',
      '',
      'Si no esperabas esta invitación, puedes ignorar este mensaje.',
      '',
      'Un saludo,',
      'Box Planner',
    ].join('\n');
  }

  private buildHtml(inviteUrl: string) {
    return `
      <p>Hola,</p>
      <p>Has recibido una invitación para unirte a una organización en Box Planner.</p>
      <p>Puedes aceptar la invitación desde este enlace:</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      <p>El enlace caduca en 7 días.</p>
      <p>Si no esperabas esta invitación, puedes ignorar este mensaje.</p>
      <p>Un saludo,<br />Box Planner</p>
    `;
  }
}
