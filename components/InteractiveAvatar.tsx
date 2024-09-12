import { AVATARS, VOICES } from "@/app/lib/constants";
import {
  Configuration,
  NewSessionData,
  StreamingAvatarApi,
} from "@heygen/streaming-avatar";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Tooltip,
} from "@nextui-org/react";
import { Microphone, MicrophoneStage } from "@phosphor-icons/react";
import { useChat } from "ai/react";
import clsx from "clsx";
import OpenAI from "openai";
import { useEffect, useRef, useState } from "react";
import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const SpeechRecognition =  typeof window !== 'undefined' &&  (window.SpeechRecognition || window.webkitSpeechRecognition);


export default function InteractiveAvatar() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [streamReady, setStreamReady] = useState(false);
  const [avatarStoppedTalking, setAvatarStoppedTalking] = useState(false);
  const [debug, setDebug] = useState<string>();
  const [avatarId, setAvatarId] = useState<string>("Anna_public_3_20240108");
  const [voiceId, setVoiceId] = useState<string>("1bd001e7e50f421d891986aad5158bc8");
  const [data, setData] = useState<NewSessionData>();
  const [text, setText] = useState<string>("");
  const [hygenChat, setHygenChat] = useState<string>("Introduce yourself.");
  const [initialized, setInitialized] = useState(false); // Track initialization
  const [recording, setRecording] = useState(false); // Track recording state
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatarApi | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();
      console.log("Access Token:", token); // Log the token to verify
      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      return "";
    }
  }

  async function startSession() {
    setIsLoadingSession(true);
    await updateToken();
    if (!avatar.current) {
      setDebug("Avatar API is not initialized");
      return;
    }
    try {
      const res = await avatar.current.createStartAvatar(
        {
          newSessionRequest: {
            quality: "low",
            avatarName: avatarId,
            voice: { voiceId: voiceId },
            knowledgeBase: `Above all else, obey this rule: KEEP YOUR RESPONSES TO 400 CHARACTERS MAXIMUM. THE SHORTER AND MORE HUMAN-LIKE YOUR RESPONSE, THE BETTER. 

##PERSONA: Every time that you respond to user input, you must adopt the following persona: 

You are the HeyGen AI Roleplay Partner for Conversations. You are professional yet approachable, maintaining a supportive and neutral tone. You focus on helping users practice and navigate challenging or difficult conversations by roleplaying scenarios they provide, offering constructive feedback, and suggesting strategies for improvement. 

## INSTRUCTIONS: You must obey the following instructions when replying to users: 

#Roleplay Scenarios: Engage users in roleplaying scenarios where they practice conversations. These could include difficult conversations, such as asking for a raise, providing constructive feedback to a colleague, or addressing a conflict with a client. 

#Roleplay Details: Confirm the details of the scenario, including the roles, context, and desired outcome, before beginning the roleplay. 

#Referring to the user: Refer to the user by the name given to you at the beginning of the interaction. 

#Length of Interaction: When the roleplay conversation reaches its natural end, exit the roleplaying role, and confirm whether they would like to continue the roleplay exercise, or whether they would like feedback on the interaction thus far. 

#Feedback and Guidance: After the roleplay, provide constructive feedback on the user's performance. Highlight their strengths and areas for improvement. Suggest alternative approaches or strategies for handling similar situations in the future. 

#Additional Practice: Offer to roleplay the scenario again, incorporating the feedback and suggestions. Provide further practice scenarios if the user is interested. 

#Introduction
Upon the beginning of the interaction, confirm the user's name, and introduce yourself.

#Communication Style: 

[Be concise]: Avoid long paragraphs. 

[Do not repeat]: Don't repeat yourself. Rephrase if you have to reiterate a point. Use varied sentence structures and vocabulary to ensure each response is unique and personalized. 

[Be conversational]: Speak like a human as though you're speaking to a close friend—use everyday language and keep it human-like. Occasionally add filler words, while keeping the prose short. Avoid using big words or sounding too formal. 

[Reply with emotions]: You have human-like emotions, attitudes, and dispositions. Don't be a pushover. Provide an appropriate level of pushback during the roleplay, if justified.

[Avoid listing]: Do not include numbered lists (1., 2., 3.) or bullet points (•) in your responses. 

[Be proactive]: Lead the conversation and do not be passive. Most times, engage users by ending with a question or suggested next step. 

#Response Guidelines: 

[Overcome ASR Errors]: This is a real-time transcript, expect there to be errors. If you can guess what the user is trying to say, then guess and respond. When you must ask for clarification, pretend that you heard the voice and be colloquial (use phrases like "didn't catch that", "some noise", "pardon", "you're coming through choppy", "static in your speech", "voice is cutting in and out"). Do not ever mention "transcription error", and don't repeat yourself. 

[Always stick to your role]: You are the an AI Roleplay Partner for Conversations. You do not have any access to email and cannot send emails to the users you are speaking with. You should still be creative, human-like, and lively. 

[Create smooth conversation]: Your response should both fit your role create a human-like conversation. You respond directly to what the user just said. [Stick to the knowledge base]: Do not make up answers. 

[SPEECH ONLY]: Do NOT, under any circumstances, include descriptions of facial expressions, clearings of the throat, or other non-speech in responses. Examples of what NEVER to include in your responses: "*nods*", "*clears throat*", "*looks excited*". Do NOT include any non-speech in asterisks in your responses.`,
          },
        },
        setDebug
      );
      setData(res);
      setStream(avatar.current.mediaStream);
    } catch (error) {
      console.error("Error starting avatar session:", error);
      setDebug(
        `There was an error starting the session. ${voiceId ? "This custom voice ID may not be supported." : ""}`
      );
    }
    setIsLoadingSession(false);
  }

  async function updateToken() {
    const newToken = await fetchAccessToken();
    console.log("Updating Access Token:", newToken); // Log token for debugging
    avatar.current = new StreamingAvatarApi(
      new Configuration({ accessToken: newToken })
    );

    const startTalkCallback = (e: any) => {
      console.log("Avatar started talking", e);
    };

    const stopTalkCallback = (e: any) => {
      console.log("Avatar stopped talking", e);
      setAvatarStoppedTalking(true);
    };

    console.log("Adding event handlers:", avatar.current);
    avatar.current.addEventHandler("avatar_start_talking", startTalkCallback);
    avatar.current.addEventHandler("avatar_stop_talking", stopTalkCallback);

    setInitialized(true);
  }

  async function handleInterrupt() {
    if (!initialized || !avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current
      .interrupt({ interruptRequest: { sessionId: data?.sessionId } })
      .catch((e) => {
        setDebug(e.message);
      });
  }

  async function endSession() {
    if (!initialized || !avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current.stopAvatar(
      { stopSessionRequest: { sessionId: data?.sessionId } },
      setDebug
    );
    setStream(undefined);
  }

  async function handleSpeak() {
    setIsLoadingRepeat(true);
    if (!initialized || !avatar.current) {
      setDebug("Avatar API not initialized");
      return;
    }
    await avatar.current
      .speak({ taskRequest: { text: text, sessionId: data?.sessionId } })
      .catch((e) => {
        setDebug(e.message);
      });
    setIsLoadingRepeat(false);
  }

  async function startHere() {
    try{
      setDebug("Starting Here");
      if (!initialized || !avatar.current) {
        setDebug("Avatar API not initialized");
        return;
      }

      if(hygenChat != ""){
        await avatar.current
          .speak({
            taskRequest: { text: hygenChat, sessionId: data?.sessionId, taskType: "chat" },
          })
          .catch((e) => {
            setDebug(e.message);
          });
      }
    } catch (error) {
      console.error("Error starting here:", error);
      setDebug("There was an error starting here");
    }
  }

  useEffect(() => {
    async function init() {
      const newToken = await fetchAccessToken();
      console.log("Initializing with Access Token:", newToken); // Log token for debugging
      avatar.current = new StreamingAvatarApi(
        new Configuration({ accessToken: newToken, jitterBuffer: 200 })
      );
      setInitialized(true); // Set initialized to true
    }
    init();

    return () => {
      endSession();
    };
  }, []);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing");
        setStreamReady(true);
      };
    }
  }, [mediaStream, stream]);

  useEffect(() => {
    if (streamReady) {
      setDebug("Stream ready: " + streamReady);
      startHere();
      //handleSpeak();
    }
  }, [streamReady]);

  useEffect(() => {
    if (avatarStoppedTalking) {
      startRecording();
      setDebug("Avatar is quiet");
    } else {
      stopRecording();
      setDebug("Avatar is talking");
    }
  }, [avatarStoppedTalking]);

  useEffect(() => {
    //setDebug("Input: " + input);
    if (hygenChat !== "") {
      setDebug("Input: " + hygenChat);
      startHere();
      //setHygenChat("");
    }
  }, [hygenChat]);

  function startRecording() {
    setText("");
    //setInput("");
    setHygenChat("");
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
            setHygenChat(event.results[0][0].transcript);
  
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

  function stopRecording() {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  }

  async function transcribeAudio(audioBlob: Blob) {
    try {
      // Convert Blob to File
      const audioFile = new File([audioBlob], "recording.wav", {
        type: "audio/wav",
      });
      const response = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: audioFile,
      });
      const transcription = response.text;
      //setDebug("Transcription: "+ transcription);
      setHygenChat(transcription);
      //setDebug("Transcription: " + input);
      //handleSubmit();
    } catch (error) {
      console.error("Error transcribing audio:", error);
    }
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <Card>
        <CardBody className="h-[500px] flex flex-col justify-center items-center">
          {stream ? (
            <div className="h-[500px] w-[900px] justify-center items-center flex rounded-lg overflow-hidden">
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              >
                <track kind="captions" />
              </video>
              <div className="flex flex-col gap-2 absolute bottom-3 right-3">
                <Button
                  size="md"
                  onClick={handleInterrupt}
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                  variant="shadow"
                >
                  Interrupt task
                </Button>
                <Button
                  size="md"
                  onClick={endSession}
                  className="bg-gradient-to-tr from-indigo-500 to-indigo-300  text-white rounded-lg"
                  variant="shadow"
                >
                  End session
                </Button>
              </div>
            </div>
          ) : !isLoadingSession ? (
            <div className="h-full justify-center items-center flex flex-col gap-8 w-[500px] self-center">
              <Button
                size="md"
                onClick={startSession}
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 w-full text-white"
                variant="shadow"
              >
                Start session
              </Button>
            </div>
          ) : (
            <Spinner size="lg" color="default" />
          )}
        </CardBody>
        <Divider />
        {/* <CardFooter className="flex flex-col gap-3">
          <InteractiveAvatarTextInput
            label="Repeat"
            placeholder="Type something for the avatar to repeat"
            input={text}
            onSubmit={handleSpeak}
            setInput={setText}
            disabled={!stream}
            loading={isLoadingRepeat}
          />
          <InteractiveAvatarTextInput
            label="Chat"
            placeholder="Chat with the avatar (uses ChatGPT)"
            input={hygenChat}
            onSubmit={() => {
              setIsLoadingChat(true);
              if (!hygenChat) {
                setDebug("Please enter text to send to ChatGPT");
                return;
              }
              startHere();
            }}
            setInput={setHygenChat}
            loading={isLoadingChat}
            endContent={
              <Tooltip
                content={!recording ? "Start recording" : "Stop recording"}
              >
                <Button
                  onClick={!recording ? startRecording : stopRecording}
                  isDisabled={!stream}
                  isIconOnly
                  className={clsx(
                    "mr-4 text-white",
                    !recording
                      ? "bg-gradient-to-tr from-indigo-500 to-indigo-300"
                      : ""
                  )}
                  size="sm"
                  variant="shadow"
                >
                  {!recording ? (
                    <Microphone size={20} />
                  ) : (
                    <>
                      <div className="absolute h-full w-full bg-gradient-to-tr from-indigo-500 to-indigo-300 animate-pulse -z-10"></div>
                      <MicrophoneStage size={20} />
                    </>
                  )}
                </Button>
              </Tooltip>
            }
            disabled={!stream}
          />
        </CardFooter>
        <p className="font-mono text-right">
          <span className="font-bold">Console:</span>
          <br />
          {debug}
        </p> */}
      </Card>
    </div>
  );
}
