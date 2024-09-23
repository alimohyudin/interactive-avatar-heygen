import { useEffect, useRef, useState } from "react"
import { generateText } from "ai"
import { useChat } from "ai/react"
import { chromeai } from "chrome-ai"
import { AnimatePresence, motion } from "framer-motion"
import { useAtom } from "jotai"
import {
  ArrowUp,
  BotMessageSquareIcon,
  Mic,
  Paperclip,
  PauseIcon,
  SpeechIcon,
} from "lucide-react"

import {
  avatarAtom,
  chatModeAtom,
  debugAtom,
  inputTextAtom,
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
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

export function Chat() {
  const [avatar] = useAtom(avatarAtom)
  const [inputText, setInputText] = useAtom(inputTextAtom)
  const [sessionData] = useAtom(sessionDataAtom)
  const [mediaStreamActive] = useAtom(mediaStreamActiveAtom)
  const [, setDebug] = useAtom(debugAtom)
  const [chatMode, setChatMode] = useAtom(chatModeAtom)
  const [providerModel, setProviderModel] = useAtom(providerModelAtom)
  const [isLoadingChat, setIsLoadingChat] = useState(false)

  const [avatarStoppedTalking, setAvatarStoppedTalking] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false); // Track recording state


  async function handleSpeak() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized")
      return
    }
    console.log("Speak:", inputText)
    await avatar.current
      .speak({
        taskRequest: { text: inputText, sessionId: sessionData?.sessionId, taskType: "chat" },
      })
      .catch((e) => {
        setDebug(e.message)
      })

    const startTalkCallback = (e: any) => {
      console.log("Avatar started talking", e);
    };

    const stopTalkCallback = (e: any) => {
      console.log("Avatar stopped talking", e);
      setAvatarStoppedTalking(true);
    };

    avatar.current.addEventHandler("avatar_start_talking", startTalkCallback);
    avatar.current.addEventHandler("avatar_stop_talking", stopTalkCallback);
  }

  const sentenceBuffer = useRef("")
  const processedSentences = useRef(new Set())

  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized")
      return
    }
    //stop()
    await avatar.current
      .interrupt({ interruptRequest: { sessionId: sessionData?.sessionId } })
      .catch((e) => {
        setDebug(e.message)
      })
  }
  function stopRecording() {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  }
  function restartRecording() {
    stopRecording();
    startRecording();
  }

  function startRecording() {
    setInputText("")
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
          //transcribeAudio(audioBlob);//enable to transcribe audio
        };
        mediaRecorder.current.start();
        setRecording(true);

        if (SpeechRecognition) {
          setDebug("Starting SpeechRecognition");
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = false;

          recognition.start();

          recognition.onstart = () => {
            setDebug("1- Speech recognition started");
          }

          recognition.onresult = (event: any) => {
            setDebug(JSON.stringify(event.results[0]));
            setInputText(event.results[0][0].transcript);

            // Restart the recognition after receiving a result
            recognition.stop(); // Stop current recognition session
          };

          recognition.onend = () => {
            setDebug("2- Restarting Speech recognition");
            recognition.start(); // Restart the recognition
          };

          recognition.onerror = (event: any) => {
            setDebug("Speech recognition error: " + event.error);
            console.error('Speech recognition error:', event.error);
            //stopRecording();
            //restartRecording();

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

  return (
    <form>

      {true && <div className="flex w-full items-center">
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
                      startRecording();
                    } else {
                      stopRecording();
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
                // if (!chatMode) {
                //   handleSpeak()
                // }

                /**
                 * Above if !chatMode is commented because I decided to use knowledgebase provided by heygen
                 * in the chat mode, if need to use chatgpt then uncomment above if condition and 
                 * also remove taskType="chat" from handleSpeak()
                 *
                 */
                //if (chatMode) {
                handleSpeak();
                //}
              }}
            >
              <ArrowUp className="size-5" />
            </Button>
          </div>
        </div>
      </div>}
    </form>
  )
}
