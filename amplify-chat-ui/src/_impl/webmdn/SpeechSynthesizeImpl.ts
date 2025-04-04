import { SpeechSynthesizeAPI } from "../../_interfaces/speech";

export class SpeechSynthesizeImpl implements SpeechSynthesizeAPI {
    static synth = window.speechSynthesis;

    lang!: string | "en-US";
    private voiceName!: string | "Daniel";

    voiceType!: string | "male";

    public async speechSynthesizeTTS(content: string, lang: string, voiceType: string): Promise<any> {
        if (SpeechSynthesizeImpl.synth.speaking) {
            console.error("speechSynthesis.speaking");
            return;
        }

        this.voiceType = voiceType.toLowerCase()
        this.voiceName = (this.voiceType === "male")? "Daniel": "Daniel" ; 

        const utterThis = new SpeechSynthesisUtterance(content);

        utterThis.onend = function () {
            console.log("SpeechSynthesisUtterance.onend")
        };

        utterThis.onerror = function () {
            console.error("SpeechSynthesisUtterance.onerror")
        };
        
        const pickedVoice = SpeechSynthesizeImpl.synth.getVoices().filter(voice => voice.name.startsWith(this.voiceName))[0];
        
        utterThis.lang = lang === "en-US"? lang : "en_US" ;
        utterThis.voice = pickedVoice;
        utterThis.pitch = 1
        utterThis.rate = 1
        console.log("utter", utterThis)

        SpeechSynthesizeImpl.synth.speak(utterThis);
    }
}
