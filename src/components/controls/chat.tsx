import { useEffect, useRef, useState } from "react"
import { generateText } from "ai"
import { useChat } from "ai/react"
import { chromeai } from "chrome-ai"
import { AnimatePresence, motion } from "framer-motion"
import { useAtom } from "jotai"
import { AudioLines } from "lucide-react"

import {
  avatarAtom,
  chatModeAtom,
  debugAtom,
  inputTextAtom,
  isSpeakingAtom,
  mediaStreamActiveAtom,
  providerModelAtom,
  sessionDataAtom,
} from "@/lib/atoms"

import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Switch } from "../ui/switch"
import { Textarea } from "../ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

const SpeechRecognition =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition)

export function Chat() {
  const [avatar] = useAtom(avatarAtom)
  const [inputText, setInputText] = useAtom(inputTextAtom)
  const [isSpeaking, setIsSpeaking] = useAtom(isSpeakingAtom)
  const [sessionData] = useAtom(sessionDataAtom)
  const [mediaStreamActive] = useAtom(mediaStreamActiveAtom)
  const [, setDebug] = useAtom(debugAtom)
  const [chatMode, setChatMode] = useAtom(chatModeAtom)
  const [providerModel, setProviderModel] = useAtom(providerModelAtom)
  const [isLoadingChat, setIsLoadingChat] = useState(false)

  
  const [avatarStoppedTalking, setAvatarStoppedTalking] = useState(false)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const [recording, setRecording] = useState(false) // Track recording state
  const speakingTimeout = useRef(null) // Timeout to track when speaking stops

  async function handleSpeak(mytext) {
    if (!avatar.current) {
      setDebug("Avatar API not initialized")
      return
    }
    console.log("Speak:", mytext)
    await avatar.current
      .speak({
        taskRequest: {
          text: mytext,
          sessionId: sessionData?.sessionId,
          taskType: "chat",
        },
      })
      .catch((e) => {
        setDebug(e.message)
      })

    const startTalkCallback = (e: any) => {
      console.log("Avatar started talking", e)
    }

    const stopTalkCallback = (e: any) => {
      //console.log("Avatar stopped talking", e)
      setAvatarStoppedTalking(true)
    }

    avatar.current.addEventHandler("avatar_start_talking", startTalkCallback)
    avatar.current.addEventHandler("avatar_stop_talking", stopTalkCallback)
  }

  const sentenceBuffer = useRef("")
  const processedSentences = useRef(new Set())

  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized")
      return
    }
    //stop()
    if(avatarStoppedTalking) return;
    await avatar.current
      .interrupt({ interruptRequest: { sessionId: sessionData?.sessionId } })
      .catch((e) => {
        setDebug(e.message)
      })
  }
  function stopRecording() {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop()
      setRecording(false)
    }
  }
  function restartRecording() {
    stopRecording()
    startRecording()
  }

  function startRecording() {
    setInputText("");
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        mediaRecorder.current = new MediaRecorder(stream);
        mediaRecorder.current.ondataavailable = (event) => {
          audioChunks.current.push(event.data);
        };
        mediaRecorder.current.onstop = () => {
          const audioBlob = new Blob(audioChunks.current, {
            type: "audio/wav",
          });
          audioChunks.current = [];
          // transcribeAudio(audioBlob); // Enable to transcribe audio
        };
        mediaRecorder.current.start();
        setRecording(true);
  
        // Setup audio context for speech detection
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
  
        const detectSpeech = () => {
          analyser.getByteFrequencyData(dataArray);
          
          let isCalledHandleInterrupt = false;
          let values = 0;
          for (let i = 0; i < bufferLength; i++) {
            values += dataArray[i];
          }
          const averageVolume = values / bufferLength;
  
          if (averageVolume > 30) { // Adjust the threshold value as needed
            console.log("Speaking detected!");
            setIsSpeaking(true);

            if(!isCalledHandleInterrupt && !avatarStoppedTalking) {
              handleInterrupt();
              isCalledHandleInterrupt = true;
            }
            
          } else {
            setIsSpeaking(false);
          }
  
          requestAnimationFrame(detectSpeech);
        };
  
        detectSpeech();
  
        if (SpeechRecognition) {
          setDebug("Starting SpeechRecognition");
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = false;
  
          recognition.start();
  
          recognition.onstart = () => {
            setDebug("1- Speech recognition started");
            console.log("started");
          };
  
          recognition.onresult = (event) => {
            setDebug(JSON.stringify(event.results));
            console.log("result", event.results);
  
            let text = "";
            for (let index = 0; index < event.results.length; index++) {
              const result = event.results[index];
              if (result.isFinal) {
                text += result[0].transcript;
              }
            }
            setInputText(text);
  
            // Reset the timeout whenever new results are detected
            if (speakingTimeout.current) {
              //handleInterrupt();
              clearTimeout(speakingTimeout.current);
            }
  
            // Indicate that the user is currently speaking
            setIsSpeaking(true);
  
            // Set a timeout to turn off "speaking" status after 2 seconds of silence
            speakingTimeout.current = setTimeout(() => {
              setDebug("3- Speech recognition stopped due to silence");
              setIsSpeaking(false);
              handleSpeak(text);
              recognition.stop();
            }, 2000); // Adjust this time (in milliseconds) to detect end of speaking
          };
  
          recognition.onend = () => {
            setDebug("2- Restarting Speech recognition");
            recognition.start(); // Restart the recognition
          };
  
          recognition.onerror = (event) => {
            setDebug("Speech recognition error: " + event.error);
            console.error("Speech recognition error:", event.error);
          };
        } else {
          setDebug("Speech recognition is not supported in this browser");
        }
      })
      .catch((error) => {
        console.error("Error accessing microphone:", error);
        setDebug("Error accessing microphone: " + error);
      });
  }
  

  useEffect(() => {
    //console.log("Media stream active:", mediaStreamActive)
    if (mediaStreamActive) {
      startRecording()
    }
  }, [mediaStreamActive])

  return (
    <form>
      {true && (
        <div className="flex items-center gap-4">
          <div className="min-w-[100px]">
            <p>{inputText}</p>
          </div>
          <div
            className={`wave-icons ${isSpeaking ? "animate" : ""} flex max-w-[50px]`}
          >
            <div className="flex">
              <AudioLines className="wave-icon size-4" />
              <AudioLines className="wave-icon size-4" />
              <AudioLines className="wave-icon size-4" />
              <AudioLines className="wave-icon size-4" />
              <AudioLines className="wave-icon size-4" />
              <AudioLines className="wave-icon size-4" />
              <AudioLines className="wave-icon size-4" />
              <AudioLines className="wave-icon size-4" />
            </div>
          </div>

          {/* <div className="flex w-full items-center">
          <div className="bg-default flex w-full flex-col gap-1.5 rounded-[26px] border bg-background p-1.5 transition-colors">
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="flex flex-col">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                    >
                      <Paperclip className="size-5" />
                      <Input multiple={false} type="file" className="hidden" />
                      <span className="sr-only">Attach file</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Attach File</TooltipContent>
                </Tooltip>
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <Textarea
                  id="prompt-textarea"
                  data-id="root"
                  name="prompt"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  dir="auto"
                  rows={1}
                  className="h-[40px] min-h-[40px] resize-none overflow-y-hidden rounded-none border-0 px-0 shadow-none focus:ring-0 focus-visible:ring-0"
                />
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => {
                      if (!recording) {
                        startRecording()
                      } else {
                        stopRecording()
                      }
                    }}
                  >
                    <Mic className="size-5" />
                    <span className="sr-only">Use Microphone</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Use Microphone</TooltipContent>
              </Tooltip>

              <Button
                // disabled={!isLoading}
                size="icon"
                type="button"
                className="rounded-full"
                onClick={handleInterrupt}
              >
                <PauseIcon className="size-5" />
              </Button>

              <Button
                // disabled={!isLoading}
                size="icon"
                type={"button"}
                className="rounded-full"
                onClick={() => {
                  // * Above if !chatMode is commented because I decided to use knowledgebase provided by heygen
                  // * in the chat mode, if need to use chatgpt then uncomment above if condition and
                  // * also remove taskType="chat" from handleSpeak()
                  // if (!chatMode) {
                  //   handleSpeak()
                  // }

                  //if (chatMode) {
                  handleSpeak()
                  //}
                }}
              >
                <ArrowUp className="size-5" />
              </Button>
            </div>
          </div>
        </div> */}
        </div>
      )}
    </form>
  )
}
