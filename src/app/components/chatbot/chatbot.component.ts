import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ChatMessage, ChatbotService } from '../../services/chatbot.service';
import { AuthService } from '../../services/auth.service';

interface ChatBubble extends ChatMessage {
  time: Date;
  pending?: boolean;
}

@Component({
  selector: 'app-chatbot',
  standalone: false,
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageList') private messageList?: ElementRef<HTMLElement>;
  @ViewChild('messageInput') private messageInput?: ElementRef<HTMLTextAreaElement>;

  mensajes: ChatBubble[] = [];
  texto = '';
  usuarioContextoId: number | null = null;
  enviando = false;
  error = '';
  private scrollPendiente = false;

  constructor(
    private readonly chatbotService: ChatbotService,
    public readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get puedeSeleccionarUsuarioContexto(): boolean {
    return this.authService.hasAuthority('ADMIN') || this.authService.hasAuthority('TECNICO');
  }

  ngOnInit(): void {
    this.mensajes = [{
      role: 'model',
      text: '¡Hola! Soy RafiBot. Puedo orientarte sobre faenas, bitácoras, capturas, seguridad marítima, clima, vedas y cuotas. ¿Qué necesitas revisar?',
      time: new Date()
    }];
    this.scrollPendiente = true;
  }

  ngAfterViewChecked(): void {
    if (this.scrollPendiente && this.messageList) {
      const element = this.messageList.nativeElement;
      element.scrollTop = element.scrollHeight;
      this.scrollPendiente = false;
    }
  }

  enviar(): void {
    const consulta = this.texto.trim();
    if (!consulta || this.enviando || consulta.length > 2000) return;

    this.error = '';
    this.texto = '';
    this.resetearAlturaInput();
    this.mensajes.push({ role: 'user', text: consulta, time: new Date() });
    this.enviando = true;
    this.scrollPendiente = true;

    // El primer mensaje de bienvenida es solo presentación; no se envía a Gemini.
    const historial: ChatMessage[] = this.mensajes
      .slice(1)
      .filter(m => !m.pending)
      .slice(-30)
      .map(({ role, text }) => ({ role, text }));

    const contextoId = this.puedeSeleccionarUsuarioContexto
      ? (this.usuarioContextoId ? Number(this.usuarioContextoId) : undefined)
      : (this.authService.getUserId() > 0 ? this.authService.getUserId() : undefined);
    this.chatbotService.conversar(historial, contextoId).subscribe({
      next: (response) => {
        this.mensajes.push({ role: 'model', text: response?.respuesta || 'No recibí una respuesta válida.', time: new Date() });
        this.enviando = false;
        this.scrollPendiente = true;
        this.cdr.detectChanges();
        this.enfocarEntrada();
      },
      error: (err) => {
        const message = typeof err?.error?.error === 'string'
          ? err.error.error
          : (err?.status === 0
            ? 'No se pudo conectar con el backend. Comprueba que el servidor esté ejecutándose.'
            : 'No se pudo obtener una respuesta. Vuelve a intentarlo.');
        this.error = message;
        this.mensajes.push({ role: 'model', text: message, time: new Date() });
        this.enviando = false;
        this.scrollPendiente = true;
        this.cdr.detectChanges();
        this.enfocarEntrada();
      }
    });
  }

  limpiarConversacion(): void {
    if (this.enviando) return;
    this.error = '';
    this.mensajes = [{
      role: 'model',
      text: 'Conversación reiniciada. ¿En qué tema de Rafishdar te ayudo?',
      time: new Date()
    }];
    this.scrollPendiente = true;
  }

  onEnter(event: Event): void {
    const keyboard = event as KeyboardEvent;
    if (!keyboard.shiftKey) {
      keyboard.preventDefault();
      this.enviar();
    }
  }


  ajustarAlturaInput(): void {
    const el = this.messageInput?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  private resetearAlturaInput(): void {
    const el = this.messageInput?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
  }

  private enfocarEntrada(): void {
    setTimeout(() => this.messageInput?.nativeElement.focus(), 0);
  }
}
