import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';

// Interfaces para tipagem
export interface AnaliseBoletoResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface ResultadoAnalise {
  id: string;
  status: string;
  uploadedAt: string;
  fileType: string;
  fileSize: number;
  fileName: string;
  dadosExtraidos?: DadosExtraidos;
  fraudeAnalise?: FraudeAnalise;
  predicaoML?: PredicaoML;
  validacaoTecnica?: ValidacaoTecnica;
  processedAt?: string;
  processingTime?: number;
}

export interface DadosExtraidos {
  codigo_barras: string | null;
  linha_digitavel: string;
  valor: number;
  vencimento: string;
  beneficiario_nome: string | null;
  beneficiario_cnpj: string;
  codigo_banco: string;
  banco_nome: string;
  agencia: string | null;
}

export interface FraudeAnalise {
  isFraudulento: boolean;
  score: number;
  confianca: number;
  metodos: string[];
  motivos: string[];
  explicacao?: ExplicacaoCompleta;
}

export interface ExplicacaoCompleta {
  simples: ExplicacaoSimples;
  avancado: ExplicacaoAvancada;
  razoes: Razao[];
  recomendacao: Recomendacao;
  gerado_em: string;
}

export interface ExplicacaoSimples {
  status: string;
  confianca: string;
  resumo: string;
  principal_motivo: string;
  acao_recomendada: string;
  emoji: string;
}

export interface ExplicacaoAvancada {
  analise_tecnica: any;
  metricas: any;
  detalhes_tecnicos: any;
}

export interface Razao {
  gravidade: 'critica' | 'alta' | 'media' | 'baixa';
  categoria: string;
  categoria_nome: string;
  icone: string;
  cor: string;
  titulo: string;
  descricao_simples: string;
  descricao_avancada: string;
  impacto: number;
  fonte: string;
}

export interface Recomendacao {
  nivel_risco: string;
  emoji: string;
  cor: string;
  acao_principal: string;
  mensagem: string;
  proximos_passos: string[];
}

export interface PredicaoML {
  is_fraudulento: boolean;
  classe_predita: number;
  score_fraude: number;
  confianca: number;
  probabilidades: {
    falso: number;
    verdadeiro: number;
  };
  features_usadas: any;
}

export interface ValidacaoTecnica {
  valido: boolean;
  erros: string[];
  detalhes: any;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  // URL da API Python
  private baseUrl = 'https://detectabb-backend-3.onrender.com';  // Desenvolvimento
  // private baseUrl = 'https://sua-api.render.com';  // Produção

  constructor(private http: HttpClient) {}

  /**
   * NOVO: Análise assíncrona de boleto (com worker)
   * Retorna ID para polling
   */
  analisarBoleto(file: File): Observable<AnaliseBoletoResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<AnaliseBoletoResponse>(`${this.baseUrl}/api/analisar`, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * NOVO: Análise síncrona de boleto (direto, sem worker)
   * Retorna resultado completo imediatamente
   */
  testarOCR(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<any>(`${this.baseUrl}/api/test-ocr`, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * NOVO: Consultar resultado da análise por ID
   */
  consultarAnalise(analiseId: string): Observable<ResultadoAnalise> {
    return this.http
      .get<ResultadoAnalise>(`${this.baseUrl}/api/analise/${analiseId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * NOVO: Health check da API
   */
  healthCheck(): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/health`)
      .pipe(catchError(this.handleError));
  }

  /**
   * NOVO: Polling automático - aguarda resultado
   * Consulta a cada 2 segundos até completar (máx 30 tentativas = 1 minuto)
   */
  aguardarResultado(
    analiseId: string,
    maxTentativas: number = 30,
    intervalo: number = 2000
  ): Observable<ResultadoAnalise> {
    return new Observable((observer) => {
      let tentativas = 0;

      const verificar = () => {
        this.consultarAnalise(analiseId).subscribe({
          next: (resultado) => {
            tentativas++;

            if (resultado.status === 'completed') {
              observer.next(resultado);
              observer.complete();
            } else if (resultado.status === 'failed') {
              observer.error(new Error('Análise falhou no servidor'));
            } else if (tentativas >= maxTentativas) {
              observer.error(new Error('Tempo limite excedido'));
            } else {
              // Continuar polling
              setTimeout(verificar, intervalo);
            }
          },
          error: (err) => {
            observer.error(err);
          },
        });
      };

      verificar();
    });
  }

  /**
   * Tratamento de erros HTTP
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Erro desconhecido';

    if (error.error instanceof ErrorEvent) {
      // Erro do lado do cliente
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      // Erro do lado do servidor
      errorMessage =
        error.error?.detail || error.message || 'Erro no servidor';
    }

    console.error('Erro na API:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}