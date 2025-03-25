
import { SpeechRecognitionAPI } from "../../_interfaces/speech";

export default class SpeechRecognitionImpl implements SpeechRecognitionAPI {

  public generateTextFromSpeech(lang: string, audioBase64: string): Promise<any> {
    throw new Error("Method not implemented."+lang+audioBase64);
  }
  
  // @ts-ignore
  private speechRecognition: webkitSpeechRecognition;
  private isInitialized = false
  public isRecognitionStarted = false

  private SpeechRecognitionOnResultHandler = (event: any, resolve: (result: any) => void) => {
      resolve(event.results[0][0]);
  } 

  public SpeechRecognitionImpl() {
  }

  private initialize() {
    try {
    // @ts-ignore
    this.speechRecognition = new webkitSpeechRecognition()
    } catch(err: any) {
      throw new Error("This browser doesn't support it. Try on Chrome. "+err);
    }

    this.speechRecognition.lang = 'en-US';
    this.speechRecognition.interimResults = false;
    this.speechRecognition.maxAlternatives = 1;

    this.isInitialized = true
  }

  public stopSpeechRecognition(): void {
    this.speechRecognition.abort();
  }

  public async startSpeechRecognition(lang: string, OnSpeechEndHandler: Function): Promise<any> {
    console.log("this.startSpeechRecognition")

    if (!this.isInitialized) {
      this.initialize();
    }
    if(lang.length == 2) {
      lang = lang+"-IN"
    }
    if(this.speechRecognition.lang !== lang) {
      this.speechRecognition.lang = lang;
    }
    console.log(this.speechRecognition.lang,"speech recognition mdn")
    
    return new Promise<string>((resolve, _reject) => {
      console.log("start speech recognition -> ",this.speechRecognition.isStarted)
      this.speechRecognition.onstart = () => {
        this.isRecognitionStarted = true
      };
      this.speechRecognition.onresult = (event: any) => {
        this.isRecognitionStarted = false
        this.SpeechRecognitionOnResultHandler(event, resolve);
      };
      this.speechRecognition.onerror = (event: any) => {
        this.isRecognitionStarted = false
        OnSpeechEndHandler(event);
      };
      this.speechRecognition.onspeechend = (event: any) => {
        this.isRecognitionStarted = false
        OnSpeechEndHandler(event);
      };
      this.speechRecognition.onend = (event: any) => {
        this.isRecognitionStarted = false
        OnSpeechEndHandler(event);
      };

      this.speechRecognition.start();

    });
  }
}