import { Component, ElementRef, ViewChild } from '@angular/core';
import { LoadingController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/services/api.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.page.html',
  styleUrls: ['./upload.page.scss'],
  standalone: false,
})
export class UploadPage {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;
  selectedFile!: File;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}

  /**
   * Mostrar loading
   */
  async presentLoading(
    message: string = 'Processando boleto...'
  ): Promise<HTMLIonLoadingElement> {
    const loading = await this.loadingController.create({
      message,
      spinner: 'circles',
      backdropDismiss: false,
    });
    await loading.present();
    return loading;
  }

  /**
   * Mostrar alerta de erro
   */
  async mostrarErro(mensagem: string) {
    const alert = await this.alertController.create({
      header: 'Erro',
      message: mensagem,
      buttons: ['OK'],
    });
    await alert.present();
  }

  /**
   * Capturar foto pela câmera
   */
  async usarCamera() {
    let loading: HTMLIonLoadingElement | undefined;
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      console.log('📷 Imagem capturada');

      if (!image.dataUrl) {
        throw new Error('Imagem inválida: dataUrl não disponível.');
      }

      const blob = this.dataURLToBlob(image.dataUrl);
      const file = new File([blob], 'foto-camera.png', { type: blob.type });

      // Enviar para análise
      await this.enviarArquivo(file);
    } catch (error) {
      loading?.dismiss();
      console.error('Erro ao capturar imagem:', error);
      this.mostrarErro('Erro ao capturar imagem');
    }
  }

  /**
   * Abrir galeria para selecionar arquivo
   */
  abrirGaleria() {
    this.fileInput.nativeElement.click();
  }

  /**
   * Arquivo selecionado da galeria
   */
  async arquivoSelecionado(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.selectedFile = file;

    // Validar tipo de arquivo
    const tiposPermitidos = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!tiposPermitidos.includes(file.type)) {
      this.mostrarErro('Tipo de arquivo inválido. Use JPG, PNG ou PDF.');
      return;
    }

    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.mostrarErro('Arquivo muito grande. Máximo: 10MB');
      return;
    }

    // Enviar para análise
    await this.enviarArquivo(file);
  }

  /**
   * Enviar arquivo para API Python
   * Usa endpoint síncrono (/api/test-ocr) para resultado imediato
   */
  async enviarArquivo(file: File) {
    const loading = await this.presentLoading('Analisando boleto...');

    try {
      // Usar endpoint síncrono para resultado imediato
      this.apiService.testarOCR(file).subscribe({
        next: (resultado) => {
          loading.dismiss();
          console.log('✅ Resultado recebido:', resultado);

          // Navegar para página de resultado
          this.router.navigate(['/result'], {
            state: { resultado: resultado },
          });
        },
        error: (err) => {
          loading.dismiss();
          console.error('❌ Erro:', err);
          this.mostrarErro(err.message || 'Erro ao processar o boleto');
        },
      });
    } catch (error: any) {
      loading.dismiss();
      console.error('❌ Erro inesperado:', error);
      this.mostrarErro('Erro inesperado ao enviar arquivo');
    }
  }

  /**
   * Converter DataURL para Blob
   */
  dataURLToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
      throw new Error('Tipo MIME inválido na dataURL.');
    }
    const mime = mimeMatch[1];

    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}