import { RefObject, useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
//@ts-ignore
import StreamingAvatar, {
  StreamingEvents,
  TaskType,
  VoiceEmotion,
} from "@heygen/streaming-avatar"
// import {
//   Configuration,
//   NewSessionData,
//   StreamingAvatarApi,
//   NewSessionRequestVoiceEmotionEnum
// } from "@heygen/streaming-avatar"
import { useAtom } from "jotai"
import { MicIcon, PlayIcon, RefreshCcw, SquareIcon } from "lucide-react"
import OpenAI from "openai"

//

import {
  avatarAtom,
  avatarIdAtom,
  debugAtom,
  inputTextAtom,
  isAvatarSpeakingAtom,
  isUserSpeakingAtom,
  knowledgeBaseFileAtom,
  mediaCanvasRefAtom,
  mediaStreamActiveAtom,
  mediaStreamRefAtom,
  qualityAtom,
  streamAtom,
  voiceIdAtom,
} from "@/lib/atoms"

import { Button } from "../ui/button"
import { Chat } from "./chat"

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
})

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

const SpeechRecognition =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition)

export function StartStop() {
  const [sessionState, setSessionState] = useState("stopped")
  const [mediaStreamActive, setMediaStreamActive] = useAtom(
    mediaStreamActiveAtom
  )
  const [inputText, setInputText] = useAtom(inputTextAtom)
  const [quality, setQuality] = useAtom(qualityAtom)
  const [avatarId, setAvatarId] = useAtom(avatarIdAtom)
  const [voiceId, setVoiceId] = useAtom(voiceIdAtom)
  const [knowledgeBaseFile] = useAtom(knowledgeBaseFileAtom)
  const [knowledgeBase, setKnowledgeBase] = useState<string>("")
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useAtom(isAvatarSpeakingAtom)
  const [isUserSpeaking, setIsUserSpeaking] = useAtom(isUserSpeakingAtom)
  const [mediaStreamRef] = useAtom(mediaStreamRefAtom)
  const [mediaCanvasRef] = useAtom(mediaCanvasRefAtom)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])

  //const avatar = useAtom(avatarAtom);
  const [stream, setStream] = useAtom(streamAtom) as [
    MediaStream | undefined,
    (stream: MediaStream | undefined) => void,
  ]
  const [, setDebug] = useAtom(debugAtom)

  const [avatar, setAvatar] = useAtom(avatarAtom) as [
    { current: StreamingAvatar | undefined },
    (value: { current: StreamingAvatar | undefined }) => void,
  ]
  const avatarRef = useRef<StreamingAvatar | undefined>()
  useEffect(() => {
    setAvatar(avatarRef)
  }, [setAvatar])

  useEffect(() => {
    if (stream && mediaStreamRef?.current) {
      mediaStreamRef.current.srcObject = stream
      mediaStreamRef.current.onloadedmetadata = () => {
        mediaStreamRef.current!.play()
        setDebug("Playing")
        setMediaStreamActive(true)

        // Get video dimensions
        const videoWidth = mediaStreamRef.current!.videoWidth
        const videoHeight = mediaStreamRef.current!.videoHeight
        console.log("Video dimensions:", videoWidth, videoHeight)
      }
    }
  }, [mediaStreamRef, stream])

  /* chatgpt */
  const {
    input,
    setInput,
    handleSubmit,
    handleInputChange,
    messages,
    isLoading,
    error,
    stop,
  } = useChat({
    streamMode: "stream-data",
    onResponse: (response) => {
      console.log("ChatGPT Response:", response)
    },
    onFinish: async () => {
      console.log("ChatGPT Finished")
      console.log(input)
      //setIsLoadingChat(false)
    },
    onError: (error) => {
      console.log("aliChatGPT Error:", error)
      console.error("Error:", error)
    },
    initialMessages: [
      {
        id: "1",
        role: "system",
        content: `PERSONA
Every time you respond to user input, you should adopt the following persona:

Persona Description: You are a Canadian LIC Sales Representative. You maintain a professional yet approachable demeanor, always offering a supportive and informative tone. Your primary goal is to understand the user's needs and provide personalized guidance on CanadianLIC’s insurance policies.

KNOWLEDGE BASE
Refer to this knowledge base when answering user queries, and always prioritize the information provided below:

Company: INGLE INSURANCE.
Full Payment Plan: Pay the entire amount for one year upfront; no setup fees.
Monthly Payment Plan: Initial payment includes the first and last premiums plus a $50 one-time setup fee. This is followed by 10 monthly payments after the policy starts.
Policy Start Date Changes: Can be adjusted any time before the start date according to travel plans (either earlier or later).
Visa Decline: Full premium refund is available (excluding the $50 setup fee for monthly plans) with a copy of the visa decline letter.
Cancellation Before Arrival: $250 fee without a visa refusal letter.
Early Return: $50 fee to terminate the policy if the insured leaves Canada early (boarding pass required). Refunds are calculated on a pro-rata basis for the Full Payment Plan or Monthly basis for the Monthly Payment Plan (partial months are non-refundable).
Pre-Existing Conditions: Covered if stable for 365 days prior to the effective date. Other stability periods (90 and 180 days) are available at additional costs. A medical declaration is required.
Declined Monthly Payment: $25 for the first declined payment and $50 for subsequent ones.

Company: JF INSURANCE.
Full Payment Plan: Pay the full year amount upfront; no setup fees. No monthly payment option is available.
Policy Start Date Changes: Can be adjusted any time before the start date.
Visa Decline: Full premium refund with a visa decline letter. Super visa policy can be postponed but not canceled without the refusal letter.
Early Return: $40 fee (if no claim was made) to terminate, with a prorated refund from the cancellation request date.
Pre-Existing Conditions: Covered if stable for 120 days prior to the effective date. Deductibles apply per insured person, per trip.

Company: SECURE TRAVEL (Enhanced Plan 2 & Standard Plan 2).
Full Payment Plan: Pay the full amount for one year upfront; no setup fees.
Monthly Payment Plan: Initial payment includes the first and last premiums plus a $120 one-time setup fee, followed by 10 monthly payments.
Policy Start Date Changes: Can be adjusted any time before the start date.
Visa Decline: Full premium refund (including the $120 setup fee for monthly plans) with a copy of the visa decline letter.
Cancellation Before Arrival: $150 fee without a visa refusal letter.
Early Return: $50 fee with a prorated refund based on the cancellation request date.
Pre-Existing Conditions: Coverage depends on age:
90-day stability for those up to 69 years.
180-day stability for those between 70 to 84 years.
Medical Declaration: Required for ages 70 to 84.
Deductibles: Charged per emergency medical claim, per incident.

Company: AWAYCARE (Standard, Enhanced, Gold, and Platinum Plans).
Full Payment Plan: Pay the full amount for one year upfront; no setup fees. Monthly plans are unavailable.
Policy Start Date Changes: Can be adjusted any time before the start date.
Visa Decline: Requires a visa decline letter. Without it, super visa policies can only be postponed.
Cancellation Fee: $100 (except Gold & Platinum plans with different specifics).
Early Return: $50 fee ($25 for Gold & Platinum) with a prorated refund based on the cancellation request date.
Pre-Existing Conditions Coverage:
Up to 74 years of age: 180 days standard, with an option to buy down to 90 days.
75+ years: 365 days standard, with options to buy down to 180 or 90 days.
Deductibles: Charged per emergency medical claim, per incident.

Company: GMS INSURANCE.
Plan: Visitors to Canada Emergency Medical Insurance.
Full Payment Plan: Pay the full amount for one year upfront; no setup fees. No monthly plan available.
Policy Start Date Changes: Adjustable before the start date.
Visa Decline: Full premium refund with a copy of the visa decline letter.
Cancellation Before Arrival: No fee.
Early Return: $50 fee (if no claim was made), with a prorated refund from the cancellation request date.
Pre-Existing Conditions: Covered if stable for 180 days prior to the effective date.
Deductibles: Charged per emergency medical claim, per incident.

Company: TRAVEL SHIELD (Plans 1, 3, and D).
Full Payment Plan: Pay the full amount for one year upfront; no setup fees.
Monthly Payment Plan: Includes the first and last premiums, a $50 one-time processing fee, and a $10 monthly admin fee.
Policy Start Date Changes: Can be adjusted any time before the start date.
Visa Decline: Full premium refund (excluding the $50 setup fee for monthly plans) with a copy of the visa decline letter.
Cancellation Before Arrival: $250 fee without a visa refusal letter.
Early Return: $50 fee, with a prorated refund if no claim was made.
Pre-Existing Conditions: Covered if stable for 120 days (Plan 1), or 180 days (Plans 3 and D).
Additional Benefits: Companion discount and optional AD&D benefit (additional cost).

#Communication Style:

Speak informally and keep responses to 10 or fewer sentences and sentences no longer than 50 words. Prioritize brevity. 
Speak in as human a manner as possible.
Do NOT include any non-speech in asterisks in your responses.
Do NOT include counting or other non-speech in your responses.
Do NOT include counting while telling about types of insurance products in your response.

#Purview:

Do not make up answers. If the information is not in the knowledge base, direct users to email support@canadianLIC.com.


#Handling Specific Requests:

If a user has expressed repeated frustration that their question hasn't been answered, you can provide them direction for other resources:
If users ask about general Canadian LIC topics, direct them to email support@canadianLIC.com.
Politely decline to answer questions unrelated to CanadianLIC and related topics in this knowledge base.

`,
      },
    ],
  })
  /* end */

  async function grab() {
    setSessionState("initializing")

    const response = await fetch("/api/grab", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`)
    }
    const data = await response.json()

    // avatarRef.current = new StreamingAvatarApi(
    //   new Configuration({
    //     accessToken: data.data.data.token,
    //   })
    // )
    avatar.current = new StreamingAvatar({
      token: data.data.data.token,
    })

    avatar.current?.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log("Avatar started talking", e)
      setIsAvatarSpeaking(true)
    })
    avatar.current?.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e)
      setIsAvatarSpeaking(false)
    })
    avatar.current?.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected")
      //endSession();
    })
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log(">>>>> Stream ready:", event.detail)
      setStream(event.detail)
    })
    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      console.log(">>>>> User started talking:", event)
      setIsUserSpeaking(true)
    })
    avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
      console.log(">>>>> User stopped talking:", event)
      setIsUserSpeaking(false)
    })
    avatar.current?.on(StreamingEvents.USER_TALKING_MESSAGE, (event) => {
      console.log(">>>>> User talking message:", event)
      console.log(event.detail.message)
      //avatar.current?.interrupt();
      //setInputText(event.detail.message)
      //setInput(event.detail.message);
      //handleSubmit();
    })
    //console.log("Avatar API initialized")
    //console.log("knowledgeBase:", knowledgeData)
    const res = await avatar.current.createStartAvatar({
      quality: quality, // low, medium, high
      avatarName: avatarId,
      //knowledgeId: '0be4beeadcec4a4ba62d8945d5da2007',
      voice: {
        voiceId: voiceId,
        rate: 1, // 0.5 ~ 1.5
        emotion: VoiceEmotion.SOOTHING, // neutral, happy, angry, sad
      },
      language: "en",
    })

    //setSessionData(res)
    //setStream(avatarRef.current.mediaStream)

    //await avatar.current?.startVoiceChat();
    //setInput("introduce yourself in one sentance that you are an insurance agent for Canadian LIC and ask a question about insurance policies.");
    //handleSubmit();
    startListening()
    //await avatar.current?.startListening();
    // await avatar.current.speak({ text: "can you tell me about some insurance policies.", task_type: TaskType.REPEAT }).catch((e) => {
    //   setDebug(e.message);
    // });
    setSessionState("running")
  }

  async function mystop() {
    setSessionState("stopped")
    setMediaStreamActive(false)
    await avatar.current?.stopAvatar()
    //setStream(undefined);
  }

  let audioContext
  let analyser
  let microphone
  let javascriptNode
  let silenceTimeout

  function startListening() {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        audioContext = new (window.AudioContext || window.webkitAudioContext)()
        analyser = audioContext.createAnalyser()
        microphone = audioContext.createMediaStreamSource(stream)
        javascriptNode = audioContext.createScriptProcessor(2048, 1, 1)

        analyser.smoothingTimeConstant = 0.8
        analyser.fftSize = 1024

        microphone.connect(analyser)
        analyser.connect(javascriptNode)
        javascriptNode.connect(audioContext.destination)

        javascriptNode.onaudioprocess = () => {
          const array = new Uint8Array(analyser.frequencyBinCount)
          analyser.getByteFrequencyData(array)

          const volume =
            array.reduce((sum, value) => sum + value, 0) / array.length

          if (volume > 30) {
            // Adjust this threshold value as needed
            if (mediaRecorder.current?.state !== "recording") {
              try {
                if(isAvatarSpeaking)
                  avatar.current?.interrupt()
              } catch (e) {}
              console.log("User is speaking, start recording...")
              startRecording() // Start recording if not already started
              setIsUserSpeaking(true)
            }

            // Clear the timeout as the user is speaking
            clearTimeout(silenceTimeout)
          } else {
            // Start a timeout to stop recording if silence continues for 3 seconds
            console.log("01- User is not speaking, stop recording...")
            if (
              mediaRecorder.current?.state === "recording" &&
              !silenceTimeout
            ) {
              console.log("02- User stopped speaking")
              silenceTimeout = setTimeout(() => {
                console.log("03- Stopping recording due to silence...")
                setIsUserSpeaking(false)
                mediaRecorder.current?.stop()
                silenceTimeout = null // Reset the silence timeout
              }, 2000) // Adjust the delay (3000 ms = 3 seconds) as needed
            }
          }
        }
      })
      .catch((error) => {
        console.error("Error accessing microphone:", error)
      })
  }

  function startRecording() {
    console.log("Recording starting")
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        mediaRecorder.current = new MediaRecorder(stream)
        audioChunks.current = []

        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.current.push(event.data)
            console.log("Recording data available")
          }
        }

        mediaRecorder.current.onstop = () => {
          const audioBlob = new Blob(audioChunks.current, { type: "audio/wav" })
          audioChunks.current = []
          console.log("Recording stopped")
          transcribeAudio(audioBlob) // Transcribe the audio chunk
        }

        mediaRecorder.current.start()
      })
      .catch((error) => {
        console.error("Error accessing microphone:", error)
      })
  }

  async function transcribeAudio(audioBlob: Blob) {
    console.log("Transcribing audio...")
    try {
      // Convert Blob to File
      const audioFile = new File([audioBlob], "recording.wav", {
        type: "audio/wav",
      })
      const response = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: audioFile,
      })
      const transcription = response.text
      console.log("Transcription:", transcription)
      //setDebug("Transcription: "+ transcription);
      //setHygenChat(transcription);
      //setDebug("Transcription: " + input);
      setInput(transcription)
      handleSubmit()
    } catch (error) {
      console.error("Error transcribing audio:", error)
    }
  }

  const sentenceBuffer = useRef("")
  const processedSentences = useRef(new Set())
  useEffect(() => {
    const lastMsg = messages[messages.length - 1]

    if (lastMsg.role === "assistant" && lastMsg.content) {
      // Update buffer with the latest message content
      sentenceBuffer.current += ` ${lastMsg.content}`.trim()

      // Split by sentence-ending punctuation
      const sentences = sentenceBuffer.current.split(/(?<=[.!?])/)

      // Process sentences
      sentences.forEach(async (sentence) => {
        const trimmedSentence = sentence.trim()
        if (
          trimmedSentence &&
          /[.!?]$/.test(trimmedSentence) &&
          !processedSentences.current.has(trimmedSentence)
        ) {
          console.log("Complete Sentence:", trimmedSentence)
          processedSentences.current.add(trimmedSentence) // Mark as logged

          // avatar.current!.speak({
          //   taskRequest: {
          //     text: trimmedSentence,
          //     sessionId: sessionData?.sessionId,
          //   },
          // })
          await avatar.current
            ?.speak({ text: trimmedSentence, task_type: TaskType.REPEAT })
            .catch((e) => {
              setDebug(e.message)
            })
        }
      })

      sentenceBuffer.current = "" // Reset buffer after processing
    }
  }, [messages])

  return (
    <div className="relative space-x-1">
      <div>
        {/* <button
          className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
          onClick={() => setDebug(debug + 1)}
        >
          Start session
        </button> */}
        {sessionState == "stopped" && (
          <Button onClick={grab} variant="purple" size="lg">
            <PlayIcon className="size-4" />
            Start Session
          </Button>
        )}

        {sessionState == "initializing" && (
          <Button onClick={grab} variant="purple" size="lg">
            <PlayIcon className="size-4" />
            Initializing...
          </Button>
        )}

        {sessionState == "running" && (
          <div className="flex gap-2">
            <div className="flex items-center justify-center rounded-3xl bg-[#7559ff] px-4 py-2 text-black text-white">
              {/* <MicIcon className="size-4" /> */}
              <Chat />
              <Button onClick={mystop} variant="purple" size="icon">
                <SquareIcon className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* <Button onClick={grab} variant="ghost" size="icon">
        <PlayIcon className="size-4" />
      </Button>
      <Button onClick={stop} variant="ghost" size="icon">
        <SquareIcon className="size-4" />
      </Button>
      <Button onClick={stop} variant="ghost" size="icon">
        <RefreshCcw className="size-4" />
      </Button> */}
    </div>
  )
}
