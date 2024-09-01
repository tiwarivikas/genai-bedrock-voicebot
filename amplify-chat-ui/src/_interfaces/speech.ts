

export interface SpeechSynthesizeAPI {
    lang: string;
    voiceType: string;
    speechSynthesizeTTS(content: string, lang: string, voiceType: string): Promise<any>;
  }

export interface SpeechRecognitionAPI {

    isRecognitionStarted: boolean | false


    startSpeechRecognition(lang: string, OnSpeechEndHandler: Function): Promise<any>;
    generateTextFromSpeech(lang: string, audioBase64: string): Promise<any>;
    stopSpeechRecognition(): void;

}