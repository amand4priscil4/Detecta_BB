import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-result',
  templateUrl: './result.page.html',
  styleUrls: ['./result.page.scss'],
  standalone: false,
})
export class ResultPage implements OnInit {
  resultado: any;
  
  // Dados da explicação
  explicacaoSimples: any;
  explicacaoAvancada: any;
  razoes: any[] = [];
  recomendacao: any;
  
  // Dados extraídos
  dadosExtraidos: any;
  
  // Controles de UI
  modoAvancado = false;
  carregando = true;

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    this.resultado = nav?.extras.state?.['resultado'];
  }

  ngOnInit() {
    if (this.resultado) {
      this.processarResultado();
    } else {
      console.error('Nenhum resultado recebido!');
      this.irParaHome();
    }
  }

  /**
   * Processa resultado da API
   */
  processarResultado() {
    try {
      console.log('📊 Processando resultado:', this.resultado);

      // Se vier do endpoint /api/test-ocr
      if (this.resultado.success) {
        this.dadosExtraidos = this.resultado.dados_extraidos;
        
        // Criar explicação manual se não vier da API
        const fraudeAnalise = this.resultado.resultado_final;
        this.criarExplicacaoManual(fraudeAnalise);
        
      } 
      // Se vier do endpoint /api/analise/{id}
      else if (this.resultado.fraudeAnalise) {
        this.dadosExtraidos = this.resultado.dadosExtraidos;
        
        // Usar explicação da API se existir
        if (this.resultado.fraudeAnalise.explicacao) {
          this.explicacaoSimples = this.resultado.fraudeAnalise.explicacao.simples;
          this.explicacaoAvancada = this.resultado.fraudeAnalise.explicacao.avancado;
          this.razoes = this.resultado.fraudeAnalise.explicacao.razoes || [];
          this.recomendacao = this.resultado.fraudeAnalise.explicacao.recomendacao;
        } else {
          this.criarExplicacaoManual(this.resultado.fraudeAnalise);
        }
      }

      this.carregando = false;
      
    } catch (error) {
      console.error('Erro ao processar resultado:', error);
      this.carregando = false;
    }
  }

  /**
   * Cria explicação manual se API não retornar
   */
  criarExplicacaoManual(fraudeAnalise: any) {
    const isFraudulento = fraudeAnalise.isFraudulento || fraudeAnalise.is_fraudulento;
    
    this.explicacaoSimples = {
      status: isFraudulento ? 'FRAUDULENTO' : 'VÁLIDO',
      confianca: 'Média',
      resumo: isFraudulento 
        ? 'Este boleto foi identificado como falso' 
        : 'Este boleto aparenta ser autêntico',
      principal_motivo: fraudeAnalise.metodos?.[0] || 'Análise completa',
      acao_recomendada: isFraudulento 
        ? 'NÃO PAGUE este boleto' 
        : 'Você pode pagar, mas sempre confira os dados',
      emoji: isFraudulento ? '🚨' : '✅'
    };

    this.recomendacao = {
      nivel_risco: isFraudulento ? 'ALTO' : 'BAIXO',
      emoji: isFraudulento ? '⚠️' : '✅',
      cor: isFraudulento ? 'danger' : 'success',
      acao_principal: isFraudulento ? 'NÃO PAGAR' : 'PODE PAGAR',
      mensagem: isFraudulento 
        ? 'Este boleto apresenta características suspeitas.' 
        : 'Este boleto passou nas verificações de segurança.',
      proximos_passos: isFraudulento 
        ? ['Não efetue o pagamento', 'Entre em contato com o emissor', 'Reporte a fraude']
        : ['Confira os dados', 'Efetue o pagamento com segurança']
    };
  }

  /**
   * Alterna entre modo simples e avançado
   */
  toggleModoAvancado() {
    this.modoAvancado = !this.modoAvancado;
  }

  /**
   * Retorna cor baseada na gravidade
   */
  getCorGravidade(gravidade: string): string {
    const cores: any = {
      'critica': 'danger',
      'alta': 'warning',
      'media': 'medium',
      'baixa': 'primary'
    };
    return cores[gravidade] || 'medium';
  }

  /**
   * Formata valor em reais
   */
  formatarValor(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  /**
   * Volta para home
   */
  irParaHome() {
    this.router.navigate(['/home-page']);
  }

  /**
   * Fazer nova análise
   */
  novaAnalise() {
    this.router.navigate(['/upload']);
  }

  /**
   * Retorna ícone baseado na gravidade
   */
  getIconeGravidade(gravidade: string): string {
    const icones: any = {
      'critica': 'close-circle',
      'alta': 'warning',
      'media': 'information-circle',
      'baixa': 'help-circle'
    };
    return icones[gravidade] || 'information-circle';
  }
}